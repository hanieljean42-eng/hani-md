/**
 * ═══════════════════════════════════════════════════════════
 * 📥 HANI-MD - Module de Téléchargement
 * ═══════════════════════════════════════════════════════════
 * APIs pour télécharger depuis différentes plateformes
 * Version désobfusquée et optimisée
 */

const axios = require("axios");

// Configuration des timeouts
const TIMEOUT = 30000; // 30 secondes

/**
 * Télécharger depuis YouTube (audio ou vidéo)
 * @param {string} query - URL ou terme de recherche
 * @param {string} format - 'audio' ou 'video'
 * @returns {Object} Données de téléchargement
 */
async function ytdl(query, format = "audio") {
  const apis = [
    // API 1: Vreden
    async () => {
      const endpoint = format === "video" ? "ytmp4" : "ytmp3";
      const isUrl = query.includes("youtube.com") || query.includes("youtu.be");
      
      if (isUrl) {
        const url = `https://api.vrfrnd.xyz/api/${endpoint}?url=${encodeURIComponent(query)}`;
        const resp = await axios.get(url, { timeout: TIMEOUT });
        if (resp.data?.status && resp.data?.data) {
          return {
            status: true,
            data: [{
              title: resp.data.data.title || "Sans titre",
              thumbnail: resp.data.data.thumbnail || "",
              duration: resp.data.data.duration || "",
              url: resp.data.data.download || resp.data.data.url,
              views: resp.data.data.views || 0
            }]
          };
        }
      } else {
        // Recherche d'abord
        const searchUrl = `https://api.vrfrnd.xyz/api/ytsearch?query=${encodeURIComponent(query)}`;
        const searchResp = await axios.get(searchUrl, { timeout: 15000 });
        if (searchResp.data?.status && searchResp.data?.data?.[0]) {
          const video = searchResp.data.data[0];
          const dlUrl = `https://api.vrfrnd.xyz/api/${endpoint}?url=${encodeURIComponent(video.url)}`;
          const dlResp = await axios.get(dlUrl, { timeout: TIMEOUT });
          if (dlResp.data?.status && dlResp.data?.data) {
            return {
              status: true,
              data: [{
                title: dlResp.data.data.title || video.title,
                thumbnail: dlResp.data.data.thumbnail || video.thumbnail,
                duration: video.duration || "",
                url: dlResp.data.data.download || dlResp.data.data.url,
                views: video.views || 0
              }]
            };
          }
        }
      }
      return null;
    },
    // API 2: Agatz
    async () => {
      const endpoint = format === "video" ? "ytmp4" : "ytmp3";
      const url = `https://api.agatz.xyz/api/${endpoint}?url=${encodeURIComponent(query)}`;
      const resp = await axios.get(url, { timeout: TIMEOUT });
      if (resp.data?.status === 200 && resp.data?.data) {
        return {
          status: true,
          data: [{
            title: resp.data.data.title || "Sans titre",
            thumbnail: resp.data.data.thumbnail || "",
            url: resp.data.data.download || resp.data.data.url
          }]
        };
      }
      return null;
    }
  ];

  for (const api of apis) {
    try {
      const result = await api();
      if (result) return result;
    } catch (e) {
      console.log(`[YTDL] API échouée: ${e.message}`);
    }
  }

  return { status: false, message: "Échec du téléchargement" };
}

/**
 * Télécharger depuis Facebook
 * @param {string} url - URL de la vidéo Facebook
 * @returns {Object} URL de téléchargement
 */
async function fbdl(url) {
  const apis = [
    // API 1: itzpire
    async () => {
      const apiUrl = `https://itzpire.com/download/facebook?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === "success" && resp.data?.data) {
        return resp.data.data.hd || resp.data.data.sd || resp.data.data.video;
      }
      return null;
    },
    // API 2: Agatz
    async () => {
      const apiUrl = `https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === 200 && resp.data?.data) {
        return resp.data.data.hd || resp.data.data.sd;
      }
      return null;
    }
  ];

  for (const api of apis) {
    try {
      const result = await api();
      if (result) return result;
    } catch (e) {
      console.log(`[FBDL] API échouée: ${e.message}`);
    }
  }

  return "Erreur: Impossible de télécharger";
}

/**
 * Télécharger depuis TikTok (sans watermark)
 * @param {string} url - URL TikTok
 * @returns {Object} Données de téléchargement
 */
