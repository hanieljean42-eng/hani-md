/**
 * ═══════════════════════════════════════════════════════════
 * 🎨 HANI-MD - Création de Logos
 * ═══════════════════════════════════════════════════════════
 * Génération de logos et textes stylisés via TextPro.me
 * Version corrigée avec scraping TextPro.me
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// URLs TextPro.me pour chaque style (IDs des effets réels)
const TEXTPRO_EFFECTS = {
  fire: "https://textpro.me/create-realistic-3d-fire-text-effect-online-1091.html",
  ice: "https://textpro.me/ice-cold-text-effect-833.html",
  thunder: "https://textpro.me/create-3d-thunder-text-effects-online-1147.html",
  neon: "https://textpro.me/neon-light-text-effect-online-882.html",
  gaming: "https://textpro.me/create-e-sports-style-3d-text-effects-1136.html",
  diamond: "https://textpro.me/3d-diamond-text-effect-online-884.html",
  "3d": "https://textpro.me/create-3d-metallic-text-effect-1116.html",
  galaxy: "https://textpro.me/galaxy-style-free-logo-maker-online-1085.html",
  blood: "https://textpro.me/blood-text-effect-online-999.html",
  gold: "https://textpro.me/create-golden-3d-text-effect-online-1111.html",
  graffiti: "https://textpro.me/graffiti-art-text-logo-banner-online-1107.html",
  water: "https://textpro.me/create-a-water-text-effect-online-free-1138.html",
  marvel: "https://textpro.me/create-3d-marvel-text-effect-online-1043.html",
  blackpink: "https://textpro.me/create-a-mystical-neon-blackpink-logo-text-effect-1180.html",
  naruto: "https://textpro.me/create-naruto-logo-style-text-effect-online-1125.html",
  pokemon: "https://textpro.me/create-pokemon-logo-style-text-effect-online-1134.html",
  matrix: "https://textpro.me/matrix-style-text-effect-online-884.html",
  chrome: "https://textpro.me/glossy-metallic-chrome-3d-text-effect-1185.html",
  hologram: "https://textpro.me/stunning-3d-hologram-metallic-text-effect-1189.html",
  candy: "https://textpro.me/online-cute-3d-candy-text-effect-generator-1192.html"
};

// APIs alternatives gratuites pour les logos
const LOGO_API_PROVIDERS = [
  // API 1 - BotCahx (fiable)
  {
    name: "BotCahx",
    makeUrl: (style, text) => `https://api.botcahx.eu.org/api/textpro/${style}?text=${encodeURIComponent(text)}&apikey=Admin`
  },
  // API 2 - ZenzAPI
  {
    name: "ZenzAPI", 
    makeUrl: (style, text) => `https://api.zenkey.my.id/api/textpro/${style}?text=${encodeURIComponent(text)}`
  },
  // API 3 - Neoxr
  {
    name: "Neoxr",
    makeUrl: (style, text) => `https://api.neoxr.eu/api/textpro/${style}?text=${encodeURIComponent(text)}&apikey=brrohT_FREE`
  },
  // API 4 - Simple maker (fallback)
  {
    name: "SimpleMaker",
    makeUrl: (style, text) => `https://some-random-api.com/canvas/misc/${style}?text=${encodeURIComponent(text)}`
  }
];

// Mapping des styles avec variations
const STYLE_VARIANTS = {
  fire: ["fire", "burning", "fire-text", "flame"],
  ice: ["ice", "frozen", "ice-cold", "winter"],
  thunder: ["thunder", "lightning", "electric", "storm"],
  neon: ["neon", "neon-light", "neon-glow", "glow"],
  gaming: ["gaming", "game", "esport", "gamer"],
  diamond: ["diamond", "gem", "crystal", "diamond-3d"],
  "3d": ["3d", "3d-text", "metallic-3d", "metallic"],
  galaxy: ["galaxy", "space", "cosmos", "star"],
  blood: ["blood", "horror", "bloody", "scary"],
  gold: ["gold", "golden", "luxury", "gold-3d"],
  graffiti: ["graffiti", "street", "spray", "urban"],
  water: ["water", "aqua", "ocean", "wave"],
  marvel: ["marvel", "avengers", "superhero"],
  blackpink: ["blackpink", "kpop", "bp"],
  naruto: ["naruto", "anime", "ninja"],
  pokemon: ["pokemon", "pikachu", "poke"],
  matrix: ["matrix", "hacker", "code"],
  chrome: ["chrome", "metal", "silver"],
  hologram: ["hologram", "holo", "holographic"],
  candy: ["candy", "sweet", "cute"]
};

// Fonction utilitaire pour créer des logos via API
async function createLogo(ovl, msg, ms, repondre, style, text) {
  try {
    if (!text || text.trim() === "") {
      return repondre(`❌ Utilisation: .${style} [texte]\n\nExemple: .${style} MonNom`);
    }

    await repondre(`🎨 Création du logo "${style}" pour: ${text}...`);
    console.log(`[LOGO] Création ${style}: "${text}"`);

    const variants = STYLE_VARIANTS[style] || [style];
    let imageBuffer = null;
    let successApi = null;

    // Essayer toutes les APIs avec fallback
    for (const provider of LOGO_API_PROVIDERS) {
      if (imageBuffer) break;
      
      for (const variant of variants) {
        try {
          const apiUrl = provider.makeUrl(variant, text);
          console.log(`[LOGO] Essai ${provider.name}: ${variant}`);
          
          const response = await axios.get(apiUrl, { 
            timeout: 25000,
            responseType: 'arraybuffer',
            headers: {
              'Accept': 'image/*,application/json,*/*',
              'User-Agent': 'Mozilla/5.0 HANI-MD Bot/2.6.0'
            },
            validateStatus: (status) => status < 500
          });
          
          if (response.status !== 200) continue;
          
          const contentType = response.headers['content-type'] || '';
          
          // C'est directement une image
          if (contentType.includes('image')) {
            imageBuffer = Buffer.from(response.data);
            successApi = provider.name;
            console.log(`[LOGO] ✅ Succès avec ${provider.name} (image directe)`);
            break;
          }
          
          // C'est du JSON avec URL d'image
          if (contentType.includes('json')) {
            try {
              const jsonData = JSON.parse(response.data.toString());
              const imageUrl = jsonData.result || jsonData.url || jsonData.image || jsonData.data?.url || jsonData.data?.result;
              
              if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
                console.log(`[LOGO] JSON reçu, téléchargement depuis: ${imageUrl.substring(0, 50)}...`);
                const imgResponse = await axios.get(imageUrl, { 
                  responseType: 'arraybuffer',
                  timeout: 20000,
                  headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (imgResponse.data && imgResponse.data.length > 1000) {
                  imageBuffer = Buffer.from(imgResponse.data);
                  successApi = provider.name;
                  console.log(`[LOGO] ✅ Succès avec ${provider.name} (via JSON)`);
                  break;
                }
              }
            } catch (parseErr) {
              console.log(`[LOGO] Erreur parsing JSON: ${parseErr.message}`);
            }
          }
        } catch (e) {
          console.log(`[LOGO] ${provider.name}/${variant} échoué: ${e.message}`);
        }
      }
    }

    if (imageBuffer && imageBuffer.length > 1000) {
      await ovl.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        mimetype: 'image/png',
        caption: `🎨 *Logo ${style.toUpperCase()}*\n\n📝 Texte: ${text}\n🔧 API: ${successApi}\n\n✨ Powered by HANI-MD`
      }, { quoted: ms });
      console.log(`[LOGO] ✅ Envoyé: ${style} - ${text}`);
      return;
    }

    // Aucune API n'a fonctionné
    console.log(`[LOGO] ❌ Toutes les APIs ont échoué pour ${style}`);
    repondre(`❌ Le service de création de logo "${style}" est temporairement indisponible.\n\n💡 Essayez:\n• .neon ${text}\n• .gold ${text}\n• .gaming ${text}\n• .3dlogo ${text}`);

  } catch (error) {
    console.error(`[LOGO-${style}] Erreur:`, error.message);
    repondre(`❌ Erreur: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 🔥 LOGO FEU
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "fire",
    classe: "Logo",
    react: "🔥",
    desc: "Logo style feu",
    alias: ["firelogo", "flame"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "fire", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// ❄️ LOGO GLACE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ice",
    classe: "Logo",
    react: "❄️",
    desc: "Logo style glace/frozen",
    alias: ["frozen", "icelogo"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "ice", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// ⚡ LOGO THUNDER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "thunder",
    classe: "Logo",
    react: "⚡",
    desc: "Logo style électrique",
    alias: ["electric", "lightning"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "thunder", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🌈 LOGO NEON
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "neon",
    classe: "Logo",
    react: "🌈",
    desc: "Logo style néon",
    alias: ["neonlogo", "glow"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "neon", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🎮 LOGO GAMING
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "gaming",
    classe: "Logo",
    react: "🎮",
    desc: "Logo style gaming",
    alias: ["game", "esport"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "gaming", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 💎 LOGO DIAMANT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "diamond",
    classe: "Logo",
    react: "💎",
    desc: "Logo style diamant",
    alias: ["diamant", "gem"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "diamond", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🌟 LOGO 3D
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "3dlogo",
    classe: "Logo",
    react: "🌟",
    desc: "Logo style 3D",
    alias: ["logo3d", "3dtext"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "3d", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🌌 LOGO GALAXY
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "galaxy",
    classe: "Logo",
    react: "🌌",
    desc: "Logo style galaxie/espace",
    alias: ["space", "cosmos"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "galaxy", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🩸 LOGO BLOOD
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "blood",
    classe: "Logo",
    react: "🩸",
    desc: "Logo style sang/horreur",
    alias: ["horror", "bloody"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "blood", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🥇 LOGO GOLD
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "gold",
    classe: "Logo",
    react: "🥇",
    desc: "Logo style or/doré",
    alias: ["golden", "luxury"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "gold", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🎨 LOGO GRAFFITI
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "graffiti",
    classe: "Logo",
    react: "🎨",
    desc: "Logo style graffiti/street art",
    alias: ["street", "spray"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "graffiti", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🌊 LOGO WATER
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "water",
    classe: "Logo",
    react: "🌊",
    desc: "Logo style eau",
    alias: ["aqua", "ocean"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "water", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 📜 LOGO MÉDIÉVAL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "medieval",
    classe: "Logo",
    react: "📜",
    desc: "Logo style médiéval/ancien",
    alias: ["old", "ancient"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "medieval", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🖤 LOGO DARK
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dark",
    classe: "Logo",
    react: "🖤",
    desc: "Logo style sombre/dark",
    alias: ["darkness", "shadow"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "dark", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🦸 LOGO MARVEL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "marvel",
    classe: "Logo",
    react: "🦸",
    desc: "Logo style Marvel/Avengers",
    alias: ["avengers", "superhero"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "marvel", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 💗 LOGO BLACKPINK
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "blackpink",
    classe: "Logo",
    react: "💗",
    desc: "Logo style Blackpink K-pop",
    alias: ["bp", "kpop"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "blackpink", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🍥 LOGO NARUTO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "naruto",
    classe: "Logo",
    react: "🍥",
    desc: "Logo style Naruto anime",
    alias: ["ninja", "konoha"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "naruto", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// ⚡ LOGO POKEMON
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pokemon",
    classe: "Logo",
    react: "⚡",
    desc: "Logo style Pokemon",
    alias: ["pikachu", "poke"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "pokemon", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 💻 LOGO MATRIX
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "matrix",
    classe: "Logo",
    react: "💻",
    desc: "Logo style Matrix hacker",
    alias: ["hacker", "code"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "matrix", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🪞 LOGO CHROME
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "chrome",
    classe: "Logo",
    react: "🪞",
    desc: "Logo style chrome métallique",
    alias: ["metal", "silver", "metallic"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "chrome", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🌈 LOGO HOLOGRAM
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "hologram",
    classe: "Logo",
    react: "🌈",
    desc: "Logo style hologramme 3D",
    alias: ["holo", "holographic"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "hologram", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🍬 LOGO CANDY
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "candy",
    classe: "Logo",
    react: "🍬",
    desc: "Logo style bonbon mignon",
    alias: ["sweet", "cute"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    await createLogo(ovl, msg, ms, repondre, "candy", arg.join(" "));
  }
);

// ═══════════════════════════════════════════════════════════
// 🎭 LISTE DES LOGOS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "logolist",
    classe: "Logo",
    react: "🎨",
    desc: "Liste des styles de logos disponibles",
    alias: ["logos", "listelogo"]
  },
  async (ovl, msg, { repondre }) => {
    const list = `🎨 *STYLES DE LOGOS DISPONIBLES*

🔥 .fire [texte] - Style feu
❄️ .ice [texte] - Style glace
⚡ .thunder [texte] - Style électrique
🌈 .neon [texte] - Style néon
🎮 .gaming [texte] - Style gaming
💎 .diamond [texte] - Style diamant
🌟 .3dlogo [texte] - Style 3D
🌌 .galaxy [texte] - Style galaxie
🩸 .blood [texte] - Style horreur
🥇 .gold [texte] - Style or
🎨 .graffiti [texte] - Style graffiti
🌊 .water [texte] - Style eau
📜 .medieval [texte] - Style ancien
🖤 .dark [texte] - Style sombre

*NOUVEAUX STYLES:*
🦸 .marvel [texte] - Style Marvel
💗 .blackpink [texte] - Style K-pop
🍥 .naruto [texte] - Style anime
⚡ .pokemon [texte] - Style Pokemon
💻 .matrix [texte] - Style hacker
🪞 .chrome [texte] - Style métallique
🌈 .hologram [texte] - Style hologramme
🍬 .candy [texte] - Style mignon

✨ Powered by HANI-MD`;

    repondre(list);
  }
);

console.log("[CMD] ✅ Logo.js chargé - Commandes: fire, ice, thunder, neon, gaming, diamond, 3dlogo, galaxy, blood, gold, graffiti, water, medieval, dark, marvel, blackpink, naruto, pokemon, matrix, chrome, hologram, candy, logolist");
