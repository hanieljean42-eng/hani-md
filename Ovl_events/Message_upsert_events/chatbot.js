/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - Chatbot IA
 * ═══════════════════════════════════════════════════════════
 * Répond intelligemment aux messages avec l'IA
 * ═══════════════════════════════════════════════════════════
 */

const axios = require("axios");
const { getChatbotSettings } = require("../../DataBase/chatbot");

/**
 * Gestionnaire chatbot IA
 * @param {Object} ovl - Instance du bot
 * @param {Object} msg - Message reçu
 * @param {Object} options - Options de contexte
 */
async function handle(ovl, msg, options) {
  try {
    const chatId = msg.key.remoteJid;
    
    // Vérifier si le chatbot est activé pour ce chat
    const settings = await getChatbotSettings(chatId);
    if (!settings || !settings.enabled) return;
    
    // Ne pas répondre à soi-même
    if (msg.key.fromMe) return;
    
    // Récupérer le texte du message
    let text = "";
    if (msg.message?.conversation) {
      text = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    }
    
    if (!text || text.startsWith(".") || text.startsWith("/")) return;
    
    // Ignorer les messages trop courts
    if (text.length < 3) return;
    
    // API SimSimi ou alternative
    try {
      const apiUrl = `https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=fr`;
      
      const response = await axios.get(apiUrl, { timeout: 10000 });
      
      if (response.data && response.data.success) {
        await ovl.sendMessage(chatId, {
          text: response.data.success
        }, { quoted: msg });
      }
    } catch (apiError) {
      // Réponses de fallback simples
      const fallbackResponses = [
        "Hmm, intéressant! 🤔",
        "Je comprends! 😊",
        "Ah oui? Dis m'en plus! 👀",
        "C'est cool! 👍",
        "OK! 🙂"
      ];
      
      // Répondre avec 30% de probabilité en fallback
      if (Math.random() < 0.3) {
        const response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        await ovl.sendMessage(chatId, {
          text: response
        }, { quoted: msg });
      }
    }
    
  } catch (error) {
    console.error("[CHATBOT]", error);
  }
}

module.exports = { handle };
