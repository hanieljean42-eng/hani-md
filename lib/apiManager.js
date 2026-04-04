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

// ─── IA via Gemini (à la place des APIs mortes) ───────────────────────────────────────────
async function _geminiCall(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY manquante');
  const GenAI = require('@google/generative-ai');
  const genAI = new GenAI.GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callAI(type, query) {
  try {
    if (type === 'dalle') {
      // Image via Pollinations.ai (gratuit, sans clé)
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?nologo=true&width=768&height=768&seed=${Math.floor(Math.random()*99999)}`;
      return { success: true, result: imageUrl, api: 'pollinations.ai' };
    }
    const text = await _geminiCall(query);
    return { success: true, result: text, api: 'gemini-1.5-flash' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function askGPT(query) { return callAI('gpt', query); }
async function askGemini(query) { return callAI('gemini', query); }
async function generateImage(prompt) { return callAI('dalle', prompt); }

// ═══════════════════════════════════════════════════════════
// 📥 APIs TÉLÉCHARGEMENT
// ═══════════════════════════════════════════════════════════

// ─── Téléchargements via lib/dl.js (play-dl + tikwm) ─────────────────────────────────
const dl = require('./dl');

async function downloadMedia(platform, url, type = 'video') {
  try {
    if (platform === 'youtube') {
      const r = await dl.ytdl(url, type);
      if (r.status && r.data?.[0]) return { success: true, ...r.data[0] };
      return { success: false, error: r.message };
    }
    if (platform === 'tiktok') {
      const r = await dl.ttdl(url);
      if (r) return { success: true, url: r.video, title: r.title || 'TikTok' };
      return { success: false, error: 'Impossible' };
    }
    if (platform === 'facebook') {
      const r = await dl.fbdl(url);
      if (r && !r.startsWith('Erreur')) return { success: true, url: r };
      return { success: false, error: r };
    }
    if (platform === 'instagram') {
      const r = await dl.igdl(url);
      if (r && r.length > 0) return { success: true, url: r[0].url };
      return { success: false, error: 'Impossible' };
    }
    if (platform === 'twitter') {
      const r = await dl.twitterdl(url);
      if (r) return { success: true, url: r.video || r.image };
      return { success: false, error: 'Impossible' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
  return { success: false, error: 'Plateforme non supportée' };
}

async function searchYoutube(query) {
  try {
    const results = await dl.ytSearch(query);
    return results?.length > 0 ? { success: true, results } : { success: false, results: [] };
  } catch(e) { return { success: false, results: [] }; }
}

async function ytdl(query, format = 'audio') { return dl.ytdl(query, format); }
async function ttdl(url) { return dl.ttdl(url); }
async function fbdl(url) { return dl.fbdl(url); }
async function igdl(url) { return dl.igdl(url); }
async function twitterdl(url) { return dl.twitterdl(url); }

// ═══════════════════════════════════════════════════════════
// 🔍 APIs RECHERCHE
// ═══════════════════════════════════════════════════════════

function googleSearch(query) {
  // Lien direct Google (pas d'API gratuite fiable disponible)
  return Promise.resolve({ success: true, results: [], googleUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
}

function imageSearch(query) {
  // Pollinations.ai pour la génération d'images
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?nologo=true&width=512&height=512`;
  return Promise.resolve({ success: true, images: [imageUrl] });
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
