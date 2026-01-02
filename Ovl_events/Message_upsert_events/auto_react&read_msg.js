/**
 * ═══════════════════════════════════════════════════════════
 * 👀 HANI-MD - Auto React & Read Message
 * ═══════════════════════════════════════════════════════════
 * Réagit automatiquement aux messages et marque comme lu
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Gestionnaire auto-react et lecture
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const chatId = msg.key.remoteJid;
    
    // Auto-read messages (si activé dans les paramètres)
    const AUTO_READ = process.env.AUTO_READ === "true" || false;
    if (AUTO_READ) {
      await ovl.readMessages([msg.key]);
    }
    
    // Auto-react (si activé)
    const AUTO_REACT = process.env.AUTO_REACT === "true" || false;
    if (AUTO_REACT && !msg.key.fromMe) {
      const reactions = ["👍", "❤️", "😊", "🔥", "✨", "💯", "🎉"];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      
      // Réagir avec une probabilité de 20%
      if (Math.random() < 0.2) {
        await ovl.sendMessage(chatId, {
          react: {
            text: randomReaction,
            key: msg.key
          }
        });
      }
    }
    
  } catch (error) {
    // Silently ignore errors
  }
}

module.exports = { handle };
