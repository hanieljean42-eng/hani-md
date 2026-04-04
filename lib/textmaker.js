/**
 * ═══════════════════════════════════════════════════════════
 * 🎨 HANI-MD - Text Maker
 * ═══════════════════════════════════════════════════════════
 * Création d'images avec du texte via APIs
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const axios = require("axios");

// Génération via Pollinations.ai (IA gratuite, sans clé)
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

// Liste des effets disponibles
const EFFECTS = {
  // Effets de feu
  fire: { name: "Fire Text", endpoint: "/fire" },
  burn: { name: "Burning Text", endpoint: "/burn" },
  flame: { name: "Flame Text", endpoint: "/flame" },
  lava: { name: "Lava Text", endpoint: "/lava" },
  
  // Effets de glace
  ice: { name: "Ice Text", endpoint: "/ice" },
  frozen: { name: "Frozen Text", endpoint: "/frozen" },
  snow: { name: "Snow Text", endpoint: "/snow" },
  
  // Effets lumineux
  neon: { name: "Neon Glow", endpoint: "/neon" },
  glow: { name: "Glowing Text", endpoint: "/glow" },
  light: { name: "Light Text", endpoint: "/light" },
  electric: { name: "Electric Text", endpoint: "/electric" },
  thunder: { name: "Thunder Text", endpoint: "/thunder" },
  
  // Effets métalliques
  gold: { name: "Gold Text", endpoint: "/gold" },
  silver: { name: "Silver Text", endpoint: "/silver" },
  chrome: { name: "Chrome Text", endpoint: "/chrome" },
  metal: { name: "Metal Text", endpoint: "/metal" },
  diamond: { name: "Diamond Text", endpoint: "/diamond" },
  
  // Effets 3D
  "3d": { name: "3D Text", endpoint: "/3d" },
  "3d-stone": { name: "3D Stone", endpoint: "/3d-stone" },
  "3d-gradient": { name: "3D Gradient", endpoint: "/3d-gradient" },
  
  // Effets gaming
  gaming: { name: "Gaming Text", endpoint: "/gaming" },
  pubg: { name: "PUBG Style", endpoint: "/pubg" },
  freefire: { name: "Free Fire Style", endpoint: "/freefire" },
  fortnite: { name: "Fortnite Style", endpoint: "/fortnite" },
  minecraft: { name: "Minecraft Style", endpoint: "/minecraft" },
  
  // Effets graffiti
  graffiti: { name: "Graffiti", endpoint: "/graffiti" },
  spray: { name: "Spray Paint", endpoint: "/spray" },
  urban: { name: "Urban Text", endpoint: "/urban" },
  
  // Effets nature
  water: { name: "Water Text", endpoint: "/water" },
  grass: { name: "Grass Text", endpoint: "/grass" },
  wood: { name: "Wood Text", endpoint: "/wood" },
  stone: { name: "Stone Text", endpoint: "/stone" },
  
  // Effets spéciaux
  blood: { name: "Blood Text", endpoint: "/blood" },
  horror: { name: "Horror Text", endpoint: "/horror" },
  galaxy: { name: "Galaxy Text", endpoint: "/galaxy" },
  space: { name: "Space Text", endpoint: "/space" },
  matrix: { name: "Matrix Text", endpoint: "/matrix" },
  glitch: { name: "Glitch Text", endpoint: "/glitch" },
  
  // Effets style
  romantic: { name: "Romantic Text", endpoint: "/romantic" },
  love: { name: "Love Text", endpoint: "/love" },
  birthday: { name: "Birthday Text", endpoint: "/birthday" },
  christmas: { name: "Christmas Text", endpoint: "/christmas" },
  halloween: { name: "Halloween Text", endpoint: "/halloween" }
};

/**
 * Créer une image avec du texte
 * @param {string} effect - Nom de l'effet
 * @param {string} text - Texte à afficher
 * @returns {Promise<Buffer>} - Image en buffer
 */
