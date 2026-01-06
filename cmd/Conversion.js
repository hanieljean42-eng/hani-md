/**
 * ═══════════════════════════════════════════════════════════
 * 🔄 HANI-MD - Commandes de Conversion
 * ═══════════════════════════════════════════════════════════
 * Sticker, toimg, audio, vidéo, document
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { downloadMedia, downloadSticker, downloadVideo, downloadAudio, downloadImage } = require("../lib/mediaDownloader");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// ═══════════════════════════════════════════════════════════
// 🖼️ STICKER CRÉATION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "s",
    classe: "Conversion",
    react: "🖼️",
    desc: "Créer un sticker à partir d'une image/vidéo",
    alias: ["stk", "stick", "sticker"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      // Vérifier si c'est une réponse à un média
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const directImage = msg.message?.imageMessage;
      const directVideo = msg.message?.videoMessage;
      
      const imageMsg = quotedMessage?.imageMessage || directImage;
      const videoMsg = quotedMessage?.videoMessage || directVideo;

      if (!imageMsg && !videoMsg) {
        return repondre("❌ Répondez à une image ou vidéo avec .s");
      }

      await repondre("🖼️ Création du sticker...");

      // Télécharger le média
      const messageToDownload = quotedMessage || msg.message;
      const mediaBuffer = await downloadMedia(messageToDownload);

      if (!mediaBuffer) {
        return repondre("❌ Impossible de télécharger le média");
      }

      // Créer et envoyer le sticker
      await ovl.sendMessage(msg.key.remoteJid, {
        sticker: mediaBuffer,
        packname: "HANI-MD",
        author: "Premium Bot"
      }, { quoted: ms });

    } catch (error) {
      console.error("[STICKER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ STICKER VERS IMAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "toimage",
    classe: "Conversion",
    react: "🖼️",
    desc: "Convertir un sticker en image",
    alias: ["toimg", "stickerimg", "unsticker"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.stickerMessage) {
        return repondre("❌ Répondez à un sticker avec .toimage");
      }

      await repondre("🔄 Conversion en cours...");

      const stickerBuffer = await downloadSticker(quotedMessage);

      if (!stickerBuffer) {
        return repondre("❌ Impossible de télécharger le sticker");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        image: stickerBuffer,
        caption: "✅ Sticker converti!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[TOIMAGE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 VIDÉO VERS AUDIO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "toaudio",
    classe: "Conversion",
    react: "🎵",
    desc: "Extraire l'audio d'une vidéo",
    alias: ["mp3", "tomp3", "extractaudio"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.videoMessage) {
        return repondre("❌ Répondez à une vidéo avec .toaudio");
      }

      await repondre("🎵 Extraction audio en cours...");

      const videoBuffer = await downloadVideo(quotedMessage);

      if (!videoBuffer) {
        return repondre("❌ Impossible de télécharger la vidéo");
      }

      // Envoyer comme audio (WhatsApp peut convertir)
      await ovl.sendMessage(msg.key.remoteJid, {
        audio: videoBuffer,
        mimetype: "audio/mp4",
        ptt: false
      }, { quoted: ms });

    } catch (error) {
      console.error("[TOAUDIO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎤 AUDIO VERS VOCAL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tovn",
    classe: "Conversion",
    react: "🎤",
    desc: "Convertir un audio en message vocal",
    alias: ["toptt", "tovocal", "voicenote"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.audioMessage) {
        return repondre("❌ Répondez à un audio avec .tovn");
      }

      const audioBuffer = await downloadAudio(quotedMessage);

      if (!audioBuffer) {
        return repondre("❌ Impossible de télécharger l'audio");
      }

      // Envoyer comme message vocal
      await ovl.sendMessage(msg.key.remoteJid, {
        audio: audioBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      }, { quoted: ms });

    } catch (error) {
      console.error("[TOVN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📄 IMAGE VERS DOCUMENT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "todoc",
    classe: "Conversion",
    react: "📄",
    desc: "Convertir un média en document",
    alias: ["todocument", "asdoc"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMsg = quotedMessage?.imageMessage;
      const videoMsg = quotedMessage?.videoMessage;
      const audioMsg = quotedMessage?.audioMessage;

      if (!imageMsg && !videoMsg && !audioMsg) {
        return repondre("❌ Répondez à une image, vidéo ou audio avec .todoc");
      }

      const mediaBuffer = await downloadMedia(quotedMessage);

      if (!mediaBuffer) {
        return repondre("❌ Impossible de télécharger le média");
      }

      let fileName = "HANI-MD_file";
      let mimetype = "application/octet-stream";

      if (imageMsg) {
        fileName += ".jpg";
        mimetype = "image/jpeg";
      } else if (videoMsg) {
        fileName += ".mp4";
        mimetype = "video/mp4";
      } else if (audioMsg) {
        fileName += ".mp3";
        mimetype = "audio/mpeg";
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        document: mediaBuffer,
        mimetype: mimetype,
        fileName: fileName
      }, { quoted: ms });

    } catch (error) {
      console.error("[TODOC]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎥 GIF VERS VIDÉO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tovideo",
    classe: "Conversion",
    react: "🎥",
    desc: "Convertir un GIF/sticker animé en vidéo",
    alias: ["tomp4", "gifvideo"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.stickerMessage && !quotedMessage?.videoMessage) {
        return repondre("❌ Répondez à un sticker animé ou GIF avec .tovideo");
      }

      const mediaBuffer = await downloadMedia(quotedMessage);

      if (!mediaBuffer) {
        return repondre("❌ Impossible de télécharger le média");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        video: mediaBuffer,
        mimetype: "video/mp4",
        caption: "✅ Converti en vidéo!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[TOVIDEO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📸 URL VERS IMAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "url2img",
    classe: "Conversion",
    react: "📸",
    desc: "Télécharger une image depuis une URL",
    alias: ["urlimage", "fetchimg"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      
      if (!url || !url.startsWith("http")) {
        return repondre("❌ Utilisation: .url2img [URL de l'image]");
      }

      await repondre("📸 Téléchargement...");

      await ovl.sendMessage(msg.key.remoteJid, {
        image: { url: url },
        caption: "✅ Image téléchargée!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[URL2IMG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎬 URL VERS VIDÉO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "url2vid",
    classe: "Conversion",
    react: "🎬",
    desc: "Télécharger une vidéo depuis une URL",
    alias: ["urlvideo", "fetchvid"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      
      if (!url || !url.startsWith("http")) {
        return repondre("❌ Utilisation: .url2vid [URL de la vidéo]");
      }

      await repondre("🎬 Téléchargement...");

      await ovl.sendMessage(msg.key.remoteJid, {
        video: { url: url },
        mimetype: "video/mp4",
        caption: "✅ Vidéo téléchargée!\n🔥 HANI-MD"
      }, { quoted: ms });

    } catch (error) {
      console.error("[URL2VID]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Conversion.js chargé - Commandes: s, toimage, toaudio, tovn, todoc, tovideo, url2img, url2vid");