async function ttdl(url) {
  const apis = [
    // API 1: itzpire
    async () => {
      const apiUrl = `https://itzpire.com/download/tiktok?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === "success" && resp.data?.data) {
        return {
          video: resp.data.data.video || resp.data.data.nowm,
          audio: resp.data.data.audio,
          title: resp.data.data.title,
          author: resp.data.data.author
        };
      }
      return null;
    },
    // API 2: Agatz
    async () => {
      const apiUrl = `https://api.agatz.xyz/api/tiktok?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === 200 && resp.data?.data) {
        return {
          video: resp.data.data.nowm || resp.data.data.video,
          audio: resp.data.data.audio,
          author: resp.data.data.author
        };
      }
      return null;
    },
    // API 3: Vreden
    async () => {
      const apiUrl = `https://api.vrfrnd.xyz/api/tiktok?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status && resp.data?.data) {
        return {
          video: resp.data.data.nowm || resp.data.data.video
        };
      }
      return null;
    }
  ];

  for (const api of apis) {
    try {
      const result = await api();
      if (result) return result;
    } catch (e) {
      console.log(`[TTDL] API échouée: ${e.message}`);
    }
  }

  return null;
}

/**
 * Télécharger depuis Instagram
 * @param {string} url - URL Instagram
 * @returns {Object} Données de téléchargement
 */
async function igdl(url) {
  const apis = [
    // API 1: itzpire
    async () => {
      const apiUrl = `https://itzpire.com/download/instagram?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === "success" && resp.data?.data) {
        const data = resp.data.data;
        if (Array.isArray(data) && data[0]) {
          return data.map(item => ({
            url: item.url,
            type: item.type || "video"
          }));
        }
        return [{ url: data.url, type: data.type || "video" }];
      }
      return null;
    },
    // API 2: Agatz
    async () => {
      const apiUrl = `https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(url)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === 200 && resp.data?.data) {
        const data = resp.data.data;
        if (Array.isArray(data)) {
          return data.map(item => ({
            url: item.url,
            type: item.type || "video"
          }));
        }
        return [{ url: data.url || data.video || data.image, type: data.video ? "video" : "image" }];
      }
      return null;
    }
  ];

  for (const api of apis) {
    try {
      const result = await api();
      if (result) return result;
    } catch (e) {
      console.log(`[IGDL] API échouée: ${e.message}`);
    }
  }

  return null;
}

/**
 * Télécharger depuis Twitter/X
 * @param {string} url - URL Twitter
 * @returns {Object} Données de téléchargement
 */
async function twitterdl(url) {
  try {
    const apiUrl = `https://api.agatz.xyz/api/twitter?url=${encodeURIComponent(url)}`;
    const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
    if (resp.data?.status === 200 && resp.data?.data) {
      return {
        video: resp.data.data.video,
        image: resp.data.data.image,
        text: resp.data.data.text
      };
    }
  } catch (e) {
    console.log(`[TWITTER] API échouée: ${e.message}`);
  }
  return null;
}

/**
 * Télécharger APK depuis APKPure
 * @param {string} query - Nom de l'application
 * @returns {Object} Données de téléchargement
 */
async function apkdl(query) {
  try {
    const searchUrl = `https://api.agatz.xyz/api/apksearch?query=${encodeURIComponent(query)}`;
    const resp = await axios.get(searchUrl, { timeout: TIMEOUT });
    if (resp.data?.status === 200 && resp.data?.data) {
      return resp.data.data;
    }
  } catch (e) {
    console.log(`[APKDL] API échouée: ${e.message}`);
  }
  return null;
}

/**
 * Télécharger depuis Pinterest
 * @param {string} url - URL Pinterest
 * @returns {string} URL de l'image
 */
async function pindl(url) {
  try {
    const apiUrl = `https://api.agatz.xyz/api/pinterest?url=${encodeURIComponent(url)}`;
    const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
    if (resp.data?.status === 200 && resp.data?.data) {
      return resp.data.data.image || resp.data.data.url;
    }
  } catch (e) {
    console.log(`[PINDL] API échouée: ${e.message}`);
  }
  return null;
}

/**
 * Télécharger depuis Spotify
 * @param {string} query - URL ou terme de recherche
 * @returns {Object} Données de téléchargement
 */
async function spotifydl(query) {
  const isUrl = query.includes("spotify.com") || query.includes("spotify:");
  
  const apis = [
    // API 1: Vreden
    async () => {
      const param = isUrl ? "url" : "query";
      const apiUrl = `https://api.vrfrnd.xyz/api/spotify?${param}=${encodeURIComponent(query)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status && resp.data?.data) {
        return {
          title: resp.data.data.title || resp.data.data.name,
          artist: resp.data.data.artist || resp.data.data.artists,
          thumbnail: resp.data.data.thumbnail || resp.data.data.image,
          download: resp.data.data.download || resp.data.data.audio
        };
      }
      return null;
    },
    // API 2: Agatz
    async () => {
      const param = isUrl ? "url" : "query";
      const apiUrl = `https://api.agatz.xyz/api/spotifydl?${param}=${encodeURIComponent(query)}`;
      const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
      if (resp.data?.status === 200 && resp.data?.data) {
        return {
          title: resp.data.data.title,
          artist: resp.data.data.artist,
          thumbnail: resp.data.data.thumbnail,
          download: resp.data.data.download || resp.data.data.url
        };
      }
      return null;
    }
  ];

  for (const api of apis) {
    try {
      const result = await api();
      if (result) return result;
    } catch (e) {
      console.log(`[SPOTIFY] API échouée: ${e.message}`);
    }
  }

  return null;
}

/**
 * Recherche Spotify
 * @param {string} query - Terme de recherche
 * @returns {Array} Résultats de recherche
 */
async function spotifySearch(query) {
  try {
    const apiUrl = `https://api.agatz.xyz/api/spotifysearch?query=${encodeURIComponent(query)}`;
    const resp = await axios.get(apiUrl, { timeout: TIMEOUT });
    if (resp.data?.status === 200 && resp.data?.data) {
      return resp.data.data;
    }
  } catch (e) {
    console.log(`[SPOTIFY-SEARCH] API échouée: ${e.message}`);
  }
  return [];
}

/**
 * Recherche YouTube
 * @param {string} query - Terme de recherche
 * @returns {Array} Résultats de recherche
 */
async function ytSearch(query) {
  try {
    const apiUrl = `https://api.vrfrnd.xyz/api/ytsearch?query=${encodeURIComponent(query)}`;
    const resp = await axios.get(apiUrl, { timeout: 15000 });
    if (resp.data?.status && resp.data?.data) {
      return resp.data.data;
    }
  } catch (e) {
    console.log(`[YT-SEARCH] API échouée: ${e.message}`);
  }
  return [];
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
