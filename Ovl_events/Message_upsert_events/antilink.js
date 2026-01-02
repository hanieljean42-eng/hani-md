/**
 * ═══════════════════════════════════════════════════════════
 * 🔗 HANI-MD - Anti-Link
 * ═══════════════════════════════════════════════════════════
 * Supprime les liens non autorisés dans les groupes
 * ═══════════════════════════════════════════════════════════
 */

const { getAntilinkSettings } = require("../../DataBase/antilink");

// Patterns de liens
const LINK_PATTERNS = {
  whatsapp: /chat\.whatsapp\.com\/[A-Za-z0-9]+/gi,
  telegram: /t\.me\/[A-Za-z0-9_]+/gi,
  discord: /discord\.gg\/[A-Za-z0-9]+/gi,
  all: /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
};

/**
 * Gestionnaire anti-lien
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 * @returns {boolean} - true si message bloqué
 */
async function handle(ovl, msg, options) {
  try {
    const { verif_Groupe, auteur_Msg, admin_Groupe, verif_Admin } = options;
    
    if (!verif_Groupe) return false;
    
    // Récupérer les paramètres antilink du groupe
    const settings = await getAntilinkSettings(msg.key.remoteJid);
    if (!settings || !settings.enabled) return false;
    
    // Les admins sont exemptés
    if (verif_Admin) return false;
    
    // Le bot lui-même est exempté
    if (msg.key.fromMe) return false;
    
    // Récupérer le texte du message
    let text = "";
    if (msg.message?.conversation) {
      text = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    } else if (msg.message?.imageMessage?.caption) {
      text = msg.message.imageMessage.caption;
    } else if (msg.message?.videoMessage?.caption) {
      text = msg.message.videoMessage.caption;
    }
    
    if (!text) return false;
    
    // Vérifier les liens selon le mode
    let hasLink = false;
    const mode = settings.mode || "all";
    
    if (mode === "whatsapp") {
      hasLink = LINK_PATTERNS.whatsapp.test(text);
    } else if (mode === "telegram") {
      hasLink = LINK_PATTERNS.telegram.test(text);
    } else if (mode === "discord") {
      hasLink = LINK_PATTERNS.discord.test(text);
    } else {
      hasLink = LINK_PATTERNS.all.test(text);
    }
    
    if (!hasLink) return false;
    
    // Vérifier si le bot peut supprimer des messages
    if (!admin_Groupe) return false;
    
    // Supprimer le message
    await ovl.sendMessage(msg.key.remoteJid, { delete: msg.key });
    
    // Compter les avertissements
    const warnings = settings.warnings || {};
    warnings[auteur_Msg] = (warnings[auteur_Msg] || 0) + 1;
    
    // Action selon le nombre d'avertissements
    const maxWarnings = settings.maxWarnings || 3;
    
    if (warnings[auteur_Msg] >= maxWarnings) {
      // Expulser l'utilisateur
      await ovl.groupParticipantsUpdate(
        msg.key.remoteJid, 
        [auteur_Msg], 
        "remove"
      );
      
      await ovl.sendMessage(msg.key.remoteJid, {
        text: `🔗 *Anti-Link*\n\n@${auteur_Msg.split("@")[0]} a été expulsé après ${maxWarnings} avertissements.`,
        mentions: [auteur_Msg]
      });
      
      // Réinitialiser les avertissements
      delete warnings[auteur_Msg];
    } else {
      // Avertissement
      await ovl.sendMessage(msg.key.remoteJid, {
        text: `🔗 *Anti-Link*\n\n⚠️ @${auteur_Msg.split("@")[0]}, les liens ne sont pas autorisés!\n\n⚠️ Avertissement ${warnings[auteur_Msg]}/${maxWarnings}`,
        mentions: [auteur_Msg]
      });
    }
    
    return true;
    
  } catch (error) {
    console.error("[ANTILINK]", error);
    return false;
  }
}

module.exports = { handle };
