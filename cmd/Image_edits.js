/**
 * ═══════════════════════════════════════════════════════════
 * 🖼️ HANI-MD - Édition d'Images
 * ═══════════════════════════════════════════════════════════
 * Filtres, effets, manipulations d'images avec JIMP
 * Version avec effets réels fonctionnels
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const Jimp = require("jimp");

// ═══════════════════════════════════════════════════════════
// 🖼️ REMOVE BACKGROUND
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "removebg",
    classe: "Image",
    react: "🖼️",
    desc: "Supprimer l'arrière-plan d'une image",
    alias: ["rembg", "nobg"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .removebg");
      }

      await repondre("🖼️ Suppression de l'arrière-plan...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!imageBuffer) {
        return repondre("❌ Impossible de télécharger l'image");
      }

      // Essayer l'API remove.bg
      try {
        const FormData = require("form-data");
        const form = new FormData();
        form.append("image_file", imageBuffer, { filename: "image.png" });
        form.append("size", "auto");

        const response = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
          headers: {
            ...form.getHeaders(),
            "X-Api-Key": process.env.REMOVEBG_API_KEY || "free_api"
          },
          responseType: "arraybuffer",
          timeout: 30000
        });

        await ovl.sendMessage(msg.key.remoteJid, {
          image: Buffer.from(response.data),
          caption: "✅ Arrière-plan supprimé!\n🔥 HANI-MD"
        }, { quoted: ms });

      } catch (e) {
        // Fallback - renvoyer l'image originale avec message
        repondre("❌ Service temporairement indisponible. Définissez REMOVEBG_API_KEY pour utiliser cette fonctionnalité.");
      }

    } catch (error) {
      console.error("[REMOVEBG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ BLUR (Flou)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "blur",
    classe: "Image",
    react: "🖼️",
    desc: "Appliquer un effet de flou",
    alias: ["flou", "blurimg"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .blur [intensité]");
      }

      const intensity = Math.min(Math.max(parseInt(arg[0]) || 5, 1), 20);
      
      await repondre(`🖼️ Application du flou (intensité: ${intensity})...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.blur(intensity);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `🖼️ Effet flou appliqué (intensité: ${intensity})!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[BLUR]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ GRAYSCALE (Noir et Blanc)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "grayscale",
    classe: "Image",
    react: "🖤",
    desc: "Convertir en noir et blanc",
    alias: ["bw", "blackwhite", "gray"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .grayscale");
      }

      await repondre("🖤 Conversion en noir et blanc...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.grayscale();
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "🖤 Image en noir et blanc!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[GRAYSCALE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ INVERT (Inverser les couleurs)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "invert",
    classe: "Image",
    react: "🔄",
    desc: "Inverser les couleurs",
    alias: ["negative", "inverser"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .invert");
      }

      await repondre("🔄 Inversion des couleurs...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.invert();
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "🔄 Couleurs inversées!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[INVERT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ MIRROR (Effet miroir)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "mirror",
    classe: "Image",
    react: "🪞",
    desc: "Effet miroir horizontal",
    alias: ["flip", "miroir"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .mirror");
      }

      await repondre("🪞 Application de l'effet miroir...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.mirror(true, false); // Miroir horizontal
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "🪞 Effet miroir appliqué!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[MIRROR]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ ROTATE (Rotation)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "rotate",
    classe: "Image",
    react: "🔄",
    desc: "Faire pivoter une image",
    alias: ["rotation", "turn"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .rotate [degrés]");
      }

      const degrees = parseInt(arg[0]) || 90;

      await repondre(`🔄 Rotation de ${degrees}°...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.rotate(degrees);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `🔄 Image pivotée de ${degrees}°!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[ROTATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ SEPIA (Effet vintage)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "sepia",
    classe: "Image",
    react: "📜",
    desc: "Appliquer un effet sépia (vintage)",
    alias: ["vintage", "old"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .sepia");
      }

      await repondre("📜 Application de l'effet sépia...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.sepia();
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "📜 Effet sépia appliqué!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[SEPIA]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ BRIGHTNESS (Luminosité)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "brightness",
    classe: "Image",
    react: "☀️",
    desc: "Ajuster la luminosité",
    alias: ["luminosite", "bright"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .brightness [valeur -1 à 1]");
      }

      const value = Math.min(Math.max(parseFloat(arg[0]) || 0.3, -1), 1);

      await repondre(`☀️ Ajustement de la luminosité (${value > 0 ? '+' : ''}${value})...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.brightness(value);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `☀️ Luminosité ajustée (${value > 0 ? '+' : ''}${value})!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[BRIGHTNESS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ CONTRAST (Contraste)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "contrast",
    classe: "Image",
    react: "🎨",
    desc: "Ajuster le contraste",
    alias: ["contraste"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .contrast [valeur -1 à 1]");
      }

      const value = Math.min(Math.max(parseFloat(arg[0]) || 0.3, -1), 1);

      await repondre(`🎨 Ajustement du contraste (${value > 0 ? '+' : ''}${value})...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.contrast(value);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `🎨 Contraste ajusté (${value > 0 ? '+' : ''}${value})!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[CONTRAST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ POSTERIZE (Effet poster)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "posterize",
    classe: "Image",
    react: "🎭",
    desc: "Effet poster (réduire les couleurs)",
    alias: ["poster"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .posterize [niveau 2-20]");
      }

      const level = Math.min(Math.max(parseInt(arg[0]) || 5, 2), 20);

      await repondre(`🎭 Application de l'effet poster (niveau: ${level})...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.posterize(level);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `🎭 Effet poster appliqué (niveau: ${level})!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[POSTERIZE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ PIXELATE (Pixeliser)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pixelate",
    classe: "Image",
    react: "🟩",
    desc: "Pixeliser une image",
    alias: ["pixel", "minecraft"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .pixelate [taille 2-50]");
      }

      const size = Math.min(Math.max(parseInt(arg[0]) || 10, 2), 50);

      await repondre(`🟩 Pixelisation (taille: ${size})...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.pixelate(size);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `🟩 Image pixelisée (taille: ${size})!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[PIXELATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ CIRCLE (Rogner en cercle)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "circle",
    classe: "Image",
    react: "⭕",
    desc: "Rogner une image en cercle",
    alias: ["rond", "cercle"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .circle");
      }

      await repondre("⭕ Création d'une image circulaire...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      
      // Rendre carré
      const size = Math.min(image.getWidth(), image.getHeight());
      image.cover(size, size);
      
      // Appliquer un masque circulaire
      image.circle();
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "⭕ Image rognée en cercle!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[CIRCLE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ RESIZE (Redimensionner)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "resize",
    classe: "Image",
    react: "📐",
    desc: "Redimensionner une image",
    alias: ["redimensionner", "scale"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .resize [largeur] [hauteur]");
      }

      const width = Math.min(Math.max(parseInt(arg[0]) || 512, 50), 2048);
      const height = arg[1] ? Math.min(Math.max(parseInt(arg[1]), 50), 2048) : Jimp.AUTO;

      await repondre(`📐 Redimensionnement (${width}x${height === Jimp.AUTO ? 'auto' : height})...`);

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer l'effet avec Jimp
      const image = await Jimp.read(imageBuffer);
      image.resize(width, height);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: `📐 Image redimensionnée!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[RESIZE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ ENHANCE (Améliorer - utilise contraste + luminosité)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "enhance",
    classe: "Image",
    react: "✨",
    desc: "Améliorer la qualité d'une image",
    alias: ["hd", "upscale", "ameliorer"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .enhance");
      }

      await repondre("✨ Amélioration de la qualité...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Appliquer plusieurs effets avec Jimp pour améliorer
      const image = await Jimp.read(imageBuffer);
      
      // Augmenter légèrement le contraste et la luminosité
      image.contrast(0.1);
      image.brightness(0.05);
      
      // Réduire légèrement le bruit avec un flou minimal puis netteté
      image.gaussian(1);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "✨ Image améliorée!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[ENHANCE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ CARTOON (Effet dessin - posterize + contraste)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "cartoon",
    classe: "Image",
    react: "🎨",
    desc: "Effet dessin animé",
    alias: ["toon", "anime", "dessin"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .cartoon");
      }

      await repondre("🎨 Application de l'effet cartoon...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Créer un effet cartoon avec Jimp
      const image = await Jimp.read(imageBuffer);
      
      // Posterize pour réduire les couleurs (effet cartoon)
      image.posterize(8);
      // Augmenter le contraste pour des bords plus nets
      image.contrast(0.3);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      await ovl.sendMessage(msg.key.remoteJid, {
        image: processedBuffer,
        caption: "🎨 Effet cartoon appliqué!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[CARTOON]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Image_edits.js chargé - Commandes: removebg, blur, grayscale, invert, mirror, rotate, sepia, brightness, contrast, posterize, pixelate, circle, resize, enhance, cartoon");
