/**
 * ═══════════════════════════════════════════════════════════
 * 👥 HANI-MD - Gestion Multi-Comptes
 * ═══════════════════════════════════════════════════════════
 * Gérez plusieurs numéros WhatsApp
 * ═══════════════════════════════════════════════════════════
 * 
 * ⚠️ NOTE: Cette fonctionnalité nécessite une architecture
 * spécifique pour gérer plusieurs instances. Cette version
 * fournit les commandes de base et la structure.
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const MULTIACCOUNT_FILE = path.join(__dirname, "../DataBase/multiaccount_config.json");

function loadConfig() {
  try {
    if (fs.existsSync(MULTIACCOUNT_FILE)) {
      return JSON.parse(fs.readFileSync(MULTIACCOUNT_FILE, "utf8"));
    }
  } catch (e) {}
  return { accounts: [], activeAccount: 0 };
}

function saveConfig(data) {
  try {
    fs.writeFileSync(MULTIACCOUNT_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
// 👥 AJOUTER UN COMPTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "addaccount",
    classe: "Système",
    react: "➕",
    desc: "Ajouter un compte WhatsApp (structure)",
    alias: ["newaccount", "linkaccount"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const phone = arg[0]?.replace(/[^0-9]/g, "");
      const name = arg[1] || `Compte ${phone?.slice(-4) || "Nouveau"}`;

      if (!phone || phone.length < 10) {
        return repondre("❌ *Utilisation:*\n.addaccount [numéro] [nom]\n\n📌 Exemple:\n.addaccount 22501234567 Travail");
      }

      const config = loadConfig();
      const exists = config.accounts.find(a => a.phone === phone);

      if (exists) {
        return repondre(`❌ Le compte ${phone} existe déjà`);
      }

      config.accounts.push({
        id: config.accounts.length + 1,
        name: name,
        phone: phone,
        addedAt: new Date().toISOString(),
        status: "pending", // pending, active, disconnected
        sessionPath: `./sessions/${phone}`
      });

      saveConfig(config);

      repondre(`➕ *Compte ajouté*\n\n📱 Numéro: ${phone}\n🏷️ Nom: ${name}\n🔢 ID: ${config.accounts.length}\n\n⚠️ *IMPORTANT:*\nLe multi-compte nécessite de:\n1. Créer un dossier de session séparé\n2. Scanner un QR code différent\n3. Gérer les instances multiples\n\n💡 Cette structure est prête mais nécessite une configuration avancée du serveur.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTER LES COMPTES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "accounts",
    classe: "Système",
    react: "📋",
    desc: "Voir tous les comptes configurés",
    alias: ["listaccounts", "mescomptes"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const config = loadConfig();

      if (config.accounts.length === 0) {
        return repondre("📋 *Multi-Comptes*\n\nAucun compte configuré.\n\n💡 Ajouter un compte:\n.addaccount 22501234567 Perso");
      }

      let text = `📋 *Vos Comptes (${config.accounts.length})*\n\n`;
      
      config.accounts.forEach(a => {
        const statusEmoji = a.status === "active" ? "🟢" : a.status === "pending" ? "🟡" : "🔴";
        text += `${a.id}. ${statusEmoji} *${a.name}*\n`;
        text += `   📱 ${a.phone}\n`;
        text += `   💼 Status: ${a.status}\n\n`;
      });

      text += `💡 *Commandes:*\n`;
      text += `• .switch [id] → Changer de compte\n`;
      text += `• .delaccount [id] → Supprimer\n`;
      text += `• .accountinfo [id] → Détails\n\n`;
      text += `🔢 Actif: Compte #${config.activeAccount || 1}`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 BASCULER DE COMPTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "switch",
    classe: "Système",
    react: "🔄",
    desc: "Basculer sur un autre compte",
    alias: ["useaccount", "basculer"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const accountId = parseInt(arg[0]);
      if (!accountId) {
        return repondre("❌ Utilisation: .switch [numéro_compte]\n\n💡 Voir les comptes: .accounts");
      }

      const config = loadConfig();
      const account = config.accounts.find(a => a.id === accountId);

      if (!account) {
        return repondre(`❌ Compte #${accountId} introuvable`);
      }

      config.activeAccount = accountId;
      saveConfig(config);

      repondre(`🔄 *Basculé sur le compte #${accountId}*\n\n🏷️ ${account.name}\n📱 ${account.phone}\n\n⚠️ *Note:* Le changement de compte en temps réel nécessite un redémarrage ou une architecture spécifique avec PM2/Cluster.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER UN COMPTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "delaccount",
    classe: "Système",
    react: "🗑️",
    desc: "Supprimer un compte de la liste",
    alias: ["removeaccount", "unlink"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const accountId = parseInt(arg[0]);
      if (!accountId) {
        return repondre("❌ Utilisation: .delaccount [numéro]");
      }

      const config = loadConfig();
      const idx = config.accounts.findIndex(a => a.id === accountId);

      if (idx === -1) {
        return repondre(`❌ Compte #${accountId} introuvable`);
      }

      const deleted = config.accounts[idx];
      config.accounts.splice(idx, 1);
      
      // Réordonner les IDs
      config.accounts.forEach((a, i) => a.id = i + 1);
      
      saveConfig(config);

      repondre(`🗑️ *Compte supprimé*\n\n🏷️ ${deleted.name}\n📱 ${deleted.phone}\n\n💡 La session associée n'est pas supprimée automatiquement.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ℹ️ INFO MULTI-COMPTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "multiinfo",
    classe: "Système",
    react: "ℹ️",
    desc: "Informations sur le multi-compte",
    alias: ["multiguide", "accounthelp"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Commande réservée au propriétaire");
      }

      const config = loadConfig();

      repondre(`ℹ️ *Guide Multi-Comptes*\n\n📊 *Configuration actuelle:*\n• Comptes: ${config.accounts.length}\n• Actif: #${config.activeAccount || 1}\n\n📝 *Architecture recommandée:*\n\n*Option 1 - PM2 (Recommandée):*\nCréer plusieurs instances:\n\`pm2 start hani.js --name hani-1\`\n\`pm2 start hani.js --name hani-2\`\n\n*Option 2 - Docker:*\nUn container par numéro\n\n*Option 3 - Render (Gratuit):*\nDéployer 2 services séparés\n\n💡 *Cette version fournit:*\n✅ Gestion de la liste des comptes\n✅ Basculement logique\n⚠️ Nécessite config serveur pour multi-instance\n\n📚 Documentation complète disponible sur demande.`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

module.exports = { loadConfig, saveConfig };

console.log("[CMD] ✅ MultiAccount.js chargé - Commandes: addaccount, accounts, switch, delaccount, multiinfo");
