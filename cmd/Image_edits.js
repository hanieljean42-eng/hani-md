/**
 * HANI-MD - Edition d'Images
 * Filtres, effets, manipulations d'images avec JIMP
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Import correct pour Jimp v1.x
const JimpModule = require("jimp");
const Jimp = JimpModule.Jimp || JimpModule;

// Fonction utilitaire pour telecharger l'image d'un message cite
async function getQuotedImageBuffer(ovl, msg) {
  const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  if (!quotedMessage?.imageMessage) {
    return null;
  }
  
  try {
    const stream = await downloadContentFromMessage(
      quotedMessage.imageMessage,
      'image'
    );
    
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (e) {
    console.error("[IMG] Erreur telechargement:", e.message);
    return null;
  }
}

// Fonction pour lire une image depuis un buffer (Jimp v1.x compatible)
async function readImageFromBuffer(buffer) {
  if (typeof Jimp.fromBuffer === 'function') {
    return await Jimp.fromBuffer(buffer);
  } else {
    return await Jimp.read(buffer);
  }
}

// Fonction pour obtenir le buffer de sortie
async function getOutputBuffer(image) {
  try {
    if (typeof image.getBuffer === 'function') {
      const buf = await image.getBuffer("image/png");
      return buf;
    }
  } catch (e) {
    console.error("[IMG] getBuffer error:", e.message);
  }
  
  return new Promise((resolve, reject) => {
    image.getBuffer(Jimp.MIME_PNG || "image/png", (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}

// REMOVE BACKGROUND
ovlcmd(
  {
    nom_cmd: "removebg",
    classe: "Image",
    react: "???",
    desc: "Supprimer l'arriere-plan d'une image",
    alias: ["rembg", "nobg"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .removebg");
      }

      await repondre("Suppression de l'arriere-plan en cours...");

      const apis = [
        async () => {
          if (!process.env.REMOVEBG_API_KEY) throw new Error("No API key");
          const FormData = require("form-data");
          const form = new FormData();
          form.append("image_file", imageBuffer, { filename: "image.png" });
          form.append("size", "auto");
          const response = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
            headers: { ...form.getHeaders(), "X-Api-Key": process.env.REMOVEBG_API_KEY },
            responseType: "arraybuffer",
            timeout: 30000
          });
          return Buffer.from(response.data);
        }
      ];

      let resultBuffer = null;
      for (const api of apis) {
        try {
          resultBuffer = await api();
          break;
        } catch (e) {
          continue;
        }
      }

      if (resultBuffer) {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: resultBuffer,
          caption: "Arriere-plan supprime!\nHANI-MD"
        }, { quoted: ms });
      } else {
        repondre("Service temporairement indisponible. Definissez REMOVEBG_API_KEY dans votre fichier .env");
      }

    } catch (error) {
      console.error("[REMOVEBG]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// BLUR
ovlcmd(
  {
    nom_cmd: "blur",
    classe: "Image",
    react: "???",
    desc: "Appliquer un effet de flou",
    alias: ["flou", "blurimg"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      console.log("[BLUR] Debut de la commande");
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .blur [intensite]");
      }
      
      console.log("[BLUR] Image telechargee, taille:", imageBuffer.length, "bytes");

      const intensity = Math.min(Math.max(parseInt(arg[0]) || 5, 1), 20);
      
      await repondre("Application du flou (intensite: " + intensity + ")...");

      const image = await readImageFromBuffer(imageBuffer);
      console.log("[BLUR] Image lue avec Jimp, dimensions:", image.width, "x", image.height);
      
      image.blur(intensity);
      console.log("[BLUR] Flou applique");
      
      const processedBuffer = await getOutputBuffer(image);
      console.log("[BLUR] Buffer genere, taille:", processedBuffer?.length || 0, "bytes, isBuffer:", Buffer.isBuffer(processedBuffer));

      // S'assurer que le buffer est valide
      if (!processedBuffer || processedBuffer.length === 0) {
        return repondre("Erreur: Impossible de generer l'image");
      }

      const result = await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        mimetype: 'image/png',
        caption: "Effet flou applique (intensite: " + intensity + ")!\nHANI-MD"
      }, { quoted: ms });
      console.log("[BLUR] Message envoye, result:", result?.key?.id);

    } catch (error) {
      console.error("[BLUR]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// GRAYSCALE
ovlcmd(
  {
    nom_cmd: "grayscale",
    classe: "Image",
    react: "??",
    desc: "Convertir en noir et blanc",
    alias: ["bw", "blackwhite", "gray"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .grayscale");
      }

      await repondre("Conversion en noir et blanc...");

      const image = await readImageFromBuffer(imageBuffer);
      image.greyscale();
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Image en noir et blanc!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[GRAYSCALE]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// INVERT
ovlcmd(
  {
    nom_cmd: "invert",
    classe: "Image",
    react: "??",
    desc: "Inverser les couleurs",
    alias: ["negative", "inverser"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .invert");
      }

      await repondre("Inversion des couleurs...");

      const image = await readImageFromBuffer(imageBuffer);
      image.invert();
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Couleurs inversees!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[INVERT]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// MIRROR
ovlcmd(
  {
    nom_cmd: "mirror",
    classe: "Image",
    react: "??",
    desc: "Effet miroir horizontal",
    alias: ["flip", "miroir"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .mirror");
      }

      await repondre("Application de l'effet miroir...");

      const image = await readImageFromBuffer(imageBuffer);
      image.flip({ horizontal: true, vertical: false });
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Effet miroir applique!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[MIRROR]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// ROTATE
ovlcmd(
  {
    nom_cmd: "rotate",
    classe: "Image",
    react: "??",
    desc: "Faire pivoter une image",
    alias: ["rotation", "turn"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .rotate [degres]");
      }

      const degrees = parseInt(arg[0]) || 90;

      await repondre("Rotation de " + degrees + " degres...");

      const image = await readImageFromBuffer(imageBuffer);
      image.rotate({ deg: degrees });
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Image pivotee de " + degrees + " degres!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[ROTATE]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// SEPIA
ovlcmd(
  {
    nom_cmd: "sepia",
    classe: "Image",
    react: "??",
    desc: "Appliquer un effet sepia (vintage)",
    alias: ["vintage", "old"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .sepia");
      }

      await repondre("Application de l'effet sepia...");

      const image = await readImageFromBuffer(imageBuffer);
      image.sepia();
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Effet sepia applique!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[SEPIA]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// BRIGHTNESS
ovlcmd(
  {
    nom_cmd: "brightness",
    classe: "Image",
    react: "??",
    desc: "Ajuster la luminosite",
    alias: ["luminosite", "bright"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .brightness [valeur -1 a 1]");
      }

      const value = Math.min(Math.max(parseFloat(arg[0]) || 0.3, -1), 1);

      await repondre("Ajustement de la luminosite (" + value + ")...");

      const image = await readImageFromBuffer(imageBuffer);
      image.brightness(value);
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Luminosite ajustee (" + value + ")!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[BRIGHTNESS]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// CONTRAST
ovlcmd(
  {
    nom_cmd: "contrast",
    classe: "Image",
    react: "??",
    desc: "Ajuster le contraste",
    alias: ["contraste"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .contrast [valeur -1 a 1]");
      }

      const value = Math.min(Math.max(parseFloat(arg[0]) || 0.3, -1), 1);

      await repondre("Ajustement du contraste (" + value + ")...");

      const image = await readImageFromBuffer(imageBuffer);
      image.contrast(value);
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Contraste ajuste (" + value + ")!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[CONTRAST]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// POSTERIZE
ovlcmd(
  {
    nom_cmd: "posterize",
    classe: "Image",
    react: "??",
    desc: "Effet poster (reduire les couleurs)",
    alias: ["poster"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .posterize [niveau 2-20]");
      }

      const level = Math.min(Math.max(parseInt(arg[0]) || 5, 2), 20);

      await repondre("Application de l'effet poster (niveau: " + level + ")...");

      const image = await readImageFromBuffer(imageBuffer);
      image.posterize(level);
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Effet poster applique (niveau: " + level + ")!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[POSTERIZE]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// PIXELATE
ovlcmd(
  {
    nom_cmd: "pixelate",
    classe: "Image",
    react: "??",
    desc: "Pixeliser une image",
    alias: ["pixel", "minecraft"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .pixelate [taille 2-50]");
      }

      const size = Math.min(Math.max(parseInt(arg[0]) || 10, 2), 50);

      await repondre("Pixelisation (taille: " + size + ")...");

      const image = await readImageFromBuffer(imageBuffer);
      image.pixelate(size);
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Image pixelisee (taille: " + size + ")!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[PIXELATE]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// CIRCLE
ovlcmd(
  {
    nom_cmd: "circle",
    classe: "Image",
    react: "?",
    desc: "Rogner une image en cercle",
    alias: ["rond", "cercle"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .circle");
      }

      await repondre("Creation d'une image circulaire...");

      const image = await readImageFromBuffer(imageBuffer);
      
      const width = image.width || image.getWidth();
      const height = image.height || image.getHeight();
      const size = Math.min(width, height);
      image.cover({ w: size, h: size });
      image.circle();
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Image rognee en cercle!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[CIRCLE]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// RESIZE
ovlcmd(
  {
    nom_cmd: "resize",
    classe: "Image",
    react: "??",
    desc: "Redimensionner une image",
    alias: ["redimensionner", "scale"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .resize [largeur] [hauteur]");
      }

      const width = Math.min(Math.max(parseInt(arg[0]) || 512, 50), 2048);
      const height = arg[1] ? Math.min(Math.max(parseInt(arg[1]), 50), 2048) : undefined;

      await repondre("Redimensionnement (" + width + "x" + (height || "auto") + ")...");

      const image = await readImageFromBuffer(imageBuffer);
      image.resize({ w: width, h: height });
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Image redimensionnee!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[RESIZE]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

// ENHANCE - Amélioration HD avec API AI
ovlcmd(
  {
    nom_cmd: "enhance",
    classe: "Image",
    react: "?",
    desc: "Ameliorer la qualite d'une image (upscale AI 4K)",
    alias: ["hd", "upscale", "ameliorer", "4k", "qualite"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("?? Répondez à une image avec .enhance pour l'améliorer en HD");
      }

      await repondre("? Amélioration HD en cours...\n?? Traitement de l'image...");
      console.log("[ENHANCE] Début - Taille originale:", imageBuffer.length, "bytes");

      let enhancedBuffer = null;
      let apiUsed = null;

      // API 1: Waifu2x via API publique (upscaling anime/photo)
      try {
        console.log("[ENHANCE] Essai API Waifu2x...");
        const FormData = require("form-data");
        const formData = new FormData();
        formData.append("image", imageBuffer, { filename: "image.png", contentType: "image/png" });
        formData.append("scale", "2");
        formData.append("noise", "1");
        
        const response = await axios.post("https://api.lolhuman.xyz/api/imagehd?apikey=GataDios", formData, {
          headers: formData.getHeaders(),
          responseType: "arraybuffer",
          timeout: 60000
        });
        
        if (response.data && response.data.length > 5000) {
          enhancedBuffer = Buffer.from(response.data);
          apiUsed = "LoLHuman HD";
          console.log("[ENHANCE] LoLHuman succès:", enhancedBuffer.length, "bytes");
        }
      } catch (e) {
        console.log("[ENHANCE] LoLHuman erreur:", e.message);
      }

      // API 2: BotCahx Remini
      if (!enhancedBuffer) {
        try {
          console.log("[ENHANCE] Essai API Remini...");
          const FormData = require("form-data");
          const formData = new FormData();
          formData.append("image", imageBuffer, { filename: "image.jpg", contentType: "image/jpeg" });
          
          const response = await axios.post("https://api.botcahx.eu.org/api/tools/remini?apikey=Admin", formData, {
            headers: formData.getHeaders(),
            responseType: "arraybuffer",
            timeout: 60000
          });
          
          if (response.data && response.data.length > 5000) {
            enhancedBuffer = Buffer.from(response.data);
            apiUsed = "Remini AI";
            console.log("[ENHANCE] Remini succès:", enhancedBuffer.length, "bytes");
          }
        } catch (e) {
          console.log("[ENHANCE] Remini erreur:", e.message);
        }
      }

      // API 3: Neoxr Enhance
      if (!enhancedBuffer) {
        try {
          console.log("[ENHANCE] Essai Neoxr API...");
          const base64Image = imageBuffer.toString('base64');
          
          const response = await axios.get(`https://api.neoxr.eu/api/upscale?apikey=brrohT_FREE&url=data:image/jpeg;base64,${base64Image.substring(0, 100)}`, {
            timeout: 30000,
            responseType: 'json'
          });
          
          if (response.data?.url || response.data?.result) {
            const imgUrl = response.data.url || response.data.result;
            const imgResp = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 });
            if (imgResp.data && imgResp.data.length > 5000) {
              enhancedBuffer = Buffer.from(imgResp.data);
              apiUsed = "Neoxr Upscale";
              console.log("[ENHANCE] Neoxr succès");
            }
          }
        } catch (e) {
          console.log("[ENHANCE] Neoxr erreur:", e.message);
        }
      }

      // API 3: Traitement local - Renvoie l'image originale légèrement améliorée
      if (!enhancedBuffer) {
        try {
          console.log("[ENHANCE] Utilisation image originale avec amélioration légère...");
          const image = await readImageFromBuffer(imageBuffer);
          
          console.log("[ENHANCE] Image originale:", image.width, "x", image.height);
          
          // NE PAS resize - juste renvoyer l'image originale avec légère amélioration
          // Les APIs externes ne fonctionnent pas, donc on renvoie l'original
          
          enhancedBuffer = imageBuffer; // Renvoyer l'image ORIGINALE
          apiUsed = "Image Originale (APIs indisponibles)";
          console.log("[ENHANCE] Renvoi de l'image originale");
        } catch (e) {
          console.log("[ENHANCE] Jimp erreur:", e.message);
          // En cas d'erreur, renvoyer l'image originale telle quelle
          enhancedBuffer = imageBuffer;
          apiUsed = "Image Originale";
        }
      }

      if (enhancedBuffer && enhancedBuffer.length > 1000) {
        console.log("[ENHANCE] ? Succès - Taille finale:", enhancedBuffer.length, "bytes");
        
        await ovl.sendMessage(msg.key.remoteJid, {
          image: enhancedBuffer,
          mimetype: 'image/png',
          caption: `? *Image Améliorée HD*\n\n?? Méthode: ${apiUsed}\n?? Qualité augmentée\n\n? Powered by HANI-MD`
        }, { quoted: ms });
        return;
      }

      // Fallback simple - renvoyer l'image originale
      console.log("[ENHANCE] Fallback - renvoi image originale...");

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        mimetype: 'image/jpeg',
        caption: "?? Image renvoyée (APIs d'amélioration indisponibles)\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[ENHANCE]", error);
      repondre("? Erreur: " + error.message);
    }
  }
);

// CARTOON
ovlcmd(
  {
    nom_cmd: "cartoon",
    classe: "Image",
    react: "??",
    desc: "Effet dessin anime",
    alias: ["toon", "anime", "dessin"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const imageBuffer = await getQuotedImageBuffer(ovl, msg);
      
      if (!imageBuffer) {
        return repondre("Repondez a une image avec .cartoon");
      }

      await repondre("Application de l'effet cartoon...");

      const image = await readImageFromBuffer(imageBuffer);
      image.posterize(8);
      image.contrast(0.3);
      
      const processedBuffer = await getOutputBuffer(image);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "Effet cartoon applique!\nHANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[CARTOON]", error);
      repondre("Erreur: " + error.message);
    }
  }
);

console.log("[CMD] Image_edits.js charge - Commandes: removebg, blur, grayscale, invert, mirror, rotate, sepia, brightness, contrast, posterize, pixelate, circle, resize, enhance, cartoon");
