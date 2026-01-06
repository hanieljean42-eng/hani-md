/**
 * ═══════════════════════════════════════════════════════════
 * ⚙️ HANI-MD - Commandes de Configuration
 * ═══════════════════════════════════════════════════════════
 * Toutes les modifications sont sauvegardées et confirmées
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const { botConfig } = require("../lib/BotConfig");

// ═══════════════════════════════════════════════════════════
// ⚙️ VOIR LA CONFIGURATION COMPLÈTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "config",
    classe: "Configuration",
    react: "⚙️",
    desc: "Voir et modifier la configuration du bot",
    alias: ["settings", "parametres"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      // Sans argument: afficher la config
      if (!arg[0]) {
        return repondre(botConfig.getReport());
      }

      // Avec argument: modifier
      const key = arg[0].toLowerCase();
      const value = arg[1];

      // Mappages des commandes courtes
      const keyMappings = {
        "prefix": "prefix",
        "mode": "mode",
        "typing": "showTyping",
        "read": "readReceipts",
        "autoview": "autoViewStatus",
        "autoreact": "autoReactStatus",
        "antilink": "antilink",
        "antispam": "antispam",
        "antibot": "antibot",
        "anticall": "anticall",
        "antitag": "antitag",
        "autoreply": "autoReplyEnabled",
        "welcome": "welcomeEnabled",
        "away": "awayEnabled"
      };

      const configKey = keyMappings[key];
      
      if (!configKey) {
        const available = Object.keys(keyMappings).map(k => "• " + k).join("\n");
        return repondre("❌ Paramètre inconnu: " + key + "\n\n📝 *Paramètres disponibles:*\n" + available + "\n\n💡 Usage: .config [param] [valeur]");
      }

      // Si pas de valeur, toggle pour les booléens
      if (!value) {
        const current = botConfig.get(configKey);
        if (typeof current === "boolean") {
          const result = botConfig.toggle(configKey, msg.pushName || "owner");
          return repondre(result.message);
        } else {
          return repondre(`⚙️ *${key}*: ${botConfig.get(configKey)}\n\n💡 Usage: .config ${key} [nouvelle valeur]`);
        }
      }

      // Conversion de valeur
      let newValue = value;
      if (value === "on" || value === "true" || value === "1") newValue = true;
      else if (value === "off" || value === "false" || value === "0") newValue = false;

      const result = botConfig.set(configKey, newValue, msg.pushName || "owner");
      repondre(result.message);

    } catch (error) {
      console.error("[CONFIG]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 RACCOURCIS RAPIDES
// ═══════════════════════════════════════════════════════════

// Mode public/privé
ovlcmd(
  {
    nom_cmd: "setmode",
    classe: "Configuration",
    react: "🔄",
    desc: "Changer le mode du bot (public/private)",
    alias: ["botmode"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Réservé au propriétaire");
    
    const mode = arg[0]?.toLowerCase();
    if (!mode || !["public", "private"].includes(mode)) {
      const current = botConfig.get("mode");
      return repondre(`🔄 *Mode actuel:* ${current === "public" ? "🌐 Public" : "🔒 Privé"}\n\n💡 Usage: .setmode public/private`);
    }
    
    const result = botConfig.set("mode", mode, msg.pushName || "owner");
    repondre(result.message);
  }
);

// Préfixe
ovlcmd(
  {
    nom_cmd: "setprefixe",
    classe: "Configuration",
    react: "📌",
    desc: "Changer le préfixe du bot",
    alias: ["prefix", "setpfx"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Réservé au propriétaire");
    
    const newPrefix = arg[0];
    if (!newPrefix) {
      const current = botConfig.get("prefix");
      return repondre(`📌 *Préfixe actuel:* \`${current}\`\n\n💡 Usage: .setprefixe [nouveau préfixe]`);
    }
    
    if (newPrefix.length > 3) {
      return repondre("❌ Le préfixe doit faire maximum 3 caractères");
    }
    
    const result = botConfig.set("prefix", newPrefix, msg.pushName || "owner");
    repondre(result.message);
  }
);

// ═══════════════════════════════════════════════════════════
// 🛡️ PROTECTIONS RAPIDES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "protection",
    classe: "Configuration",
    react: "🛡️",
    desc: "Activer/désactiver une protection",
    alias: ["protect", "prot"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Réservé au propriétaire");
    
    const protections = ["antilink", "antispam", "antibot", "anticall", "antitag"];
    const prot = arg[0]?.toLowerCase();
    
    if (!prot || !protections.includes(prot)) {
      let status = "🛡️ *Protections HANI-MD*\n\n";
      for (const p of protections) {
        const enabled = botConfig.get(p);
        status += `${enabled ? "✅" : "❌"} ${p}\n`;
      }
      status += `\n💡 Usage: .protection [nom]`;
      return repondre(status);
    }
    
    const result = botConfig.toggle(prot, msg.pushName || "owner");
    repondre(result.message);
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 STATUTS CONFIGURATION
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "statusconfig",
    classe: "Configuration",
    react: "📊",
    desc: "Configurer les options de statut",
    alias: ["statuscfg"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Réservé au propriétaire");
    
    const option = arg[0]?.toLowerCase();
    
    if (!option) {
      const autoView = botConfig.get("autoViewStatus");
      const autoReact = botConfig.get("autoReactStatus");
      const emoji = botConfig.get("statusReactEmoji");
      
      return repondre(`📊 *Configuration Statuts*\n\n👁️ Auto-vue: ${autoView ? "✅ Activé" : "❌ Désactivé"}\n❤️ Auto-react: ${autoReact ? "✅ Activé" : "❌ Désactivé"}\n😀 Emoji: ${emoji}\n\n💡 Usage:\n• .statusconfig view - Toggle auto-vue\n• .statusconfig react - Toggle auto-react\n• .statusconfig emoji 🔥 - Changer emoji`);
    }
    
    if (option === "view") {
      const result = botConfig.toggle("autoViewStatus", msg.pushName || "owner");
      return repondre(result.message);
    }
    
    if (option === "react") {
      const result = botConfig.toggle("autoReactStatus", msg.pushName || "owner");
      return repondre(result.message);
    }
    
    if (option === "emoji" && arg[1]) {
      const result = botConfig.set("statusReactEmoji", arg[1], msg.pushName || "owner");
      return repondre(result.message);
    }
    
    repondre("❌ Option invalide. Utilisez: view, react, ou emoji [emoji]");
  }
);

console.log("[CMD] ✅ Config.js chargé - Commandes: config, setmode, setprefixe, protection, statusconfig");
