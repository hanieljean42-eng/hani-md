/**
 * ═══════════════════════════════════════════════════════════
 * 🏷️ HANI-MD - Anti-Tag
 * ═══════════════════════════════════════════════════════════
 * Bloque les @everyone / tagall non autorisés
 * ═══════════════════════════════════════════════════════════
 */

const { getAntitagSettings } = require("../../DataBase/antitag");

/**
 * Gestionnaire anti-tag
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 * @returns {boolean} - true si message bloqué
 */
async function handle(ovl, msg, options) {
  try {
    const { verif_Groupe, auteur_Msg, admin_Groupe, verif_Admin } = options;
    
    if (!verif_Groupe) return false;
    
    // Récupérer les paramètres antitag du groupe
    const settings = await getAntitagSettings(msg.key.remoteJid);
    if (!settings || !settings.enabled) return false;
    
    // Les admins sont exemptés
    if (verif_Admin) return false;
    
    // Le bot lui-même est exempté
    if (msg.key.fromMe) return false;
    
    // Vérifier les mentions
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    // Récupérer les membres du groupe
    let groupMetadata;
    try {
      groupMetadata = await ovl.groupMetadata(msg.key.remoteJid);
    } catch (e) {
      return false;
    }
    
    const totalMembers = groupMetadata.participants?.length || 0;
    
    // Seuil: si on mentionne plus de 50% des membres ou tous les admins
    const threshold = Math.floor(totalMembers * 0.5);
    
    if (mentions.length < threshold) return false;
    
    // Vérifier si le bot peut agir
    if (!admin_Groupe) return false;
    
    // Supprimer le message
    await ovl.sendMessage(msg.key.remoteJid, { delete: msg.key });
    
    await ovl.sendMessage(msg.key.remoteJid, {
      text: `🏷️ *Anti-Tag*\n\n⚠️ @${auteur_Msg.split("@")[0]}, taguer tout le monde n'est pas autorisé!`,
      mentions: [auteur_Msg]
    });
    
    // Expulser si configuré
    if (settings.action === "kick") {
      await ovl.groupParticipantsUpdate(
        msg.key.remoteJid, 
        [auteur_Msg], 
        "remove"
      );
    }
    
    return true;
    
  } catch (error) {
    console.error("[ANTITAG]", error);
    return false;
  }
}

module.exports = { handle };
