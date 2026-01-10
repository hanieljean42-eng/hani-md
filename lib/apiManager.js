/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║          🤖 HANI-MD - API Manager                         ║
 * ║       APIs avec fallback pour IA et Téléchargement        ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const axios = require('axios');

const TIMEOUT = 30000;

// ═══════════════════════════════════════════════════════════
// 🤖 APIs INTELLIGENCE ARTIFICIELLE
// ═══════════════════════════════════════════════════════════

const AI_APIS = {
  gpt: [
    { url: "https://api.vrfrnd.xyz/api/gpt", param: "prompt" },
    { url: "https://api.agatz.xyz/api/gpt4", param: "message" },
    { url: "https://api.itzpire.com/ai/gpt", param: "text" },
    { url: "https://aemt.me/gpt4", param: "text" },
    { url: "https://api.nyxs.pw/ai/gpt4-turbo", param: "text" }
  ],
  gemini: [
    { url: "https://api.vrfrnd.xyz/api/gemini", param: "prompt" },
    { url: "https://api.agatz.xyz/api/gemini", param: "message" },
    { url: "https://aemt.me/gemini", param: "text" }
  ],
  dalle: [
    { url: "https://api.vrfrnd.xyz/api/dalle", param: "prompt" },
    { url: "https://api.agatz.xyz/api/text2img", param: "prompt" },
    { url: "https://aemt.me/dalle", param: "text" }
  ]
};

async function callAI(type, query) {
  const apis = AI_APIS[type] || AI_APIS.gpt;
  
  for (const api of apis) {
    try {
      const url = `${api.url}?${api.param}=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: TIMEOUT });
      
      if (response.data) {
        // Extraire la réponse selon différents formats
        const result = response.data.result || 
                       response.data.response || 
                       response.data.answer || 
                       response.data.message || 
                       response.data.data?.result ||
                       response.data.data?.response ||
                       response.data.data;
        
        if (result && (typeof result === 'string' ? result.length > 10 : true)) {
          return { success: true, result, api: api.url };
        }
      }
    } catch (e) {
      console.log(`[API] ⚠️ ${api.url} échoué: ${e.message}`);
      continue;
    }
  }
  
  return { success: false, error: "Toutes les APIs ont échoué" };
}

async function askGPT(query) {
  return callAI('gpt', query);
}

async function askGemini(query) {
  return callAI('gemini', query);
}

async function generateImage(prompt) {
  return callAI('dalle', prompt);
}

// ═══════════════════════════════════════════════════════════
// 📥 APIs TÉLÉCHARGEMENT
// ═══════════════════════════════════════════════════════════

const DL_APIS = {
  youtube: {
    audio: [
      { url: "https://api.vrfrnd.xyz/api/ytmp3", param: "url" },
      { url: "https://api.agatz.xyz/api/ytmp3", param: "url" },
      { url: "https://aemt.me/download/ytmp3", param: "url" }
    ],
    video: [
      { url: "https://api.vrfrnd.xyz/api/ytmp4", param: "url" },
      { url: "https://api.agatz.xyz/api/ytmp4", param: "url" },
      { url: "https://aemt.me/download/ytmp4", param: "url" }
    ],
    search: [
      { url: "https://api.vrfrnd.xyz/api/ytsearch", param: "query" },
      { url: "https://api.agatz.xyz/api/ytsearch", param: "query" }
    ]
  },
  tiktok: [
    { url: "https://api.vrfrnd.xyz/api/tiktok", param: "url" },
    { url: "https://api.agatz.xyz/api/tiktok", param: "url" },
    { url: "https://aemt.me/download/tiktok", param: "url" }
  ],
  facebook: [
    { url: "https://api.vrfrnd.xyz/api/fbvideo", param: "url" },
    { url: "https://api.agatz.xyz/api/fbdown", param: "url" }
  ],
  instagram: [
    { url: "https://api.vrfrnd.xyz/api/igdownload", param: "url" },
    { url: "https://api.agatz.xyz/api/igdownload", param: "url" }
  ],
  twitter: [
    { url: "https://api.vrfrnd.xyz/api/twitter", param: "url" },
    { url: "https://api.agatz.xyz/api/twitter", param: "url" }
  ]
};

async function downloadMedia(platform, url, type = 'video') {
  let apis;
  
  if (platform === 'youtube') {
    apis = type === 'audio' ? DL_APIS.youtube.audio : DL_APIS.youtube.video;
  } else {
    apis = DL_APIS[platform] || [];
  }
  
  for (const api of apis) {
    try {
      const apiUrl = `${api.url}?${api.param}=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl, { timeout: TIMEOUT });
      
      if (response.data) {
        const data = response.data.data || response.data;
        const downloadUrl = data.download || data.url || data.video || data.audio || data.mp4 || data.mp3;
        
        if (downloadUrl) {
          return {
            success: true,
            url: downloadUrl,
            title: data.title || "Sans titre",
            thumbnail: data.thumbnail || data.thumb,
            duration: data.duration,
            api: api.url
          };
        }
      }
    } catch (e) {
      console.log(`[DL] ⚠️ ${api.url} échoué: ${e.message}`);
      continue;
    }
  }
  
  return { success: false, error: "Toutes les APIs de téléchargement ont échoué" };
}

