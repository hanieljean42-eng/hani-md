/**
 * ═══════════════════════════════════════════════════════════
 * ❤️ HANI-MD - Like Status
 * ═══════════════════════════════════════════════════════════
 * Réagit automatiquement aux statuts des contacts
 * ═══════════════════════════════════════════════════════════
 */

const AUTO_REACT_STATUS = process.env.AUTO_REACT_STATUS === "true" || false;
const STATUS_REACTION = process.env.STATUS_REACTION || "❤️";

/**
 * Gestionnaire like de statuts
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    if (!AUTO_REACT_STATUS) return;
    
    const chatId = msg.key.remoteJid;
    
    // Vérifier si c'est un statut
    if (chatId !== "status@broadcast") return;
    
    // Ne pas réagir à ses propres statuts
    if (msg.key.fromMe) return;
    
    // Réagir au statut
    await ovl.sendMessage(chatId, {
      react: {
        text: STATUS_REACTION,
        key: msg.key
      }
    });
    
  } catch (error) {
    // Silently ignore
  }
}

module.exports = { handle };
