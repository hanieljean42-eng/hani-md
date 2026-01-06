/**
 * ═══════════════════════════════════════════════════════════
 * ⚙️ HANI-MD - Gestionnaire de Configuration Centralisé
 * ═══════════════════════════════════════════════════════════
 * Toutes les modifications sont sauvegardées et renvoyées
 * ═══════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../DataBase/bot_config.json");

// Configuration par défaut
const DEFAULT_CONFIG = {
  // Général
  prefix: ".",
  mode: "public",
  language: "fr",
  
  // Confidentialité
  showTyping: true,
  readReceipts: true,
  
  // Statuts
  autoViewStatus: false,
  autoReactStatus: false,
  statusReactEmoji: "❤️",
  
  // Protections
  antilink: false,
  antispam: false,
  antibot: false,
  anticall: true,
  antitag: false,
  
  // Auto-réponses
  autoReplyEnabled: true,
  welcomeEnabled: true,
  awayEnabled: false,
  
  // Premium
  premiumEnabled: true,
  
  // Historique des modifications
  lastModified: null,
  modifiedBy: null
};

class BotConfig {
  constructor() {
    this.config = this.load();
  }

  // Charger la configuration
  load() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        return { ...DEFAULT_CONFIG, ...data };
      }
    } catch (e) {
      console.error("[CONFIG] Erreur chargement:", e.message);
    }
    return { ...DEFAULT_CONFIG };
  }

  // Sauvegarder la configuration
  save() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
      return true;
    } catch (e) {
      console.error("[CONFIG] Erreur sauvegarde:", e.message);
      return false;
    }
  }

  // Obtenir une valeur
  get(key) {
    return this.config[key];
  }

  // Définir une valeur et retourner un rapport
  set(key, value, modifiedBy = "owner") {
    const oldValue = this.config[key];
    this.config[key] = value;
    this.config.lastModified = new Date().toISOString();
    this.config.modifiedBy = modifiedBy;
    
    const saved = this.save();
    
    return {
      success: saved,
      key: key,
      oldValue: oldValue,
      newValue: value,
      timestamp: this.config.lastModified,
      message: saved 
        ? `✅ *Configuration modifiée*\n\n📝 *${key}*\n├ Ancien: ${this.formatValue(oldValue)}\n└ Nouveau: ${this.formatValue(value)}\n\n💾 Sauvegardé le ${new Date().toLocaleString("fr-FR")}`
        : `❌ Erreur lors de la sauvegarde de ${key}`
    };
  }

  // Formater une valeur pour l'affichage
  formatValue(value) {
    if (typeof value === "boolean") {
      return value ? "✅ Activé" : "❌ Désactivé";
    }
    if (value === null || value === undefined) {
      return "Non défini";
    }
    return String(value);
  }

  // Obtenir toute la configuration
  getAll() {
    return { ...this.config };
  }

  // Générer un rapport de configuration
  getReport() {
    const c = this.config;
    return `
⚙️ *CONFIGURATION HANI-MD*
${"═".repeat(30)}

📌 *Général*
├ Préfixe: \`${c.prefix}\`
├ Mode: ${c.mode === "public" ? "🌐 Public" : "🔒 Privé"}
└ Langue: ${c.language}

🔒 *Confidentialité*
├ Indicateur frappe: ${this.formatValue(c.showTyping)}
└ Accusés de lecture: ${this.formatValue(c.readReceipts)}

📊 *Statuts*
├ Auto-vue: ${this.formatValue(c.autoViewStatus)}
├ Auto-réaction: ${this.formatValue(c.autoReactStatus)}
└ Emoji réaction: ${c.statusReactEmoji}

🛡️ *Protections*
├ Anti-lien: ${this.formatValue(c.antilink)}
├ Anti-spam: ${this.formatValue(c.antispam)}
├ Anti-bot: ${this.formatValue(c.antibot)}
├ Anti-appel: ${this.formatValue(c.anticall)}
└ Anti-tag: ${this.formatValue(c.antitag)}

💬 *Auto-réponses*
├ Activé: ${this.formatValue(c.autoReplyEnabled)}
├ Bienvenue: ${this.formatValue(c.welcomeEnabled)}
└ Absence: ${this.formatValue(c.awayEnabled)}

${"═".repeat(30)}
🕐 Dernière modif: ${c.lastModified ? new Date(c.lastModified).toLocaleString("fr-FR") : "Jamais"}
👤 Par: ${c.modifiedBy || "Système"}
`;
  }

  // Toggle (inverser une valeur booléenne)
  toggle(key, modifiedBy = "owner") {
    if (typeof this.config[key] !== "boolean") {
      return {
        success: false,
        message: `❌ ${key} n'est pas une option on/off`
      };
    }
    return this.set(key, !this.config[key], modifiedBy);
  }
}

// Instance unique
const botConfig = new BotConfig();

module.exports = { botConfig, BotConfig };
