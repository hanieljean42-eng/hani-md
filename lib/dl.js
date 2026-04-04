/**
 * ═══════════════════════════════════════════════════════════
 * 📥 HANI-MD - Module de Téléchargement
 * ═══════════════════════════════════════════════════════════
 * YouTube: play-dl (sans API externe)
 * TikTok: tikwm.com
 * Autres: APIs alternatives fiables
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const TIMEOUT = 30000;
const UA = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile Safari/537.36";

// ─── YOUTUBE (play-dl) ───────────────────────────────────────────────────────

async function ytdl(query, format = "audio") {
  let playdl = null;
  try { playdl = require("play-dl"); } catch(e) {}

  if (!playdl) return { status: false, message: "Modules manquants (play-dl). Exécutez npm install." };

  try {
    let videoUrl = query;
    let videoInfo = null;

    const isUrl = query.includes("youtube.com") || query.includes("youtu.be");
    if (!isUrl) {
      const results = await playdl.search(query, { source: { youtube: "video" }, limit: 1 });
      if (!results || results.length === 0) return { status: false, message: "Aucun résultat trouvé" };
      videoUrl = results[0].url;
      videoInfo = results[0];
    }

    const info = await playdl.video_info(videoUrl);
    if (!info) return { status: false, message: "Impossible de récupérer les infos" };

    const details = info.video_details;
    const streamData = await playdl.stream(videoUrl, { quality: format === "video" ? 360 : 2 });

    const tmpDir = path.join(process.cwd(), "DataBase", "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const ext = format === "video" ? "mp4" : "mp3";
    const tmpFile = path.join(tmpDir, `yt_${Date.now()}.${ext}`);

    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tmpFile);
      streamData.stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      setTimeout(() => reject(new Error("Timeout")), 120000);
    });

    return {
      status: true,
      data: [{
        title: details.title || "Sans titre",
        thumbnail: details.thumbnails?.[0]?.url || "",
        duration: details.durationRaw || "",
        views: details.views || 0,
        localFile: tmpFile
      }]
    };
  } catch (e) {
    console.log(`[YTDL] play-dl échoué: ${e.message}`);
    return { status: false, message: `Erreur YouTube: ${e.message}` };
  }
}

// ─── TIKTOK (tikwm.com) ───────────────────────────────────────────────────────

async function ttdl(url) {
  try {
    const resp = await axios.post("https://www.tikwm.com/api/", { url, hd: 1 }, {
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      timeout: TIMEOUT
    });
    if (resp.data?.code === 0 && resp.data?.data) {
      const d = resp.data.data;
      return {
        video: d.hdplay || d.play,
        audio: d.music,
        title: d.title || "",
        author: d.author?.nickname || "",
        thumbnail: d.cover || ""
      };
    }
  } catch (e) {
    console.log(`[TTDL] tikwm: ${e.message}`);
  }

  try {
    const resp2 = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": UA },
      timeout: TIMEOUT
    });
    if (resp2.data?.code === 0 && resp2.data?.data) {
      const d = resp2.data.data;
      return {
        video: d.hdplay || d.play,
        audio: d.music,
        title: d.title || "",
        author: d.author?.nickname || ""
      };
    }
  } catch(e) {
    console.log(`[TTDL] tikwm GET: ${e.message}`);
  }
  return null;
}

// ─── INSTAGRAM ───────────────────────────────────────────────────────────────

async function igdl(url) {
  const endpoints = [
    `https://api.snapinst.app/api/v1?url=${encodeURIComponent(url)}`,
    `https://igdl.io/api/?url=${encodeURIComponent(url)}`
  ];
  for (const ep of endpoints) {
    try {
      const resp = await axios.get(ep, { headers: { "User-Agent": UA }, timeout: TIMEOUT, validateStatus: () => true });
      if (resp.status === 200 && resp.data && !String(resp.data).includes("<html")) {
        const d = resp.data;
        if (d.data || d.url || d.media) {
          const items = d.data || (d.url ? [{ url: d.url }] : null) || d.media;
          if (items) return Array.isArray(items) ? items : [{ url: items }];
        }
      }
    } catch(e) { console.log(`[IGDL] ${e.message}`); }
  }
  return null;
}

// ─── FACEBOOK ────────────────────────────────────────────────────────────────

async function fbdl(url) {
  try {
    const resp = await axios.get(`https://snapfrom.com/api/video?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": UA }, timeout: TIMEOUT, validateStatus: () => true
    });
    if (resp.status === 200 && resp.data?.data) {
      return resp.data.data.hd || resp.data.data.sd || resp.data.data.video || resp.data.data.url;
    }
  } catch(e) { console.log(`[FBDL] ${e.message}`); }
  return "Erreur: Impossible de télécharger la vidéo Facebook";
}

// ─── TWITTER/X ────────────────────────────────────────────────────────────────

async function twitterdl(url) {
  try {
    const resp = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": UA }, timeout: TIMEOUT, validateStatus: () => true
    });
    if (resp.status === 200 && resp.data?.data) {
      const d = resp.data.data;
      return { video: d.video || d.hd || d.sd, text: d.text };
    }
  } catch(e) { console.log(`[TWITTER] ${e.message}`); }
  return null;
}

// ─── PINTEREST ────────────────────────────────────────────────────────────────

async function pindl(url) {
  try {
    const resp = await axios.get(`https://api.pinterest.com/v1/pins/?access_token=anonymous&url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": UA }, timeout: 10000, validateStatus: () => true
    });
    if (resp.status === 200 && resp.data?.data?.image) {
      const images = resp.data.data.image;
      return images.original?.url || images["736x"]?.url;
    }
  } catch(e) {}

  try {
    const resp2 = await axios.get(`https://www.savepin.app/download.php?url=${encodeURIComponent(url)}&button=Download`, {
      headers: { "User-Agent": UA }, timeout: 10000, validateStatus: () => true
    });
    if (resp2.status === 200 && resp2.data?.url) return resp2.data.url;
  } catch(e) { console.log(`[PINDL] ${e.message}`); }
  return null;
}

// ─── SPOTIFY → YT FALLBACK ────────────────────────────────────────────────────

async function spotifydl(query) {
  try {
    const playdl = require("play-dl");
    let searchQuery = query;

    if (query.includes("spotify.com")) {
      if (playdl.is_expired?.()) await playdl.refreshToken?.();
      const sp = await playdl.spotify(query);
      searchQuery = `${sp?.name} ${sp?.artists?.[0]?.name || ""}`.trim();
    }

    const results = await playdl.search(searchQuery, { source: { youtube: "video" }, limit: 1 });
    if (!results?.length) return null;

    const video = results[0];
    const streamData = await playdl.stream(video.url, { quality: 2 });

    const tmpDir = path.join(process.cwd(), "DataBase", "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `sp_${Date.now()}.mp3`);

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(tmpFile);
      streamData.stream.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      setTimeout(() => reject(new Error("Timeout")), 120000);
    });

    return {
      title: video.title || searchQuery,
      artist: video.channel?.name || "",
      thumbnail: video.thumbnails?.[0]?.url || "",
      download: null,
      localFile: tmpFile
    };
  } catch(e) {
    console.log(`[SPOTIFY] ${e.message}`);
    return null;
  }
}

async function spotifySearch(query) {
  try {
    const playdl = require("play-dl");
    const results = await playdl.search(query, { source: { youtube: "video" }, limit: 5 });
    return results?.map(v => ({ title: v.title, url: v.url, duration: v.durationRaw, thumbnail: v.thumbnails?.[0]?.url })) || [];
  } catch(e) { return []; }
}

// ─── YT SEARCH (pour Search.js) ───────────────────────────────────────────────

async function ytSearch(query) {
  try {
    const playdl = require("play-dl");
    const results = await playdl.search(query, { source: { youtube: "video" }, limit: 5 });
    return results?.map(v => ({
      title: v.title,
      url: v.url,
      duration: v.durationRaw,
      thumbnail: v.thumbnails?.[0]?.url,
      views: v.views || 0,
      channel: v.channel?.name || ""
    })) || [];
  } catch(e) {
    console.log(`[YT-SEARCH] ${e.message}`);
    return [];
  }
}

// ─── APK (lien direct APKPure) ────────────────────────────────────────────────

async function apkdl(query) {
  return { link: `https://apkpure.com/search?q=${encodeURIComponent(query)}`, name: query };
}

// Exports
module.exports = {
  ytdl,
  fbdl,
  ttdl,
  igdl,
  twitterdl,
  apkdl,
  pindl,
  spotifydl,
  spotifySearch,
  ytSearch
};
