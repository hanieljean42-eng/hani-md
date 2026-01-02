/**
 * ═══════════════════════════════════════════════════════════
 * 💬 HANI-MD - Auto Reply
 * ═══════════════════════════════════════════════════════════
 * Réponses automatiques personnalisées
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const AUTOREPLY_PATH = path.join(__dirname, "../../DataBase/autoreply.json");

/**
 * Charger les auto-réponses
 */
function loadAutoreplies() {
  try {
    if (fs.existsSync(AUTOREPLY_PATH)) {
      return JSON.parse(fs.readFileSync(AUTOREPLY_PATH, "utf8"));
    }
  } catch (e) {}
  return {};
}

/**
 * Gestionnaire auto-reply
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    // Ne pas répondre à soi-même
    if (msg.key.fromMe) return;
    
    // Récupérer le texte du message
    let text = "";
    if (msg.message?.conversation) {
      text = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    }
    
    if (!text) return;
    
    const lowerText = text.toLowerCase().trim();
    const chatId = msg.key.remoteJid;
    
    // Charger les auto-réponses
    const autoreplies = loadAutoreplies();
    
    // Vérifier les correspondances globales
    const globalReplies = autoreplies.global || {};
    const chatReplies = autoreplies[chatId] || {};
    
    // Chercher une correspondance
    let reply = null;
    
    // Priorité aux réponses spécifiques au chat
    for (const [trigger, response] of Object.entries(chatReplies)) {
      if (lowerText.includes(trigger.toLowerCase())) {
        reply = response;
        break;
      }
    }
    
    // Si pas trouvé, chercher dans les réponses globales
    if (!reply) {
      for (const [trigger, response] of Object.entries(globalReplies)) {
        if (lowerText.includes(trigger.toLowerCase())) {
          reply = response;
          break;
        }
      }
    }
    
    // Réponses par défaut intégrées
    if (!reply) {
      const defaultReplies = {
        "bonjour bot": "👋 Bonjour! Comment puis-je vous aider?",
        "salut bot": "👋 Salut! Je suis HANI-MD, votre assistant.",
        "bot": null, // Pas de réponse pour juste "bot"
        "merci bot": "🙏 De rien! Heureux d'avoir pu aider.",
        "bonne nuit": "🌙 Bonne nuit! Fais de beaux rêves.",
        "good morning": "☀️ Good morning! Have a great day!",
        "hello bot": "👋 Hello! How can I help you?"
      };
      
      for (const [trigger, response] of Object.entries(defaultReplies)) {
        if (lowerText === trigger && response) {
          reply = response;
          break;
        }
      }
    }
    
    // Envoyer la réponse si trouvée
    if (reply) {
      await ovl.sendMessage(chatId, {
        text: reply
      }, { quoted: msg });
    }
    
  } catch (error) {
    console.error("[AUTOREPLY]", error);
  }
}

module.exports = { handle };
