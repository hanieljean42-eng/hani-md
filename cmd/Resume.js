/**
 * ═══════════════════════════════════════════════════════════
 * 📝 HANI-MD - Résumé de Conversation
 * ═══════════════════════════════════════════════════════════
 * Résume les messages non lus
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "../DataBase/chat_history.json");
const MAX_HISTORY = 100;

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveHistory(data) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function addToHistory(chatId, message, sender) {
  const history = loadHistory();
  if (!history[chatId]) history[chatId] = [];

  history[chatId].push({
    text: message,
    sender: sender,
    time: new Date().toISOString()
  });

  // Garder seulement les MAX_HISTORY derniers
  if (history[chatId].length > MAX_HISTORY) {
    history[chatId] = history[chatId].slice(-MAX_HISTORY);
  }

  saveHistory(history);
}

// ═══════════════════════════════════════════════════════════
// 📋 RÉSUMER LES DERNIERS MESSAGES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "resume",
    classe: "Outils",
    react: "📝",
    desc: "Résume les X derniers messages du chat",
    alias: ["summarize", "recap"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const count = parseInt(arg[0]) || 20;
      const chatId = msg.key.remoteJid;

      const history = loadHistory();
      const chatHistory = history[chatId] || [];

      if (chatHistory.length === 0) {
        return repondre("📝 *Résumé*\n\nAucun historique disponible pour ce chat.\n\n💡 Le bot enregistre automatiquement les conversations pour pouvoir les résumer.");
      }

      const recent = chatHistory.slice(-Math.min(count, chatHistory.length));

      // Créer un résumé simple basé sur les mots fréquents et les questions
      const allText = recent.map(m => m.text.toLowerCase()).join(" ");
      
      // Compter les mots
      const words = allText.split(/\s+/).filter(w => w.length > 3);
      const wordCount = {};
      words.forEach(w => {
        if (!["pour", "dans", "avec", "c'est", "comme", "cette"].includes(w)) {
          wordCount[w] = (wordCount[w] || 0) + 1;
        }
      });

      const topWords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Trouver les questions
      const questions = recent.filter(m => m.text.includes("?"));

      // Compter les participants
      const senders = [...new Set(recent.map(m => m.sender))];

      let text = `📝 *Résumé des ${recent.length} derniers messages*\n\n`;
      text += `👥 *Participants:* ${senders.length}\n`;
      text += `❓ *Questions:* ${questions.length}\n\n`;

      if (topWords.length > 0) {
        text += `🔤 *Sujets principaux:*\n`;
        topWords.forEach(([word, count]) => {
          text += `   • ${word} (${count}x)\n`;
        });
        text += `\n`;
      }

      if (questions.length > 0) {
        text += `❓ *Dernières questions:*\n`;
        questions.slice(-3).forEach(q => {
          const shortQ = q.text.length > 50 ? q.text.substring(0, 50) + "..." : q.text;
          text += `   • "${shortQ}"\n`;
        });
        text += `\n`;
      }

      // Messages clés (plus longs = plus d'info)
      const keyMessages = recent
        .filter(m => m.text.length > 50)
        .sort((a, b) => b.text.length - a.text.length)
        .slice(0, 3);

      if (keyMessages.length > 0) {
        text += `📌 *Points clés:*\n`;
        keyMessages.forEach((m, i) => {
          const short = m.text.substring(0, 80) + (m.text.length > 80 ? "..." : "");
          text += `${i + 1}. ${short}\n\n`;
        });
      }

      text += `💡 *Note:* Pour un résumé IA avancé, configurez l'API OpenAI avec .airesume`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🤖 RÉSUMÉ IA (si API configurée)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "airesume",
    classe: "Outils",
    react: "🤖",
    desc: "Résumé avancé avec IA (nécessite API OpenAI)",
    alias: ["airecap", "smartresume"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const count = parseInt(arg[0]) || 30;
      
      repondre("🤖 *Résumé IA*\n\nCette fonctionnalité nécessite une clé API OpenAI.\n\n💡 *Pour configurer:*\n1. Obtenez une clé sur openai.com\n2. Utilisez: .configai [votre_clé]\n\n📝 *Alternative:* Utilisez .resume pour un résumé basique sans IA.");
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATS DU CHAT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "chatinfo",
    classe: "Outils",
    react: "📊",
    desc: "Informations sur ce chat",
    alias: ["chatstats", "threadinfo"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const chatId = msg.key.remoteJid;
      const history = loadHistory();
      const chatHistory = history[chatId] || [];

      const totalMessages = chatHistory.length;
      const uniqueSenders = [...new Set(chatHistory.map(m => m.sender))];
      const avgLength = chatHistory.length > 0 
        ? Math.round(chatHistory.reduce((a, m) => a + m.text.length, 0) / chatHistory.length)
        : 0;

      const firstMsg = chatHistory[0];
      const lastMsg = chatHistory[chatHistory.length - 1];

      let text = `📊 *Info Chat*\n\n`;
      text += `💬 Messages enregistrés: ${totalMessages}\n`;
      text += `👥 Participants: ${uniqueSenders.length}\n`;
      text += `📏 Longueur moyenne: ${avgLength} caractères\n`;

      if (firstMsg) {
        const firstDate = new Date(firstMsg.time).toLocaleDateString("fr-FR");
        text += `📅 Premier message: ${firstDate}\n`;
      }

      if (lastMsg) {
        const lastDate = new Date(lastMsg.time).toLocaleString("fr-FR");
        text += `🕐 Dernier message: ${lastDate}\n`;
      }

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

module.exports = { addToHistory };

console.log("[CMD] ✅ Resume.js chargé - Commandes: resume, airesumé, chatinfo");
