/**
 * ═══════════════════════════════════════════════════════════
 * 🛠️ HANI-MD - Commandes Outils
 * ═══════════════════════════════════════════════════════════
 * Calcul, QR Code, raccourcisseur, etc.
 * NOTE: Stickers dans Conversion.js
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// NOTE: sticker et toimg sont dans Conversion.js

// ═══════════════════════════════════════════════════════════
// 🧮 CALCULATRICE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "calculate",
    classe: "Outils",
    react: "🧮",
    desc: "Calculatrice mathématique",
    alias: ["calcul", "math"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const expression = arg.join(" ");
      if (!expression) {
        return repondre("❌ Utilisation: .calculate [expression]\n📝 Exemple: .calculate 2+2*3");
      }

      // Vérifier que l'expression est sûre (pas de code malveillant)
      if (!/^[\d\s\+\-\*\/\(\)\.\,\%\^]+$/.test(expression.replace(/x/gi, "*"))) {
        return repondre("❌ Expression invalide. Utilisez uniquement des nombres et opérateurs (+, -, *, /, %, ^)");
      }

      // Remplacer les opérateurs courants
      let safeExpression = expression
        .replace(/x/gi, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**")
        .replace(/,/g, ".");

      // Calculer
      const result = eval(safeExpression);

      if (isNaN(result) || !isFinite(result)) {
        return repondre("❌ Résultat invalide (division par zéro ou erreur)");
      }

      repondre(`🧮 *Calculatrice*\n\n📝 Expression: ${expression}\n✅ Résultat: *${result}*`);

    } catch (error) {
      console.error("[CALC]", error);
      repondre(`❌ Erreur de calcul: ${error.message}`);
    }
  }
);

// NOTE: TTS supprimé (API Google cassée)

// ═══════════════════════════════════════════════════════════
// 📊 QR CODE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "qrcode",
    classe: "Outils",
    react: "📊",
    desc: "Générer un QR Code",
    alias: ["qr", "generateqr"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const text = arg.join(" ");
      if (!text) {
        return repondre("❌ Utilisation: .qrcode [texte ou lien]");
      }

      await repondre("📊 Génération du QR Code...");

      // API QR Code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;

      await ovl.sendMessage(msg.key.remoteJid, {
        image: { url: qrUrl },
        caption: `📊 *QR Code*\n\n📝 Contenu: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}\n\n✅ Powered by HANI-MD`
      }, { quoted: ms });

    } catch (error) {
      console.error("[QRCODE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔗 RACCOURCISSEUR DE LIENS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "shorturl",
    classe: "Outils",
    react: "🔗",
    desc: "Raccourcir un lien",
    alias: ["short", "tinyurl"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const url = arg[0];
      if (!url) {
        return repondre("❌ Utilisation: .shorturl [lien]");
      }

      // Vérifier si c'est une URL valide
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return repondre("❌ URL invalide. Utilisez http:// ou https://");
      }

      // API TinyURL
      const shortUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
      const response = await axios.get(shortUrl);

      repondre(`🔗 *Lien raccourci*\n\n📝 Original: ${url.substring(0, 50)}${url.length > 50 ? "..." : ""}\n✅ Court: ${response.data}`);

    } catch (error) {
      console.error("[SHORTURL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎲 GÉNÉRATEUR DE MOT DE PASSE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "password",
    classe: "Outils",
    react: "🔐",
    desc: "Générer un mot de passe aléatoire",
    alias: ["pwd", "genpass"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const length = parseInt(arg[0]) || 16;
      
      if (length < 6) {
        return repondre("❌ Le mot de passe doit avoir au moins 6 caractères");
      }
      
      if (length > 64) {
        return repondre("❌ Le mot de passe ne peut pas dépasser 64 caractères");
      }

      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
      let password = "";
      
      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      repondre(`🔐 *Générateur de mot de passe*\n\n🔑 Longueur: ${length} caractères\n✅ Mot de passe:\n\n\`${password}\`\n\n⚠️ Gardez-le en sécurité!`);

    } catch (error) {
      console.error("[PASSWORD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 BASE64 ENCODE/DECODE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "base64",
    classe: "Outils",
    react: "📝",
    desc: "Encoder/Décoder en Base64",
    alias: ["b64", "encode"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ Utilisation:\n.base64 encode [texte]\n.base64 decode [texte]");
      }

      const action = arg[0].toLowerCase();
      const text = arg.slice(1).join(" ");

      if (!text) {
        return repondre("❌ Veuillez fournir un texte");
      }

      let result;
      if (action === "encode" || action === "e") {
        result = Buffer.from(text).toString("base64");
        repondre(`📝 *Base64 Encoder*\n\n📥 Entrée: ${text}\n✅ Sortie:\n\n\`${result}\``);
      } else if (action === "decode" || action === "d") {
        result = Buffer.from(text, "base64").toString("utf-8");
        repondre(`📝 *Base64 Decoder*\n\n📥 Entrée: ${text}\n✅ Sortie:\n\n\`${result}\``);
      } else {
        repondre("❌ Action invalide. Utilisez 'encode' ou 'decode'");
      }

    } catch (error) {
      console.error("[BASE64]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 TRADUIRE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "translate",
    classe: "Outils",
    react: "🌐",
    desc: "Traduire du texte",
    alias: ["trad", "tr"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ Utilisation: .translate [langue] [texte]\n📝 Exemple: .translate en Bonjour le monde");
      }

      const targetLang = arg[0];
      const text = arg.slice(1).join(" ");

      if (!text) {
        return repondre("❌ Veuillez fournir un texte à traduire");
      }

      // API Google Translate
      const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await axios.get(translateUrl);
      const translated = response.data[0].map(x => x[0]).join("");

      repondre(`🌐 *Traduction*\n\n📝 Original: ${text}\n🎯 Langue: ${targetLang}\n✅ Traduction:\n\n${translated}`);

    } catch (error) {
      console.error("[TRANSLATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📅 DATE ET HEURE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "datetime",
    classe: "Outils",
    react: "📅",
    desc: "Afficher la date et l'heure actuelles",
    alias: ["date", "time", "heure"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const now = new Date();
      const options = { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Africa/Abidjan"
      };

      const dateStr = now.toLocaleDateString("fr-FR", options);
      const timeStr = now.toLocaleTimeString("fr-FR", { timeZone: "Africa/Abidjan" });

      repondre(`📅 *Date et Heure*\n\n📆 ${dateStr}\n🕐 Heure: ${timeStr}\n🌍 Fuseau: Africa/Abidjan (GMT)`);

    } catch (error) {
      console.error("[DATETIME]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Outils.js chargé - Commandes: sticker2, toimg2, calculate, tts2, qrcode, shorturl, password, base64, translate, datetime");