// Prompts par effet pour Pollinations.ai
const EFFECT_PROMPTS = {
  fire: "fire text effect, glowing flames",
  burn: "burning text, fire and smoke",
  flame: "flame text effect, orange glow",
  lava: "lava molten text effect, red hot",
  ice: "ice crystal text effect, frozen",
  frozen: "frozen ice text, cold blue",
  snow: "snow text effect, winter white",
  neon: "neon glow text effect, cyberpunk",
  glow: "glowing text, bright light",
  light: "light beam text effect",
  electric: "electric lightning text effect",
  thunder: "thunder storm text effect",
  gold: "golden metallic text, luxury",
  silver: "silver chrome text effect",
  chrome: "chrome metallic text",
  metal: "metal steel text effect",
  diamond: "diamond gem text, sparkles",
  "3d": "3D text effect, dramatic shadows",
  "3d-stone": "3D stone carved text",
  "3d-gradient": "3D gradient text effect",
  gaming: "gaming e-sports text logo",
  pubg: "PUBG style text logo",
  freefire: "Free Fire style text",
  fortnite: "Fortnite style text logo",
  minecraft: "Minecraft pixel text",
  graffiti: "graffiti spray paint text",
  spray: "spray paint text art",
  urban: "urban street art text",
  water: "water wave text effect",
  grass: "grass nature text effect",
  wood: "wood carved text",
  stone: "stone rock text effect",
  blood: "blood drip text effect, horror",
  horror: "horror scary text effect",
  galaxy: "galaxy space text effect",
  space: "space cosmic text effect",
  matrix: "matrix green digital text",
  glitch: "glitch digital text effect",
  romantic: "romantic love text, roses",
  love: "love heart text effect",
  birthday: "birthday celebration text",
  christmas: "christmas festive text",
  halloween: "halloween spooky text"
};

async function createTextImage(effect, text) {
  const effectConfig = EFFECTS[effect.toLowerCase()];
  
  if (!effectConfig) {
    throw new Error(`Effet non trouvé: ${effect}. Utilisez .textmaker list pour voir les effets disponibles.`);
  }
  
  const stylePrompt = EFFECT_PROMPTS[effect.toLowerCase()] || `${effect} text effect`;
  const fullPrompt = `${stylePrompt}, text reads "${text}", high quality logo, black background`;
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(fullPrompt)}?nologo=true&width=768&height=512&seed=${Math.floor(Math.random()*99999)}`;
  
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 45000 });
  
  if (!response.data || response.data.length < 1000) {
    throw new Error("Image non générée");
  }
  
  return Buffer.from(response.data);
}

/**
 * Obtenir la liste des effets disponibles
 * @returns {Object} - Liste des effets
 */
function getEffects() {
  return EFFECTS;
}

/**
 * Obtenir la liste formatée des effets
 * @returns {string} - Liste formatée
 */
function getEffectsList() {
  let list = "🎨 *Effets TextMaker disponibles:*\n\n";
  
  const categories = {
    "🔥 Feu": ["fire", "burn", "flame", "lava"],
    "❄️ Glace": ["ice", "frozen", "snow"],
    "💡 Lumineux": ["neon", "glow", "light", "electric", "thunder"],
    "🥇 Métalliques": ["gold", "silver", "chrome", "metal", "diamond"],
    "📐 3D": ["3d", "3d-stone", "3d-gradient"],
    "🎮 Gaming": ["gaming", "pubg", "freefire", "fortnite", "minecraft"],
    "🎨 Graffiti": ["graffiti", "spray", "urban"],
    "🌿 Nature": ["water", "grass", "wood", "stone"],
    "✨ Spéciaux": ["blood", "horror", "galaxy", "space", "matrix", "glitch"],
    "💖 Style": ["romantic", "love", "birthday", "christmas", "halloween"]
  };
  
  for (const [category, effects] of Object.entries(categories)) {
    list += `${category}\n`;
    for (const effect of effects) {
      if (EFFECTS[effect]) {
        list += `  • ${effect} - ${EFFECTS[effect].name}\n`;
      }
    }
    list += "\n";
  }
  
  list += "💡 Utilisation: .textmaker [effet] [texte]";
  
  return list;
}

/**
 * Vérifier si un effet existe
 * @param {string} effect - Nom de l'effet
 * @returns {boolean}
 */
function effectExists(effect) {
  return EFFECTS.hasOwnProperty(effect.toLowerCase());
}

module.exports = {
  createTextImage,
  getEffects,
  getEffectsList,
  effectExists,
  EFFECTS
};

console.log("[LIB] ✅ TextMaker chargé");
