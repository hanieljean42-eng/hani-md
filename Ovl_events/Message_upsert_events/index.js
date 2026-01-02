/**
 * ═══════════════════════════════════════════════════════════
 * 📁 HANI-MD - Index des événements de messages
 * ═══════════════════════════════════════════════════════════
 * Point d'entrée pour tous les gestionnaires d'événements
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const antibot = require("./antibot");
const antidelete = require("./antidelete");
const antilink = require("./antilink");
const antimention = require("./antimention");
const antispam = require("./antispam");
const antitag = require("./antitag");
const autoReactAndRead = require("./auto_react&read_msg");
const autoreply = require("./autoreply");
const cacheJid = require("./cache_jid");
const chatbot = require("./chatbot");
const dlStatus = require("./dl_status");
const evalExec = require("./eval_exec");
const lectureStatus = require("./lecture_status");
const likeStatus = require("./like_status");
const mention = require("./mention");
const presence = require("./presence");
const rankLevelup = require("./rank&levelup");

/**
 * Exécuter tous les gestionnaires d'événements de message
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function executeAllHandlers(ovl, msg, options) {
  try {
    // Exécuter en parallèle les handlers non-bloquants
    await Promise.allSettled([
      cacheJid.handle(ovl, msg, options).catch(() => {}),
      presence.handle(ovl, msg, options).catch(() => {}),
      autoReactAndRead.handle(ovl, msg, options).catch(() => {}),
      lectureStatus.handle(ovl, msg, options).catch(() => {}),
      likeStatus.handle(ovl, msg, options).catch(() => {}),
      dlStatus.handle(ovl, msg, options).catch(() => {}),
      rankLevelup.handle(ovl, msg, options).catch(() => {}),
      mention.handle(ovl, msg, options).catch(() => {})
    ]);

    // Protections groupe
    if (options.verif_Groupe) {
      const linkBlocked = await antilink.handle(ovl, msg, options).catch(() => false);
      if (linkBlocked) return { blocked: true, reason: "antilink" };

      const spamBlocked = await antispam.handle(ovl, msg, options).catch(() => false);
      if (spamBlocked) return { blocked: true, reason: "antispam" };

      const botBlocked = await antibot.handle(ovl, msg, options).catch(() => false);
      if (botBlocked) return { blocked: true, reason: "antibot" };

      const tagBlocked = await antitag.handle(ovl, msg, options).catch(() => false);
      if (tagBlocked) return { blocked: true, reason: "antitag" };

      const mentionBlocked = await antimention.handle(ovl, msg, options).catch(() => false);
      if (mentionBlocked) return { blocked: true, reason: "antimention" };
    }

    await antidelete.handle(ovl, msg, options).catch(() => {});
    await chatbot.handle(ovl, msg, options).catch(() => {});
    await autoreply.handle(ovl, msg, options).catch(() => {});
    await evalExec.handle(ovl, msg, options).catch(() => {});

    return { blocked: false };

  } catch (error) {
    console.error("[MSG_EVENTS] Erreur:", error);
    return { blocked: false };
  }
}

module.exports = {
  executeAllHandlers,
  handlers: {
    antibot, antidelete, antilink, antimention, antispam, antitag,
    autoReactAndRead, autoreply, cacheJid, chatbot, dlStatus,
    evalExec, lectureStatus, likeStatus, mention, presence, rankLevelup
  }
};

console.log("[EVENTS] ✅ Message_upsert_events/index.js chargé");
