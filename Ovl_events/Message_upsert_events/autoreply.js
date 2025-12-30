/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        🤖 HANI-MD - Auto Reply Handler V2.0               ║
 * ║     Gestion des réponses automatiques                     ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const AUTO_REPLY_FILE = path.join(__dirname, '../../DataBase/autoreply.json');

/**
 * Charge les auto-replies depuis le fichier JSON
 */
function loadAutoReplies() {
  try {
    if (fs.existsSync(AUTO_REPLY_FILE)) {
      return JSON.parse(fs.readFileSync(AUTO_REPLY_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('[AutoReply] Erreur chargement:', e.message);
  }
  return {};
}

/**
 * Vérifie et répond aux auto-replies
 * @param {object} hani - Instance Baileys
 * @param {object} ms - Message objet
 * @param {string} texte - Texte du message
 * @returns {boolean} - true si une réponse a été envoyée
 */
async function handleAutoReply(hani, ms, texte) {
  if (!texte) return false;
  
  const autoReplies = loadAutoReplies();
  const triggers = Object.keys(autoReplies);
  
  if (triggers.length === 0) return false;
  
  const lowerText = texte.toLowerCase();
  
  for (const trigger of triggers) {
    // Vérifie si le message contient le trigger
    if (lowerText.includes(trigger.toLowerCase())) {
      const response = autoReplies[trigger];
      
      try {
        await hani.sendMessage(ms.key.remoteJid, { 
          text: response 
        }, { 
          quoted: ms 
        });
        return true;
      } catch (e) {
        console.log('[AutoReply] Erreur envoi:', e.message);
      }
    }
  }
  
  return false;
}

module.exports = {
  handleAutoReply,
  loadAutoReplies
};
