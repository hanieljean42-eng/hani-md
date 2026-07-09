/**
 * ═══════════════════════════════════════════════════════════
 * 💬 HANI-MD - Presence Handler
 * ═══════════════════════════════════════════════════════════
 * Gère le statut de présence du bot (typing, online, etc.)
 * ═══════════════════════════════════════════════════════════
 */

const PRESENCE_MODE = process.env.PRESENCE_MODE || "composing"; // available, composing, recording

/**
 * Gestionnaire de présence
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const chatId = msg.key.remoteJid;
    
    // Ne pas mettre à jour la présence pour les statuts
    if (chatId === "status@broadcast") return;

    // 👻 Mode fantôme : ne rien révéler (rester hors ligne).
    if (process.env.GHOST_MODE === "true") {
      try { await ovl.sendPresenceUpdate("unavailable", chatId); } catch (e) {}
      return;
    }
    
    // Mettre à jour la présence
    await ovl.sendPresenceUpdate(PRESENCE_MODE, chatId);
    
    // Revenir à "available" après un délai
    setTimeout(async () => {
      try {
        await ovl.sendPresenceUpdate("available", chatId);
      } catch (e) {}
    }, 3000);
    
  } catch (error) {
    // Silently ignore presence errors
  }
}

module.exports = { handle };
