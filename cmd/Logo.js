/**
 * ═══════════════════════════════════════════════════════════
 * 🎨 HANI-MD - Création de Logos
 * ═══════════════════════════════════════════════════════════
 * Génération de logos et textes stylisés
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// Fonction utilitaire pour créer des logos via API
async function createLogo(ovl, msg, ms, repondre, style, text) {
  try {
    if (!text) {
      return repondre(`❌ Utilisation: .${style} [texte]`);
    }

    await repondre(`🎨 Création du logo ${style}...`);

    // API TextMaker/Ephoto360
    const apiUrl = `https://api.vrfrnd.xyz/api/textpro?style=${style}&text=${encodeURIComponent(text)}`;
    
    try {
      const response = await axios.get(apiUrl, { timeout: 30000 });
      
      if (response.data && response.data.result) {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: { url: response.data.result },
          caption: `🎨 *Logo ${style.toUpperCase()}*\n\n📝 Texte: ${text}\n\n✨ Powered by HANI-MD`
        }, { quoted: ms });
        return;
      }
    } catch (e) {}

    repondre("❌ Impossible de créer ce logo. Réessayez plus tard.");

  } catch (error) {
    console.error(`[LOGO-${style}]`, error);
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

✨ Powered by HANI-MD`;

    repondre(list);
  }
);

console.log("[CMD] ✅ Logo.js chargé - Commandes: fire, ice, thunder, neon, gaming, diamond, 3dlogo, galaxy, blood, gold, graffiti, water, medieval, dark, logolist");
