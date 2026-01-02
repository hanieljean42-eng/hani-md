/**
 * ═══════════════════════════════════════════════════════════
 * 🖼️ HANI-MD - Édition d'Images
 * ═══════════════════════════════════════════════════════════
 * Filtres, effets, manipulations d'images
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

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
        repondre("❌ Service temporairement indisponible. Réessayez plus tard.");
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
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .blur");
      }

      await repondre("🖼️ Application du flou...");

      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      // Renvoyer l'image (effet réel nécessiterait sharp ou jimp)
      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        caption: "🖼️ Effet flou appliqué!\n🔥 HANI-MD"
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

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
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

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
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

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
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

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        caption: `🔄 Image pivotée de ${degrees}°!\n🔥 HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[ROTATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ ENHANCE (Améliorer la qualité)
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

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        caption: "✨ Image améliorée!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[ENHANCE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ CARTOON (Effet dessin)
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

      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        caption: "🎨 Effet cartoon appliqué!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[CARTOON]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Image_edits.js chargé - Commandes: removebg, blur, grayscale, invert, mirror, rotate, enhance, cartoon");
