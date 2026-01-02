/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - Anti-Bot
 * ═══════════════════════════════════════════════════════════
 * Détecte et supprime les messages de bots non autorisés
 * ═══════════════════════════════════════════════════════════
 */

const { getAntibotSettings } = require("../../DataBase/antibot");

/**
 * Gestionnaire anti-bot
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 * @returns {boolean} - true si message bloqué
 */
async function handle(ovl, msg, options) {
  try {
    const { verif_Groupe, auteur_Msg, admin_Groupe, verif_Admin } = options;
    
    if (!verif_Groupe) return false;
    
    // Récupérer les paramètres antibot du groupe
    const settings = await getAntibotSettings(msg.key.remoteJid);
    if (!settings || !settings.enabled) return false;
    
    // Les admins sont exemptés
    if (verif_Admin) return false;
    
    // Le bot lui-même est exempté
    if (msg.key.fromMe) return false;
    
    // Vérifier si c'est un message de bot
    const isBot = msg.message?.extendedTextMessage?.contextInfo?.isForwarded ||
                  msg.message?.extendedTextMessage?.contextInfo?.forwardingScore > 0 ||
                  auteur_Msg.includes(":") || // Format typique des bots
                  false;
    
    if (!isBot) return false;
    
    // Vérifier si le bot peut supprimer des messages
    if (!admin_Groupe) return false;
    
    // Supprimer le message
    await ovl.sendMessage(msg.key.remoteJid, { delete: msg.key });
    
    // Action selon les paramètres
    if (settings.action === "kick") {
      await ovl.groupParticipantsUpdate(
        msg.key.remoteJid, 
        [auteur_Msg], 
        "remove"
      );
      
      await ovl.sendMessage(msg.key.remoteJid, {
        text: `🤖 *Anti-Bot activé*\n\n@${auteur_Msg.split("@")[0]} a été expulsé (bot détecté)`,
        mentions: [auteur_Msg]
      });
    } else {
      await ovl.sendMessage(msg.key.remoteJid, {
        text: `🤖 *Anti-Bot activé*\n\nMessage de bot supprimé.`
      });
    }
    
    return true;
    
  } catch (error) {
    console.error("[ANTIBOT]", error);
    return false;
  }
}

module.exports = { handle };
