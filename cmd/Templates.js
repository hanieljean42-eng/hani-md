/**
 * ═══════════════════════════════════════════════════════════
 * 📋 HANI-MD - Templates de Réponses
 * ═══════════════════════════════════════════════════════════
 * Réponses rapides aux questions fréquentes
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");

const TEMPLATES_FILE = path.join(__dirname, "../DataBase/response_templates.json");

function loadTemplates() {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      return JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveTemplates(data) {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// ➕ AJOUTER UN TEMPLATE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "addtemplate",
    classe: "Productivité",
    react: "📋",
    desc: "Créer un template de réponse",
    alias: ["newtemplate", "savetemplate"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const fullText = arg.join(" ");
      const parts = fullText.split("|");
      
      if (parts.length < 2) {
        return repondre("❌ *Format invalide!*\n\n📝 Utilisation:\n.addtemplate [mot-clé]|[réponse]\n\n📌 Exemple:\n.addtemplate prix|Nos services commencent à 5000 FCFA. Contactez-nous pour un devis personnalisé!");
      }

      const keyword = parts[0].trim().toLowerCase();
      const response = parts.slice(1).join("|").trim();

      if (!keyword || !response) {
        return repondre("❌ Le mot-clé et la réponse ne peuvent pas être vides");
      }

      const templates = loadTemplates();
      if (!templates[auteurMessage]) templates[auteurMessage] = {};
      
      templates[auteurMessage][keyword] = {
        response: response,
        createdAt: new Date().toISOString(),
        useCount: 0
      };

      saveTemplates(templates);
      repondre(`✅ *Template créé!*\n\n🔑 Mot-clé: "${keyword}"\n💬 Réponse: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"\n\n💡 Utilisez: .template ${keyword}`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💬 UTILISER UN TEMPLATE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "template",
    classe: "Productivité",
    react: "💬",
    desc: "Envoyer un template sauvegardé",
    alias: ["tmp", "t"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const keyword = arg[0]?.toLowerCase();
      if (!keyword) {
        return repondre("❌ Utilisation: .template [mot-clé]\n\n💡 Voir vos templates avec .templates");
      }

      const templates = loadTemplates();
      const userTemplates = templates[auteurMessage] || {};

      if (!userTemplates[keyword]) {
        return repondre(`❌ Template "${keyword}" introuvable\n\n💡 Voir vos templates: .templates`);
      }

      userTemplates[keyword].useCount++;
      userTemplates[keyword].lastUsed = new Date().toISOString();
      saveTemplates(templates);

      repondre(userTemplates[keyword].response);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTER LES TEMPLATES
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "templates",
    classe: "Productivité",
    react: "📋",
    desc: "Voir tous vos templates",
    alias: ["mytemplates", "listtemplates"]
  },
  async (ovl, msg, { repondre, auteurMessage }) => {
    try {
      const templates = loadTemplates();
      const userTemplates = templates[auteurMessage] || {};
      const keys = Object.keys(userTemplates);

      if (keys.length === 0) {
        return repondre("📋 *Vos Templates*\n\nAucun template créé.\n\n💡 Créer un template:\n.addtemplate prix|Nos tarifs...");
      }

      let text = `📋 *Vos Templates (${keys.length})*\n\n`;
      keys.forEach(k => {
        const t = userTemplates[k];
        const uses = t.useCount || 0;
        text += `🔑 ${k}\n   💬 ${t.response.substring(0, 40)}${t.response.length > 40 ? '...' : ''}\n   📊 Utilisé ${uses} fois\n\n`;
      });
      text += `💡 Utilisez: .template [mot-clé]`;

      repondre(text);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🗑️ SUPPRIMER UN TEMPLATE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "deltemplate",
    classe: "Productivité",
    react: "🗑️",
    desc: "Supprimer un template",
    alias: ["rmtemplate", "deletetemplate"]
  },
  async (ovl, msg, { arg, repondre, auteurMessage }) => {
    try {
      const keyword = arg[0]?.toLowerCase();
      if (!keyword) {
        return repondre("❌ Utilisation: .deltemplate [mot-clé]");
      }

      const templates = loadTemplates();
      if (!templates[auteurMessage] || !templates[auteurMessage][keyword]) {
        return repondre(`❌ Template "${keyword}" introuvable`);
      }

      delete templates[auteurMessage][keyword];
      saveTemplates(templates);
      repondre(`✅ *Template "${keyword}" supprimé!*`);
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Templates.js chargé - Commandes: addtemplate, template, templates, deltemplate");