async function searchYoutube(query) {
  for (const api of DL_APIS.youtube.search) {
    try {
      const url = `${api.url}?${api.param}=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 15000 });
      
      if (response.data?.data || response.data?.result) {
        return {
          success: true,
          results: response.data.data || response.data.result
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { success: false, results: [] };
}

async function ytdl(query, format = "audio") {
  // Vérifier si c'est une URL ou une recherche
  const isUrl = query.includes("youtube.com") || query.includes("youtu.be");
  
  let videoUrl = query;
  let title = "Sans titre";
  let thumbnail = "";
  
  // Si ce n'est pas une URL, chercher d'abord
  if (!isUrl) {
    const searchResult = await searchYoutube(query);
    if (searchResult.success && searchResult.results?.[0]) {
      const video = searchResult.results[0];
      videoUrl = video.url || video.videoUrl;
      title = video.title || title;
      thumbnail = video.thumbnail || video.thumb;
    } else {
      return { status: false, message: "Aucun résultat trouvé" };
    }
  }
  
  // Télécharger
  const result = await downloadMedia('youtube', videoUrl, format);
  
  if (result.success) {
    return {
      status: true,
      data: [{
        title: result.title || title,
        thumbnail: result.thumbnail || thumbnail,
        duration: result.duration,
        url: result.url
      }]
    };
  }
  
  return { status: false, message: result.error };
}

async function ttdl(url) {
  const result = await downloadMedia('tiktok', url);
  return result.success ? { status: true, data: result } : { status: false, message: result.error };
}

async function fbdl(url) {
  const result = await downloadMedia('facebook', url);
  return result.success ? { status: true, data: result } : { status: false, message: result.error };
}

async function igdl(url) {
  const result = await downloadMedia('instagram', url);
  return result.success ? { status: true, data: result } : { status: false, message: result.error };
}

async function twitterdl(url) {
  const result = await downloadMedia('twitter', url);
  return result.success ? { status: true, data: result } : { status: false, message: result.error };
}

// ═══════════════════════════════════════════════════════════
// 🔍 APIs RECHERCHE
// ═══════════════════════════════════════════════════════════

async function googleSearch(query) {
  const apis = [
    `https://api.vrfrnd.xyz/api/google?query=${encodeURIComponent(query)}`,
    `https://api.agatz.xyz/api/google?q=${encodeURIComponent(query)}`
  ];
  
  for (const url of apis) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      if (response.data?.data || response.data?.result) {
        return { success: true, results: response.data.data || response.data.result };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { success: false, results: [] };
}

async function imageSearch(query) {
  const apis = [
    `https://api.vrfrnd.xyz/api/gimage?query=${encodeURIComponent(query)}`,
    `https://api.agatz.xyz/api/gimage?q=${encodeURIComponent(query)}`
  ];
  
  for (const url of apis) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      if (response.data?.data || response.data?.result) {
        return { success: true, images: response.data.data || response.data.result };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { success: false, images: [] };
}

// ═══════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // IA
  callAI,
  askGPT,
  askGemini,
  generateImage,
  
  // Téléchargement
  downloadMedia,
  searchYoutube,
  ytdl,
  ttdl,
  fbdl,
  igdl,
  twitterdl,
  
  // Recherche
  googleSearch,
  imageSearch,
  
  // Config
  AI_APIS,
  DL_APIS,
  TIMEOUT
};

console.log("[API] ✅ Module API avec fallback chargé");
