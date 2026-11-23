/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ HANI-MD - Filtre Anti-Spam
 * ═══════════════════════════════════════════════════════════
 * Détection automatique des spams
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const SPAM_FILE = path.join(__dirname, "../DataBase/antispam_data.json");

// Mots suspects de spam
const SPAM_KEYWORDS = [
  "gagné", "gagnez", "loterie", "lotto", "million", "argent facile",
  "cliquez ici", "lien", "promo", "promotion", "offre limitée",
  "urgent", "immédiat", "gratuit", "100%", "garanti", "cash",
  "investissement", "crypto", "bitcoin", "trading", "forex"
];

// Patterns suspects
const SUSPICIOUS_PATTERNS = [
  /http[s]?:\/\/\S{50,}/, // Liens très longs
  /\$\d+[,.]?\d*/, // Montants en dollars
  /\b[A-Z]{10,}\b/, // Texte tout en majuscules
  /(.+)\1{4,}/, // Répétitions
];

function loadSpamData() {
  try {
    if (fs.existsSync(SPAM_FILE)) {
      return JSON.parse(fs.readFileSync(SPAM_FILE, "utf8"));
    }
  } catch (e) {}
  return { users: {}, blocked: [], settings: { enabled: false, threshold: 5 } };
}

function saveSpamData(data) {
  try {
    fs.writeFileSync(SPAM_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function analyzeSpamScore(text) {
  let score = 0;
  const lowerText = text.toLowerCase();

  // Mots-clés spam
  SPAM_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) score += 2;
  });

  // Patterns suspects
  SUSPICIOUS_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Trop de majuscules
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 10) score += 2;

  // Trop d'emojis
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 5) score += 2;

  // Répétitions de caractères
  if (/(.)(\1{5,})/.test(text)) score += 2;

  return score;
}

function isSpam(userId, text, superUser = false) {
  if (superUser) return false;

  const data = loadSpamData();
  if (!data.settings.enabled) return false;

  const score = analyzeSpamScore(text);
  const threshold = data.settings.threshold;

  // Mettre à jour les stats utilisateur
  if (!data.users[userId]) {
    data.users[userId] = { messages: 0, spamCount: 0, lastMessage: Date.now() };
  }
  data.users[userId].messages++;

  // Détection fréquence (trop de messages rapidement)
  const now = Date.now();
  const timeSinceLast = now - data.users[userId].lastMessage;
  if (timeSinceLast < 2000) score += 3; // Messages trop rapprochés
  data.users[userId].lastMessage = now;

  if (score >= threshold) {
    data.users[userId].spamCount++;
    saveSpamData(data);
    return { isSpam: true, score, threshold };
  }

  saveSpamData(data);
  return { isSpam: false, score };
}

// ═══════════════════════════════════════════════════════════
// 🛡️ ACTIVER/DÉSACTIVER ANTISPAM
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "antispam",
    classe: "Protection",
    react: "🛡️",
    desc: "Activer/désactiver le filtre anti-spam",
    alias: ["spamfilter", "filter"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const action = arg[0]?.toLowerCase();
      const data = loadSpamData();

      if (action === "on") {
        data.settings.enabled = true;
        saveSpamData(data);
        repondre(`🛡️ *Filtre Anti-Spam ACTIVÉ*\n\n✅ Le bot détectera automatiquement les messages suspects.\n📊 Seuil actuel: ${data.settings.threshold} points\n\n💡 Détections:\n• Mots suspects: +2pts\n• Liens longs: +3pts\n• Majuscules excessives: +2pts\n• Messages rapides: +3pts`);
      } else if (action === "off") {
        data.settings.enabled = false;
        saveSpamData(data);
        repondre(`🔴 *Filtre Anti-Spam DÉSACTIVÉ*\n\nLe bot acceptera tous les messages.`);
      } else if (action === "status") {
        const status = data.settings.enabled ? "🟢 ACTIVÉ" : "🔴 DÉSACTIVÉ";
        repondre(`🛡️ *Statut Anti-Spam*\n\nStatus: ${status}\nSeuil: ${data.settings.threshold} points\nMessages analysés: ${Object.values(data.users).reduce((a, u) => a + u.messages, 0)}\nSpams détectés: ${Object.values(data.users).reduce((a, u) => a + u.spamCount, 0)}`);
      } else if (action === "set" && arg[1]) {
        const newThreshold = parseInt(arg[1]);
        if (newThreshold < 3 || newThreshold > 15) {
          return repondre("❌ Le seuil doit être entre 3 et 15");
        }
        data.settings.threshold = newThreshold;
        saveSpamData(data);
        repondre(`✅ *Seuil mis à jour:* ${newThreshold} points`);
      } else {
        repondre("❌ *Utilisation:*\n.antispam on → Activer\n.antispam off → Désactiver\n.antispam status → Voir stats\n.antispam set 7 → Changer seuil");
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATS SPAM
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "spamstats",
    classe: "Protection",
    react: "📊",
    desc: "Statistiques anti-spam",
    alias: ["antispaminfo"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const data = loadSpamData();
      const users = Object.entries(data.users)
        .sort((a, b) => b[1].spamCount - a[1].spamCount)
        .slice(0, 5);

      let text = `📊 *Statistiques Anti-Spam*\n\n`;
      text += `🛡️ Filtre: ${data.settings.enabled ? "✅ Activé" : "❌ Désactivé"}\n`;
      text += `📊 Seuil: ${data.settings.threshold} points\n`;
      text += `👥 Utilisateurs trackés: ${Object.keys(data.users).length}\n`;
      text += `🚫 Spams détectés: ${Object.values(data.users).reduce((a, u) => a + u.spamCount, 0)}\n\n`;

      if (users.length > 0) {
        text += `🔴 *Top spammeurs suspects:*\n\n`;
        users.forEach(([id, u], i) => {
          text += `${i + 1}. ${id.split("@")[0]}\n   🚫 ${u.spamCount} alertes\n`;
        });
      }

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

module.exports = { isSpam, analyzeSpamScore };

console.log("[CMD] ✅ Antispam.js chargé - Commandes: antispam, spamstats");
