/**
 * ═══════════════════════════════════════════════════════════
 * 📊 HANI-MD - Commandes Status
 * ═══════════════════════════════════════════════════════════
 * Gestion des statuts WhatsApp
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

// JID owner — requis dans statusJidList pour que WhatsApp livre le statut
const getOwnerJid = () =>
  (process.env.NUMERO_OWNER || "22550252467").replace(/\D/g, "") + "@s.whatsapp.net";

// ─── Helper: télécharger un média depuis un message complet ou un quotedMessage ─
async function getMediaBuffer(ovl, msg, type) {
  // Cas 1 : image/vidéo/audio directement dans le message (avec .statusimg en légende)
  const directKey = `${type}Message`;
  if (msg.message?.[directKey]) {
    try {
      return await downloadMediaMessage(msg, "buffer", {}, {
        logger: pino({ level: "silent" }),
        reuploadRequest: ovl.updateMediaMessage
      });
    } catch (e) {
      console.error(`[STATUS] Erreur téléchargement direct ${type}:`, e.message);
    }
  }

  // Cas 2 : message cité (réponse à une image/vidéo/audio)
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted?.[directKey]) {
    try {
      const stream = await downloadContentFromMessage(quoted[directKey], type);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch (e) {
      console.error(`[STATUS] Erreur téléchargement quoted ${type}:`, e.message);
    }
  }

  return null;
}

// ─── Config status (autoview / autoreact) ───────────────────────────────────
const statusConfigPath = path.join(__dirname, "../DataBase/status_config.json");

function loadStatusConfig() {
  try {
    if (fs.existsSync(statusConfigPath)) return JSON.parse(fs.readFileSync(statusConfigPath, "utf8"));
  } catch (e) {}
  return { autoView: false, autoReact: false, reactEmoji: "❤️" };
}
function saveStatusConfig(cfg) {
  try { fs.writeFileSync(statusConfigPath, JSON.stringify(cfg, null, 2)); } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
// 📊 POSTER UN STATUT TEXTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statustext",
    classe: "Status",
    react: "📊",
    desc: "Poster un statut texte",
    alias: ["poststatus", "mystatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    const text = arg.join(" ").trim();
    if (!text) return repondre("❌ Utilisation: `.statustext [texte]`\n\nEx: `.statustext Disponible 🟢`");
    try {
      await ovl.sendMessage(
        "status@broadcast",
        { text, backgroundColor: "#1e1e2e", font: 0 },
        { statusJidList: [getOwnerJid()] }
      );
      repondre("✅ Statut texte posté avec succès!");
    } catch (e) {
      console.error("[STATUSTEXT]", e);
      repondre(`❌ Erreur: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📸 POSTER UN STATUT IMAGE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusimg",
    classe: "Status",
    react: "📸",
    desc: "Poster un statut image (envoie une image ou réponds à une image)",
    alias: ["statusimage", "imgstatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    const hasDirectImg  = !!msg.message?.imageMessage;
    const hasQuotedImg  = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!hasDirectImg && !hasQuotedImg) {
      return repondre("❌ Envoie une image avec `.statusimg [légende]` ou réponds à une image.");
    }

    repondre("⏳ Téléchargement en cours...");
    const buffer = await getMediaBuffer(ovl, msg, "image");
    if (!buffer) return repondre("❌ Impossible de télécharger l'image.");

    try {
      const caption = arg.join(" ") || "";
      await ovl.sendMessage(
        "status@broadcast",
        { image: buffer, caption },
        { statusJidList: [getOwnerJid()] }
      );
      repondre("✅ Statut image posté!");
    } catch (e) {
      console.error("[STATUSIMG]", e);
      repondre(`❌ Erreur: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎬 POSTER UN STATUT VIDÉO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusvid",
    classe: "Status",
    react: "🎬",
    desc: "Poster un statut vidéo (envoie une vidéo ou réponds à une vidéo)",
    alias: ["statusvideo", "vidstatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    const hasDirectVid  = !!msg.message?.videoMessage;
    const hasQuotedVid  = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!hasDirectVid && !hasQuotedVid) {
      return repondre("❌ Envoie une vidéo avec `.statusvid [légende]` ou réponds à une vidéo.");
    }

    repondre("⏳ Téléchargement en cours...");
    const buffer = await getMediaBuffer(ovl, msg, "video");
    if (!buffer) return repondre("❌ Impossible de télécharger la vidéo.");

    try {
      const caption = arg.join(" ") || "";
      await ovl.sendMessage(
        "status@broadcast",
        { video: buffer, caption },
        { statusJidList: [getOwnerJid()] }
      );
      repondre("✅ Statut vidéo posté!");
    } catch (e) {
      console.error("[STATUSVID]", e);
      repondre(`❌ Erreur: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 POSTER UN STATUT AUDIO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusaudio",
    classe: "Status",
    react: "🎵",
    desc: "Poster un statut audio (envoie un audio ou réponds à un audio)",
    alias: ["audiostatus", "statusmusic"]
  },
  async (ovl, msg, { repondre }) => {
    const hasDirectAudio = !!msg.message?.audioMessage;
    const hasQuotedAudio = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;

    if (!hasDirectAudio && !hasQuotedAudio) {
      return repondre("❌ Envoie un audio avec `.statusaudio` ou réponds à un audio.");
    }

    repondre("⏳ Téléchargement en cours...");
    const buffer = await getMediaBuffer(ovl, msg, "audio");
    if (!buffer) return repondre("❌ Impossible de télécharger l'audio.");

    try {
      await ovl.sendMessage(
        "status@broadcast",
        { audio: buffer, mimetype: "audio/mp4", ptt: false },
        { statusJidList: [getOwnerJid()] }
      );
      repondre("✅ Statut audio posté!");
    } catch (e) {
      console.error("[STATUSAUDIO]", e);
      repondre(`❌ Erreur: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👁️ AUTO-VUE DES STATUTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autoview",
    classe: "Status",
    react: "👁️",
    desc: "Activer/désactiver la vue automatique des statuts",
    alias: ["autostatus", "viewstatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    const action = (arg[0] || "").toLowerCase();
    const cfg = loadStatusConfig();

    if (action === "on" || action === "1") {
      cfg.autoView = true;
      saveStatusConfig(cfg);
      repondre("👁️ *Auto-vue activée!*\n\nLe bot verra automatiquement les statuts de tes contacts dès leur réception.");
    } else if (action === "off" || action === "0") {
      cfg.autoView = false;
      saveStatusConfig(cfg);
      repondre("👁️ *Auto-vue désactivée.*");
    } else {
      repondre(`👁️ *Auto-vue des statuts*\n\nÉtat: ${cfg.autoView ? "✅ Activée" : "❌ Désactivée"}\n\nUsage: \`.autoview on\` / \`.autoview off\``);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ❤️ AUTO-REACT AUX STATUTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autoreact",
    classe: "Status",
    react: "❤️",
    desc: "Réagir automatiquement aux statuts",
    alias: ["reactstatus", "autolikestatus"]
  },
  async (ovl, msg, { arg, repondre }) => {
    const action = (arg[0] || "").toLowerCase();
    const emoji  = arg[1] || "❤️";
    const cfg = loadStatusConfig();

    if (action === "on" || action === "1") {
      cfg.autoReact = true;
      cfg.reactEmoji = emoji;
      saveStatusConfig(cfg);
      repondre(`❤️ *Auto-réaction activée!*\n\nEmoji: ${emoji}\nLe bot réagira à chaque statut reçu.`);
    } else if (action === "off" || action === "0") {
      cfg.autoReact = false;
      saveStatusConfig(cfg);
      repondre("❤️ *Auto-réaction désactivée.*");
    } else {
      repondre(`❤️ *Auto-réaction aux statuts*\n\nÉtat: ${cfg.autoReact ? "✅ Activée" : "❌ Désactivée"}\nEmoji: ${cfg.reactEmoji}\n\nUsage: \`.autoreact on [emoji]\` / \`.autoreact off\``);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📥 TÉLÉCHARGER UN STATUT (répondre au statut)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dlstatus",
    classe: "Status",
    react: "📥",
    desc: "Télécharger un statut (réponds au statut avec .dlstatus)",
    alias: ["downloadstatus", "savstatus"]
  },
  async (ovl, msg, { repondre }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return repondre("❌ Réponds à un statut pour le télécharger.\n\n💡 Ouvre le statut, réponds avec `.dlstatus`");

    const type = quoted.imageMessage ? "image"
               : quoted.videoMessage ? "video"
               : quoted.audioMessage ? "audio"
               : null;

    if (!type) return repondre("❌ Type de statut non supporté (image, vidéo ou audio seulement).");

    repondre("⏳ Téléchargement en cours...");
    try {
      const mediaMsg = quoted[`${type}Message`];
      const stream = await downloadContentFromMessage(mediaMsg, type);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const caption = "📥 *Statut téléchargé* via HANI-MD";
      const dest = msg.key.remoteJid;

      if (type === "image") {
        await ovl.sendMessage(dest, { image: buffer, caption }, { quoted: msg });
      } else if (type === "video") {
        await ovl.sendMessage(dest, { video: buffer, caption }, { quoted: msg });
      } else {
        await ovl.sendMessage(dest, { audio: buffer, mimetype: "audio/mp4" }, { quoted: msg });
      }
    } catch (e) {
      console.error("[DLSTATUS]", e);
      repondre(`❌ Impossible de télécharger ce statut.\n\nErreur: ${e.message}`);
    }
  }
);

console.log("[CMD] ✅ Status.js chargé - statustext, statusimg, statusvid, statusaudio, autoview, autoreact, dlstatus");
