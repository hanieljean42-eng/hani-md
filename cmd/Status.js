/**
 * ═══════════════════════════════════════════════════════════
 * 📊 HANI-MD - Commandes Status
 * ═══════════════════════════════════════════════════════════
 * Gestion des statuts WhatsApp
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
// 📊 POSTER UN STATUT TEXTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statustext",
    classe: "Status",
    react: "📊",
    desc: "Poster un statut texte",
    alias: ["poststatus", "mystatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const text = arg.join(" ");
      
      if (!text) {
        return repondre("❌ Utilisation: .statustext [texte du statut]");
      }

      await ovl.sendMessage("status@broadcast", {
        text: text,
        backgroundColor: "#075E54", // Vert WhatsApp
        font: 1
      });

      repondre("✅ Statut texte posté avec succès!");

    } catch (error) {
      console.error("[STATUSTEXT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📸 POSTER UN STATUT IMAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusimg",
    classe: "Status",
    react: "📸",
    desc: "Poster un statut image",
    alias: ["statusimage", "imgstatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return repondre("❌ Répondez à une image avec .statusimg");
      }

      const caption = arg.join(" ") || "";
      
      const imageBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!imageBuffer) {
        return repondre("❌ Impossible de télécharger l'image");
      }

      await ovl.sendMessage("status@broadcast", {
        image: imageBuffer,
        caption: caption
      });

      repondre("✅ Statut image posté avec succès!");

    } catch (error) {
      console.error("[STATUSIMG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎬 POSTER UN STATUT VIDÉO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusvid",
    classe: "Status",
    react: "🎬",
    desc: "Poster un statut vidéo",
    alias: ["statusvideo", "vidstatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.videoMessage) {
        return repondre("❌ Répondez à une vidéo avec .statusvid");
      }

      const caption = arg.join(" ") || "";
      
      const videoBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!videoBuffer) {
        return repondre("❌ Impossible de télécharger la vidéo");
      }

      await ovl.sendMessage("status@broadcast", {
        video: videoBuffer,
        caption: caption
      });

      repondre("✅ Statut vidéo posté avec succès!");

    } catch (error) {
      console.error("[STATUSVID]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 POSTER UN STATUT AUDIO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusaudio",
    classe: "Status",
    react: "🎵",
    desc: "Poster un statut audio",
    alias: ["audiostatus", "statusmusic"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.audioMessage) {
        return repondre("❌ Répondez à un audio avec .statusaudio");
      }
      
      const audioBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!audioBuffer) {
        return repondre("❌ Impossible de télécharger l'audio");
      }

      await ovl.sendMessage("status@broadcast", {
        audio: audioBuffer,
        mimetype: "audio/mp4",
        ptt: true
      });

      repondre("✅ Statut audio posté avec succès!");

    } catch (error) {
      console.error("[STATUSAUDIO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👁️ ACTIVER AUTO-VUE STATUS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autoview",
    classe: "Status",
    react: "👁️",
    desc: "Activer/désactiver la vue auto des statuts",
    alias: ["autostatus", "viewstatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const action = arg[0]?.toLowerCase();
      
      if (action === "on" || action === "1") {
        // Activer la vue auto (à implémenter avec DB)
        process.env.AUTO_VIEW_STATUS = "true";
        repondre("👁️ *Auto-vue des statuts activée!*\n\nLe bot verra automatiquement les statuts de vos contacts.");
      } else if (action === "off" || action === "0") {
        process.env.AUTO_VIEW_STATUS = "false";
        repondre("👁️ *Auto-vue des statuts désactivée!*");
      } else {
        repondre("❌ Utilisation: .autoview on/off");
      }

    } catch (error) {
      console.error("[AUTOVIEW]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❤️ AUTO-REACT STATUS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autoreact",
    classe: "Status",
    react: "❤️",
    desc: "Réagir automatiquement aux statuts",
    alias: ["reactstatus", "autolikestatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const action = arg[0]?.toLowerCase();
      const emoji = arg[1] || "❤️";
      
      if (action === "on" || action === "1") {
        process.env.AUTO_REACT_STATUS = "true";
        process.env.STATUS_REACT_EMOJI = emoji;
        repondre(`❤️ *Auto-réaction aux statuts activée!*\n\nEmoji: ${emoji}`);
      } else if (action === "off" || action === "0") {
        process.env.AUTO_REACT_STATUS = "false";
        repondre("❤️ *Auto-réaction aux statuts désactivée!*");
      } else {
        repondre("❌ Utilisation: .autoreact on/off [emoji]\nExemple: .autoreact on 🔥");
      }

    } catch (error) {
      console.error("[AUTOREACT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📥 TÉLÉCHARGER UN STATUT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dlstatus",
    classe: "Status",
    react: "📥",
    desc: "Télécharger un statut",
    alias: ["downloadstatus", "savstatus"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      // Note: Cette fonctionnalité nécessite que le message soit un statut
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage) {
        return repondre("❌ Répondez à un statut pour le télécharger");
      }

      const mediaBuffer = await ovl.downloadMediaMessage({ 
        key: msg.key, 
        message: quotedMessage 
      });

      if (!mediaBuffer) {
        return repondre("❌ Impossible de télécharger le statut");
      }

      // Déterminer le type de média
      if (quotedMessage.imageMessage) {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: mediaBuffer,
          caption: "✅ Statut téléchargé!\n🔥 HANI-MD"
        }, { quoted: ms });
      } else if (quotedMessage.videoMessage) {
        await ovl.sendMessage(msg.key.remoteJid, {
          video: mediaBuffer,
          caption: "✅ Statut téléchargé!\n🔥 HANI-MD"
        }, { quoted: ms });
      } else if (quotedMessage.audioMessage) {
        await ovl.sendMessage(msg.key.remoteJid, {
          audio: mediaBuffer,
          mimetype: "audio/mp4"
        }, { quoted: ms });
      } else {
        repondre("❌ Type de statut non supporté");
      }

    } catch (error) {
      console.error("[DLSTATUS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Status.js chargé - Commandes: statustext, statusimg, statusvid, statusaudio, autoview, autoreact, dlstatus");
