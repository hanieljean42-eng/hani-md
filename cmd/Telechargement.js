/**
 * ═══════════════════════════════════════════════════════════
 * 📥 HANI-MD - Commandes de Téléchargement
 * ═══════════════════════════════════════════════════════════
 * Téléchargement depuis YouTube, TikTok, Instagram, etc.
 * Version désobfusquée et optimisée
 * 
 * NOTE: Les commandes principales sont dans hani.js
 * Ce fichier fournit des commandes supplémentaires via ovlcmd
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { ytdl, fbdl, ttdl, igdl, spotifydl, pindl, twitterdl } = require("../lib/dl");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
// 🎵 YOUTUBE AUDIO (play/ytmp3)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ytaudio",
    classe: "Téléchargement",
    react: "🎵",
    desc: "Télécharger l'audio d'une vidéo YouTube",
    alias: ["yta", "mp3"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .ytaudio [lien ou titre]");
      }

      await repondre("🎵 Téléchargement audio en cours...");

      const result = await ytdl(query, "audio");
      if (!result.status || !result.data?.[0]) {
        return repondre("❌ Impossible de télécharger cet audio");
      }

      const track = result.data[0];

      let audioBuffer;
      if (track.localFile && fs.existsSync(track.localFile)) {
        audioBuffer = fs.readFileSync(track.localFile);
        try { fs.unlinkSync(track.localFile); } catch(e) {}
      } else if (track.url) {
        const audioResp = await axios.get(track.url, { responseType: "arraybuffer", timeout: 60000 });
        audioBuffer = Buffer.from(audioResp.data);
      } else {
        return repondre("❌ Lien de téléchargement non trouvé");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        audio: audioBuffer,
        mimetype: "audio/mp4",
        ptt: false,
        fileName: `${track.title || "audio"}.mp3`
      }, { quoted: ms });

      await repondre(`✅ *${track.title}*\n🔊 Powered by HANI-MD`);

    } catch (error) {
      console.error("[YTAUDIO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎬 YOUTUBE VIDÉO (video/ytmp4)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ytvideo",
    classe: "Téléchargement",
    react: "🎬",
    desc: "Télécharger une vidéo YouTube",
    alias: ["ytv", "mp4"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .ytvideo [lien ou titre]");
      }

      await repondre("🎬 Téléchargement vidéo en cours...");

      const result = await ytdl(query, "video");
      if (!result.status || !result.data?.[0]) {
        return repondre("❌ Impossible de télécharger cette vidéo");
      }

      const track = result.data[0];

      let videoBuffer;
      if (track.localFile && fs.existsSync(track.localFile)) {
        videoBuffer = fs.readFileSync(track.localFile);
        try { fs.unlinkSync(track.localFile); } catch(e) {}
      } else if (track.url) {
        const videoResp = await axios.get(track.url, { responseType: "arraybuffer", timeout: 60000 });
        videoBuffer = Buffer.from(videoResp.data);
      } else {
        return repondre("❌ Lien de téléchargement non trouvé");
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: `🎬 *${track.title}*\n\n✅ Powered by HANI-MD`,
        fileName: `${track.title || "video"}.mp4`
      }, { quoted: ms });

    } catch (error) {
      console.error("[YTVIDEO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📱 TIKTOK
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "tiktokdl",
    classe: "Téléchargement",
    react: "📱",
    desc: "Télécharger une vidéo TikTok sans watermark",
    alias: ["ttdl", "tiktoknowm"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      if (!url || !url.includes("tiktok")) {
        return repondre("❌ Utilisation: .tiktokdl [lien TikTok]");
      }

      await repondre("📱 Téléchargement TikTok en cours...");

      const result = await ttdl(url);
      if (!result || !result.video) {
        return repondre("❌ Impossible de télécharger cette vidéo");
      }

      // Télécharger le fichier
      const videoResp = await axios.get(result.video, { responseType: "arraybuffer" });
      const videoBuffer = Buffer.from(videoResp.data);

      // Envoyer la vidéo
      await ovl.sendMessage(msg.key.remoteJid, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: `📱 *TikTok*\n${result.author ? `👤 @${result.author}` : ""}\n\n✅ Sans watermark!\n🔥 Powered by HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[TIKTOK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📘 FACEBOOK
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "fbvideo",
    classe: "Téléchargement",
    react: "📘",
    desc: "Télécharger une vidéo Facebook",
    alias: ["fbdl", "facebookdl"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      if (!url || (!url.includes("facebook") && !url.includes("fb.watch"))) {
        return repondre("❌ Utilisation: .fbvideo [lien Facebook]");
      }

      await repondre("📘 Téléchargement Facebook en cours...");

      const videoUrl = await fbdl(url);
      if (!videoUrl || videoUrl.startsWith("Erreur")) {
        return repondre("❌ Impossible de télécharger cette vidéo");
      }

      // Télécharger le fichier
      const videoResp = await axios.get(videoUrl, { responseType: "arraybuffer" });
      const videoBuffer = Buffer.from(videoResp.data);

      // Envoyer la vidéo
      await ovl.sendMessage(msg.key.remoteJid, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: `📘 *Vidéo Facebook*\n\n✅ Téléchargement terminé!\n🔥 Powered by HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[FACEBOOK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📸 INSTAGRAM
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "igdownload",
    classe: "Téléchargement",
    react: "📸",
    desc: "Télécharger depuis Instagram",
    alias: ["instadl", "igdl"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      if (!url || !url.includes("instagram")) {
        return repondre("❌ Utilisation: .igdownload [lien Instagram]");
      }

      await repondre("📸 Téléchargement Instagram en cours...");

      const result = await igdl(url);
      if (!result || result.length === 0) {
        return repondre("❌ Impossible de télécharger ce contenu");
      }

      // Envoyer chaque média
      for (const media of result) {
        const mediaResp = await axios.get(media.url, { responseType: "arraybuffer" });
        const mediaBuffer = Buffer.from(mediaResp.data);

        if (media.type === "video") {
          await ovl.sendMessage(msg.key.remoteJid, {
            video: mediaBuffer,
            mimetype: "video/mp4",
            caption: `📸 *Instagram*\n\n✅ Powered by HANI-MD`
          }, { quoted: ms });
        } else {
          await ovl.sendMessage(msg.key.remoteJid, {
            image: mediaBuffer,
            caption: `📸 *Instagram*\n\n✅ Powered by HANI-MD`
          }, { quoted: ms });
        }
      }

    } catch (error) {
      console.error("[INSTAGRAM]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 SPOTIFY
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "spotifydownload",
    classe: "Téléchargement",
    react: "🎵",
    desc: "Télécharger depuis Spotify",
    alias: ["spdl", "spotdl"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .spotifydownload [titre ou lien Spotify]");
      }

      await repondre("🎵 Téléchargement Spotify en cours...");

      const result = await spotifydl(query);
      if (!result) {
        return repondre("❌ Impossible de télécharger cette musique");
      }

      let audioBuffer;
      if (result.localFile && fs.existsSync(result.localFile)) {
        audioBuffer = fs.readFileSync(result.localFile);
        try { fs.unlinkSync(result.localFile); } catch(e) {}
      } else if (result.download) {
        const audioResp = await axios.get(result.download, { responseType: "arraybuffer", timeout: 60000 });
        audioBuffer = Buffer.from(audioResp.data);
      } else {
        return repondre("❌ Impossible de télécharger cette musique");
      }

      if (result.thumbnail) {
        try {
          await ovl.sendMessage(msg.key.remoteJid, {
            image: { url: result.thumbnail },
            caption: `🎵 *${result.title}*\n👤 ${result.artist || "Artiste inconnu"}\n\n⏳ Envoi de l'audio...`
          }, { quoted: ms });
        } catch (e) {}
      }

      await ovl.sendMessage(msg.key.remoteJid, {
        audio: audioBuffer,
        mimetype: "audio/mp4",
        ptt: false,
        fileName: `${result.title || "spotify"}.mp3`
      }, { quoted: ms });

      await repondre(`✅ Téléchargement terminé!\n🔊 Powered by HANI-MD`);

    } catch (error) {
      console.error("[SPOTIFY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📌 PINTEREST
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pinterestdl",
    classe: "Téléchargement",
    react: "📌",
    desc: "Télécharger une image Pinterest",
    alias: ["pindl", "pintdl"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      if (!url || (!url.includes("pinterest") && !url.includes("pin.it"))) {
        return repondre("❌ Utilisation: .pinterestdl [lien Pinterest]");
      }

      await repondre("📌 Téléchargement Pinterest en cours...");

      const imageUrl = await pindl(url);
      if (!imageUrl) {
        return repondre("❌ Impossible de télécharger cette image");
      }

      // Télécharger le fichier
      const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const imgBuffer = Buffer.from(imgResp.data);

      // Envoyer l'image
      await ovl.sendMessage(msg.key.remoteJid, {
        image: imgBuffer,
        caption: `📌 *Pinterest*\n\n✅ Image HD téléchargée!\n🔥 Powered by HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[PINTEREST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🐦 TWITTER/X
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "twitterdl",
    classe: "Téléchargement",
    react: "🐦",
    desc: "Télécharger depuis Twitter/X",
    alias: ["xdl", "twdl"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const url = arg[0];
      if (!url || (!url.includes("twitter") && !url.includes("x.com"))) {
        return repondre("❌ Utilisation: .twitterdl [lien Twitter/X]");
      }

      await repondre("🐦 Téléchargement Twitter/X en cours...");

      const result = await twitterdl(url);
      if (!result) {
        return repondre("❌ Impossible de télécharger ce contenu");
      }

      if (result.video) {
        const videoResp = await axios.get(result.video, { responseType: "arraybuffer" });
        const videoBuffer = Buffer.from(videoResp.data);

        await ovl.sendMessage(msg.key.remoteJid, {
          video: videoBuffer,
          mimetype: "video/mp4",
          caption: `🐦 *Twitter/X*\n\n✅ Powered by HANI-MD`
        }, { quoted: ms });
      } else if (result.image) {
        const imgResp = await axios.get(result.image, { responseType: "arraybuffer" });
        const imgBuffer = Buffer.from(imgResp.data);

        await ovl.sendMessage(msg.key.remoteJid, {
          image: imgBuffer,
          caption: `🐦 *Twitter/X*\n\n✅ Powered by HANI-MD`
        }, { quoted: ms });
      } else {
        return repondre("❌ Aucun média trouvé");
      }

    } catch (error) {
      console.error("[TWITTER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Telechargement.js chargé - Commandes: ytaudio, ytvideo, tiktokdl, fbvideo, igdownload, spotifydownload, pinterestdl, twitterdl");
