/**
 * ═══════════════════════════════════════════════════════════
 * 📢 HANI-MD - Anti-Mention
 * ═══════════════════════════════════════════════════════════
 * Limite les mentions excessives dans les groupes
 * ═══════════════════════════════════════════════════════════
 */

const { getAntimentionSettings } = require("../../DataBase/antimention");

/**
 * Gestionnaire anti-mention
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 * @returns {boolean} - true si message bloqué
 */
async function handle(ovl, msg, options) {
  try {
    const { verif_Groupe, auteur_Msg, admin_Groupe, verif_Admin } = options;
    
    if (!verif_Groupe) return false;
    
    // Récupérer les paramètres antimention du groupe
    const settings = await getAntimentionSettings(msg.key.remoteJid);
    if (!settings || !settings.enabled) return false;
    
    // Les admins sont exemptés
    if (verif_Admin) return false;
    
    // Le bot lui-même est exempté
    if (msg.key.fromMe) return false;
    
    // Vérifier les mentions
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const maxMentions = settings.maxMentions || 5;
    
    if (mentions.length <= maxMentions) return false;
    
    // Vérifier si le bot peut supprimer des messages
    if (!admin_Groupe) return false;
    
    // Supprimer le message
    await ovl.sendMessage(msg.key.remoteJid, { delete: msg.key });
    
    await ovl.sendMessage(msg.key.remoteJid, {
      text: `📢 *Anti-Mention*\n\n⚠️ @${auteur_Msg.split("@")[0]}, trop de mentions!\n\n📊 Maximum autorisé: ${maxMentions} mentions`,
      mentions: [auteur_Msg]
    });
    
    return true;
    
  } catch (error) {
    console.error("[ANTIMENTION]", error);
    return false;
  }
}

module.exports = { handle };
