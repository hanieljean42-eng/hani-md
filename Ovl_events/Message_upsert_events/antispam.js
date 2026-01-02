/**
 * ═══════════════════════════════════════════════════════════
 * 🚫 HANI-MD - Anti-Spam
 * ═══════════════════════════════════════════════════════════
 * Détecte et bloque les spammeurs
 * ═══════════════════════════════════════════════════════════
 */

const { getAntispamSettings } = require("../../DataBase/antispam");

// Stockage temporaire des compteurs de spam
const spamCounters = new Map();

/**
 * Gestionnaire anti-spam
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 * @returns {boolean} - true si message bloqué
 */
async function handle(ovl, msg, options) {
  try {
    const { verif_Groupe, auteur_Msg, admin_Groupe, verif_Admin } = options;
    
    if (!verif_Groupe) return false;
    
    // Récupérer les paramètres antispam du groupe
    const settings = await getAntispamSettings(msg.key.remoteJid);
    if (!settings || !settings.enabled) return false;
    
    // Les admins sont exemptés
    if (verif_Admin) return false;
    
    // Le bot lui-même est exempté
    if (msg.key.fromMe) return false;
    
    const chatId = msg.key.remoteJid;
    const key = `${chatId}_${auteur_Msg}`;
    const now = Date.now();
    
    // Récupérer ou initialiser le compteur
    let counter = spamCounters.get(key);
    if (!counter || now - counter.lastReset > 60000) { // Reset toutes les 60 secondes
      counter = {
        count: 0,
        lastReset: now,
        warnings: 0
      };
    }
    
    counter.count++;
    spamCounters.set(key, counter);
    
    // Seuil de spam (messages par minute)
    const threshold = settings.threshold || 10;
    
    if (counter.count <= threshold) return false;
    
    // Spam détecté
    if (!admin_Groupe) return false;
    
    // Supprimer le message
    await ovl.sendMessage(msg.key.remoteJid, { delete: msg.key });
    
    counter.warnings++;
    const maxWarnings = settings.maxWarnings || 3;
    
    if (counter.warnings >= maxWarnings) {
      // Expulser
      await ovl.groupParticipantsUpdate(
        msg.key.remoteJid, 
        [auteur_Msg], 
        "remove"
      );
      
      await ovl.sendMessage(msg.key.remoteJid, {
        text: `🚫 *Anti-Spam*\n\n@${auteur_Msg.split("@")[0]} a été expulsé pour spam répété.`,
        mentions: [auteur_Msg]
      });
      
      spamCounters.delete(key);
    } else {
      // Mute temporaire ou avertissement
      await ovl.sendMessage(msg.key.remoteJid, {
        text: `🚫 *Anti-Spam*\n\n⚠️ @${auteur_Msg.split("@")[0]}, arrêtez de spammer!\n\n⚠️ Avertissement ${counter.warnings}/${maxWarnings}`,
        mentions: [auteur_Msg]
      });
    }
    
    return true;
    
  } catch (error) {
    console.error("[ANTISPAM]", error);
    return false;
  }
}

module.exports = { handle };
