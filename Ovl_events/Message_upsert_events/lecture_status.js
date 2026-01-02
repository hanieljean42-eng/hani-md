/**
 * ═══════════════════════════════════════════════════════════
 * 👁️ HANI-MD - Lecture Status
 * ═══════════════════════════════════════════════════════════
 * Marque automatiquement les statuts comme vus
 * ═══════════════════════════════════════════════════════════
 */

const AUTO_VIEW_STATUS = process.env.AUTO_VIEW_STATUS === "true" || false;

/**
 * Gestionnaire lecture de statuts
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    if (!AUTO_VIEW_STATUS) return;
    
    const chatId = msg.key.remoteJid;
    
    // Vérifier si c'est un statut
    if (chatId !== "status@broadcast") return;
    
    // Marquer comme vu
    await ovl.readMessages([msg.key]);
    
  } catch (error) {
    // Silently ignore
  }
}

module.exports = { handle };
