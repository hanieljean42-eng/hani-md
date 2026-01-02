/**
 * ═══════════════════════════════════════════════════════════
 * 📍 HANI-MD - Mention Handler
 * ═══════════════════════════════════════════════════════════
 * Gère les mentions du bot et des utilisateurs spéciaux
 * ═══════════════════════════════════════════════════════════
 */

const { getMentionSettings } = require("../../DataBase/mention");

/**
 * Gestionnaire de mentions
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const chatId = msg.key.remoteJid;
    const botJid = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
    
    // Vérifier les mentions
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    // Si le bot est mentionné
    if (mentions.includes(botJid)) {
      // Récupérer les paramètres de mention
      const settings = await getMentionSettings(chatId);
      
      if (settings?.replyOnMention) {
        const text = msg.message?.extendedTextMessage?.text || "";
        
        // Réponse personnalisée selon le message
        let reply = "👋 Oui? Tapez .help pour voir mes commandes!";
        
        if (text.toLowerCase().includes("aide") || text.toLowerCase().includes("help")) {
          reply = "📚 Tapez .menu pour voir toutes mes commandes!";
        }
        
        await ovl.sendMessage(chatId, {
          text: reply
        }, { quoted: msg });
      }
    }
    
    // Notifier le propriétaire si mentionné quelque part
    const OWNER_NUMBER = process.env.NUMERO_OWNER;
    if (OWNER_NUMBER) {
      const ownerJid = OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      
      if (mentions.includes(ownerJid) && !msg.key.fromMe) {
        const settings = await getMentionSettings("global");
        
        if (settings?.notifyOwnerOnMention) {
          const sender = msg.key.participant || msg.key.remoteJid;
          const text = msg.message?.extendedTextMessage?.text || 
                       msg.message?.conversation || 
                       "[média]";
          
          await ovl.sendMessage(ownerJid, {
            text: `📍 *Vous avez été mentionné!*\n\n👤 Par: @${sender.split("@")[0]}\n💬 Dans: ${options.verif_Groupe ? "Groupe" : "Chat privé"}\n📝 Message: ${text.substring(0, 200)}`,
            mentions: [sender]
          });
        }
      }
    }
    
  } catch (error) {
    console.error("[MENTION]", error);
  }
}

module.exports = { handle };
