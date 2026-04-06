/**
 * ═══════════════════════════════════════════════════════════
 * 🎭 HANI-MD - Commandes Prank & Fun Effects
 * ═══════════════════════════════════════════════════════════
 * Modifier/supprimer messages, pluie de coeurs, effets troll
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");

// Helper : pause
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Helper : récupérer le message cité
function getQuotedInfo(msg) {
  const msgType = Object.keys(msg.message || {})[0];
  const ctx =
    msg.message?.[msgType]?.contextInfo ||
    msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage || !ctx?.stanzaId) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe:    ctx.participant === undefined ? false : false,
      id:        ctx.stanzaId,
      participant: ctx.participant || undefined,
    },
    senderName: ctx.pushName || (ctx.participant || "").split("@")[0].split(":")[0],
    senderJid:  ctx.participant || ctx.remoteJid || msg.key.remoteJid,
    text: Object.values(ctx.quotedMessage || {})[0]?.text ||
          Object.values(ctx.quotedMessage || {})[0]?.caption || "",
  };
}

// ═══════════════════════════════════════════════════════════
// ✏️ FAKE EDIT — Modifier le message d'une personne (blague)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "fakeedit",
    classe: "🎭 Prank",
    react: "✏️",
    desc: "Réponds à un message + mets le nouveau texte → supprime l'original et renvoie version modifiée (bot admin requis en groupe)",
    alias: ["editmsg", "modifmsg", "fakedit"]
  },
  async (ovl, msg, { arg, repondre, from, superUser }) => {
    const newText = arg.join(" ").trim();
    if (!newText) {
      return repondre("❌ *Usage:* Réponds à un message avec `.fakeedit [nouveau texte]`\n\nEx: `.fakeedit J'adore les choux-fleurs 🥦`");
    }

    const quoted = getQuotedInfo(msg);
    if (!quoted) {
      return repondre("❌ Tu dois *répondre* à un message pour l'utiliser.");
    }

    try {
      // 1. Supprimer le message original
      await ovl.sendMessage(from, { delete: quoted.key });
    } catch (e) {
      console.log("[FAKEEDIT] Suppression échouée (bot pas admin?):", e.message);
    }

    // 2. Petit délai pour que ça semble naturel
    await sleep(700);

    // 3. Renvoyer la version "modifiée" comme si c'était la personne
    const fakeMsg =
      `✏️ _(message modifié)_\n\n` +
      `👤 *${quoted.senderName}:*\n` +
      `"${newText}"`;

    await ovl.sendMessage(from, { text: fakeMsg });
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ DELETE FANTÔME — Supprimer le message sans laisser de trace
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delmsg",
    classe: "🎭 Prank",
    react: "👻",
    desc: "Réponds à un message → le supprime pour tous (bot admin requis)",
    alias: ["deletemsg", "supprimer", "ghostdelete"]
  },
  async (ovl, msg, { repondre, from, superUser }) => {
    const quoted = getQuotedInfo(msg);
    if (!quoted) {
      return repondre("❌ Tu dois *répondre* à un message pour le supprimer.");
    }

    try {
      await ovl.sendMessage(from, { delete: quoted.key });
      repondre("👻 *Message supprimé!*\nLa personne croit que son téléphone a bugué 😈");
    } catch (e) {
      repondre(`❌ Échec — le bot doit être *admin* du groupe.\nErreur: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔀 GLITCH — Texte bugué pour faire croire à une erreur
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "glitch",
    classe: "🎭 Prank",
    react: "🔀",
    desc: "Envoie un message en texte glitché (fait croire à un bug d'écran)",
    alias: ["bug", "bugtext", "glitchtext"]
  },
  async (ovl, msg, { arg, repondre, from }) => {
    const text = arg.join(" ").trim() || "Ton téléphone bug";

    const glitchChars = ["̴", "̵", "̶", "̷", "̸", "̡", "̢", "̧", "̨", "͜", "͝", "͞", "͟"];
    function glitchify(str) {
      return str.split("").map(c => {
        const n = Math.floor(Math.random() * 3);
        let res = c;
        for (let i = 0; i < n; i++) res += glitchChars[Math.floor(Math.random() * glitchChars.length)];
        return res;
      }).join("");
    }

    const lines = [
      `⚠️ *ERREUR SYSTÈME*`,
      ``,
      `${glitchify(text)}`,
      ``,
      `E R R : 0 x F F 4 2 _ C O R R U P T`,
      `${glitchify("KERNEL PANIC — reboot en cours...")}`,
      `▓▓▓▓▓▓▓▓░░ 83%`,
    ];

    await ovl.sendMessage(from, { text: lines.join("\n") });
  }
);

// ═══════════════════════════════════════════════════════════
// ❤️ PLUIE DE CŒURS — Cascade animée de cœurs
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "coeurs",
    classe: "🎭 Prank",
    react: "❤️",
    desc: "Envoie une pluie de cœurs animée",
    alias: ["heartrain", "hearts", "coeur", "lovebomb"]
  },
  async (ovl, msg, { arg, repondre, from }) => {
    const targetJid = arg[0]
      ? (arg[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net")
      : from;

    const frames = [
      "❤️",
      "❤️  💕",
      "❤️  💕  🧡",
      "💛  ❤️  💚  💕",
      "💜  💛  ❤️  💚  💙",
      "💗  💜  💛  ❤️  💚  💙  🤍",
      "❤️💕💛💙💚💜🧡💗🤍❤️",
      "💘💝💖💗💓💞💕💟❣️❤️",
      "❤️‍🔥 ❤️ 💕 💖 💗 💓 💞 💝 💘",
      "",
      "      ❤️       ❤️",
      "   ❤️    ❤️  ❤️    ❤️",
      " ❤️ 💕 💛 💙 💚 💜 🧡 💗 ❤️",
      "  ❤️    💕    💛    💙  ❤️",
      "    ❤️       💕       ❤️",
      "       ❤️       ❤️",
      "          💕",
      "",
      "❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️",
    ];

    for (const frame of frames) {
      if (frame.trim()) {
        await ovl.sendMessage(targetJid, { text: frame });
        await sleep(400);
      }
    }

    await ovl.sendMessage(targetJid, {
      text: "❤️ *PLUIE DE CŒURS POUR TOI* ❤️\n\n💕 Tu mérites tout l'amour du monde 💕"
    });
  }
);

// ═══════════════════════════════════════════════════════════
// 🌧️ PLUIE D'EMOJIS — Cascades personnalisables
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "pluie",
    classe: "🎭 Prank",
    react: "🌧️",
    desc: "Pluie d'emojis personnalisée. Usage: .pluie [emoji] [quantité?]",
    alias: ["emojirain", "rain", "cascade"]
  },
  async (ovl, msg, { arg, repondre, from }) => {
    const emoji = arg[0] || "⭐";
    const count = Math.min(parseInt(arg[1]) || 8, 15);

    if (!arg[0]) {
      return repondre(
        "🌧️ *Pluie d'emojis*\n\n" +
        "Usage: `.pluie [emoji] [quantité]`\n\n" +
        "Exemples:\n" +
        "• `.pluie ⭐ 10` — pluie d'étoiles\n" +
        "• `.pluie 🔥 8` — pluie de feu\n" +
        "• `.pluie 💰` — pluie d'argent\n" +
        "• `.pluie 😂` — pluie de rires"
      );
    }

    for (let i = 1; i <= count; i++) {
      const line = emoji.repeat(i);
      await ovl.sendMessage(from, { text: line });
      await sleep(350);
    }

    for (let i = count - 1; i >= 1; i--) {
      const line = emoji.repeat(i);
      await ovl.sendMessage(from, { text: line });
      await sleep(300);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 😈 TROLL — Séquence troll complète
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "troll",
    classe: "🎭 Prank",
    react: "😈",
    desc: "Envoie une séquence troll à quelqu'un (ou dans le chat)",
    alias: ["trollen", "trollface", "prank"]
  },
  async (ovl, msg, { arg, repondre, from }) => {
    const trollSequences = [
      [
        "Attends...",
        "Attends...",
        "Attends...",
        "Tu savais que...",
        ".......",
        "Non rien 😂😂😂"
      ],
      [
        "URGENT ‼️",
        "Lis bien ce message...",
        "C'est TRÈS important...",
        "......",
        "Tu as été trollé 😈",
        "GG WP 🏆"
      ],
      [
        "Oh non...",
        "Oh non non non...",
        "Ton téléphone...",
        "Il commence à...",
        "BUGER !!!! 😱",
        "Nah je rigole t'es bon 😂"
      ],
      [
        "1...",
        "2...",
        "3...",
        "4...",
        "5...",
        "T'attendais quoi exactement ? 😂"
      ],
      [
        "Psst...",
        "Viens voir...",
        "Plus près...",
        "Encore plus près...",
        "😂😂😂 T'as cru quoi ??"
      ]
    ];

    const seq = trollSequences[Math.floor(Math.random() * trollSequences.length)];
    for (const line of seq) {
      await ovl.sendMessage(from, { text: line });
      await sleep(1200);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💬 FAKE TYPING — Faire croire que le bot écrit pendant longtemps
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "faketyping",
    classe: "🎭 Prank",
    react: "⌨️",
    desc: "Le bot montre \"en train d'écrire...\" pendant X secondes puis envoie un message inattendu",
    alias: ["typing", "ecrire", "faketype"]
  },
  async (ovl, msg, { arg, repondre, from }) => {
    const duration = Math.min(parseInt(arg[0]) || 5, 15);

    const endMessages = [
      "...",
      "J'ai oublié ce que je voulais dire 😅",
      "Non rien c'est bon",
      "Oops mauvais chat 😂",
      "J'ai failli dire quelque chose d'important mais non",
      "🤐",
      "...\n\nNah je te trollais 😈",
      "Bon j'abandonne"
    ];

    try {
      await ovl.sendPresenceUpdate("composing", from);
      await sleep(duration * 1000);
      await ovl.sendPresenceUpdate("paused", from);
    } catch (e) {}

    const endMsg = endMessages[Math.floor(Math.random() * endMessages.length)];
    await ovl.sendMessage(from, { text: endMsg });
  }
);

// ═══════════════════════════════════════════════════════════
// 🔁 FAKE FORWARD — Renvoyer un message attribué à quelqu'un d'autre
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "fakeforward",
    classe: "🎭 Prank",
    react: "🔁",
    desc: "Réponds à un message → le renvoie en faisant croire que c'est un transfert d'un autre contact",
    alias: ["faketransfer", "fakefwd"]
  },
  async (ovl, msg, { arg, repondre, from }) => {
    const fakeName = arg.join(" ").trim() || "Inconnu";
    const quoted = getQuotedInfo(msg);

    if (!quoted) {
      return repondre("❌ Tu dois *répondre* à un message.\n\nUsage: `.fakeforward [Faux nom]`");
    }

    const originalText = quoted.text || "(média)";

    const fakeMsg =
      `📨 *Transféré de:* ${fakeName}\n` +
      `─────────────────\n` +
      `${originalText}`;

    await ovl.sendMessage(from, {
      text: fakeMsg,
      contextInfo: { isForwarded: true, forwardingScore: 5 }
    });
  }
);

console.log("[CMD] ✅ Prank.js chargé — fakeedit, delmsg, glitch, coeurs, pluie, troll, faketyping, fakeforward");
