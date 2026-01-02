/**
 * ═══════════════════════════════════════════════════════════
 * 🏆 HANI-MD - Rank & Level Up
 * ═══════════════════════════════════════════════════════════
 * Système de niveaux et d'XP pour les utilisateurs
 * ═══════════════════════════════════════════════════════════
 */

const { getLevelUser, updateUserXP, getRankSettings } = require("../../DataBase/levels");

/**
 * Calculer le niveau à partir de l'XP
 * @param {number} xp - Points d'expérience
 * @returns {number} - Niveau
 */
function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

/**
 * Calculer l'XP nécessaire pour le niveau suivant
 * @param {number} level - Niveau actuel
 * @returns {number} - XP nécessaire
 */
function xpForNextLevel(level) {
  return Math.pow((level + 1) / 0.1, 2);
}

/**
 * Gestionnaire de niveaux
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const { verif_Groupe, auteur_Msg } = options;
    
    // Seulement dans les groupes
    if (!verif_Groupe) return;
    
    const chatId = msg.key.remoteJid;
    
    // Vérifier si le système de niveaux est activé
    const settings = await getRankSettings(chatId);
    if (!settings || !settings.enabled) return;
    
    // Ne pas compter les messages du bot
    if (msg.key.fromMe) return;
    
    // Récupérer l'utilisateur
    const user = await getLevelUser(chatId, auteur_Msg);
    const oldLevel = user ? calculateLevel(user.xp) : 0;
    
    // Ajouter de l'XP (5-15 XP par message)
    const xpGain = Math.floor(Math.random() * 11) + 5;
    const newXP = await updateUserXP(chatId, auteur_Msg, xpGain);
    const newLevel = calculateLevel(newXP);
    
    // Vérifier si level up
    if (newLevel > oldLevel) {
      const pushName = msg.pushName || "Utilisateur";
      
      // Message de level up
      let levelUpMsg = `🎉 *LEVEL UP!*\n\n`;
      levelUpMsg += `👤 @${auteur_Msg.split("@")[0]}\n`;
      levelUpMsg += `📊 Niveau ${oldLevel} → ${newLevel}\n`;
      levelUpMsg += `✨ XP Total: ${newXP}\n\n`;
      levelUpMsg += `💪 Continue comme ça!`;
      
      await ovl.sendMessage(chatId, {
        text: levelUpMsg,
        mentions: [auteur_Msg]
      });
    }
    
  } catch (error) {
    console.error("[RANK]", error);
  }
}

module.exports = { 
  handle, 
  calculateLevel, 
  xpForNextLevel 
};
