/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - Commandes Intelligence Artificielle
 * ═══════════════════════════════════════════════════════════
 * GPT, Gemini, DALL-E, génération d'images
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// 🤖 GPT / CHATGPT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "gpt",
    classe: "IA",
    react: "🤖",
    desc: "Discuter avec ChatGPT",
    alias: ["chatgpt", "ai", "openai"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const question = arg.join(" ");
      if (!question) {
        return repondre("❌ Utilisation: .gpt [question]\n\n📝 Exemple: .gpt Explique-moi la photosynthèse");
      }

      await repondre("🤖 Réflexion en cours...");

      // APIs GPT gratuites
      const apis = [
        `https://api.vrfrnd.xyz/api/gpt?prompt=${encodeURIComponent(question)}`,
        `https://api.agatz.xyz/api/gpt4?message=${encodeURIComponent(question)}`,
        `https://api.itzpire.com/ai/gpt?text=${encodeURIComponent(question)}`
      ];

      let response = null;
      
      for (const apiUrl of apis) {
        try {
          const res = await axios.get(apiUrl, { timeout: 30000 });
          
          if (res.data) {
            // Différents formats de réponse
            response = res.data.result || res.data.response || res.data.answer || res.data.message || res.data.data;
            
            if (response && typeof response === "string" && response.length > 10) {
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (response) {
        // Limiter la longueur
        if (response.length > 4000) {
          response = response.substring(0, 4000) + "\n\n... [Réponse tronquée]";
        }
        
        let result = `🤖 *ChatGPT*\n\n`;
        result += `❓ *Question:*\n${question}\n\n`;
        result += `💡 *Réponse:*\n${response}\n\n`;
        result += `✨ Powered by HANI-MD`;
        
        repondre(result);
      } else {
        repondre("❌ Désolé, je n'ai pas pu obtenir de réponse. Réessayez plus tard.");
      }

    } catch (error) {
      console.error("[GPT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💎 GEMINI (Google AI)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "gemini",
    classe: "IA",
    react: "💎",
    desc: "Discuter avec Google Gemini",
    alias: ["bard", "googleai"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const question = arg.join(" ");
      if (!question) {
        return repondre("❌ Utilisation: .gemini [question]");
      }

      await repondre("💎 Gemini réfléchit...");

      // API Gemini
      const apiUrl = `https://api.vrfrnd.xyz/api/gemini?prompt=${encodeURIComponent(question)}`;
      
      try {
        const res = await axios.get(apiUrl, { timeout: 30000 });
        
        if (res.data && (res.data.result || res.data.response)) {
          let response = res.data.result || res.data.response;
          
          if (response.length > 4000) {
            response = response.substring(0, 4000) + "\n\n... [Réponse tronquée]";
          }
          
          let result = `💎 *Google Gemini*\n\n`;
          result += `❓ *Question:*\n${question}\n\n`;
          result += `💡 *Réponse:*\n${response}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      // Fallback vers GPT
      repondre("❌ Gemini non disponible. Essayez .gpt à la place.");

    } catch (error) {
      console.error("[GEMINI]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎨 DALL-E (Génération d'images)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dalle",
    classe: "IA",
    react: "🎨",
    desc: "Générer une image avec DALL-E",
    alias: ["imagine", "generate", "createimg"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const prompt = arg.join(" ");
      if (!prompt) {
        return repondre("❌ Utilisation: .dalle [description de l'image]\n\n📝 Exemple: .dalle Un chat astronaute sur la lune");
      }

      await repondre("🎨 Génération de l'image en cours... (peut prendre 30-60 secondes)");

      // APIs de génération d'images
      const apis = [
        `https://api.vrfrnd.xyz/api/dalle?prompt=${encodeURIComponent(prompt)}`,
        `https://api.itzpire.com/ai/generate-image?prompt=${encodeURIComponent(prompt)}`
      ];

      let imageUrl = null;
      
      for (const apiUrl of apis) {
        try {
          const res = await axios.get(apiUrl, { timeout: 60000 });
          
          if (res.data) {
            imageUrl = res.data.result || res.data.url || res.data.image || res.data.data;
            
            if (imageUrl && imageUrl.startsWith("http")) {
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (imageUrl) {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: { url: imageUrl },
          caption: `🎨 *DALL-E*\n\n📝 Prompt: ${prompt}\n\n✨ Powered by HANI-MD`
        }, { quoted: ms });
      } else {
        repondre("❌ Impossible de générer l'image. Réessayez avec un autre prompt.");
      }

    } catch (error) {
      console.error("[DALLE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 RÉSUMÉ DE TEXTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "summarize",
    classe: "IA",
    react: "📝",
    desc: "Résumer un texte",
    alias: ["resume", "summary"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const text = arg.join(" ");
      if (!text || text.length < 50) {
        return repondre("❌ Utilisation: .summarize [texte long à résumer]\n\n⚠️ Le texte doit contenir au moins 50 caractères.");
      }

      await repondre("📝 Résumé en cours...");

      const prompt = `Résume ce texte en quelques phrases clés:\n\n${text}`;
      const apiUrl = `https://api.vrfrnd.xyz/api/gpt?prompt=${encodeURIComponent(prompt)}`;
      
      try {
        const res = await axios.get(apiUrl, { timeout: 30000 });
        
        if (res.data && res.data.result) {
          let result = `📝 *Résumé*\n\n`;
          result += `${res.data.result}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      repondre("❌ Impossible de résumer le texte. Réessayez.");

    } catch (error) {
      console.error("[SUMMARIZE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 💻 CODE ASSISTANT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "code",
    classe: "IA",
    react: "💻",
    desc: "Générer du code avec l'IA",
    alias: ["coder", "programming"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const request = arg.join(" ");
      if (!request) {
        return repondre("❌ Utilisation: .code [description du code]\n\n📝 Exemple: .code Fonction Python pour calculer le factoriel");
      }

      await repondre("💻 Génération du code...");

      const prompt = `Génère du code pour: ${request}. Fournis uniquement le code avec des commentaires explicatifs.`;
      const apiUrl = `https://api.vrfrnd.xyz/api/gpt?prompt=${encodeURIComponent(prompt)}`;
      
      try {
        const res = await axios.get(apiUrl, { timeout: 30000 });
        
        if (res.data && res.data.result) {
          let code = res.data.result;
          
          if (code.length > 4000) {
            code = code.substring(0, 4000) + "\n\n... [Code tronqué]";
          }
          
          let result = `💻 *Code Assistant*\n\n`;
          result += `📝 Demande: ${request}\n\n`;
          result += `${code}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      repondre("❌ Impossible de générer le code. Réessayez.");

    } catch (error) {
      console.error("[CODE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🌐 TRADUCTION IA
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "aitranslate",
    classe: "IA",
    react: "🌐",
    desc: "Traduire avec l'IA (meilleure qualité)",
    alias: ["aitrad", "smarttranslate"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ Utilisation: .aitranslate [langue] [texte]\n\n📝 Exemple: .aitranslate anglais Bonjour comment vas-tu?");
      }

      const targetLang = arg[0];
      const text = arg.slice(1).join(" ");

      await repondre("🌐 Traduction IA en cours...");

      const prompt = `Traduis ce texte en ${targetLang} de manière naturelle et fluide:\n\n"${text}"`;
      const apiUrl = `https://api.vrfrnd.xyz/api/gpt?prompt=${encodeURIComponent(prompt)}`;
      
      try {
        const res = await axios.get(apiUrl, { timeout: 30000 });
        
        if (res.data && res.data.result) {
          let result = `🌐 *Traduction IA*\n\n`;
          result += `📝 Original: ${text}\n`;
          result += `🎯 Langue: ${targetLang}\n\n`;
          result += `✅ Traduction:\n${res.data.result}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      repondre("❌ Impossible de traduire. Essayez .translate pour une traduction simple.");

    } catch (error) {
      console.error("[AITRANSLATE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🧠 QUIZ IA
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "aiquiz",
    classe: "IA",
    react: "🧠",
    desc: "Générer un quiz sur un sujet",
    alias: ["quizai", "genquiz"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const topic = arg.join(" ") || "culture générale";

      await repondre("🧠 Génération du quiz...");

      const prompt = `Génère une question de quiz sur "${topic}" avec 4 choix de réponses (A, B, C, D) et indique la bonne réponse à la fin. Format clair.`;
      const apiUrl = `https://api.vrfrnd.xyz/api/gpt?prompt=${encodeURIComponent(prompt)}`;
      
      try {
        const res = await axios.get(apiUrl, { timeout: 30000 });
        
        if (res.data && res.data.result) {
          let result = `🧠 *Quiz IA*\n\n`;
          result += `📚 Sujet: ${topic}\n\n`;
          result += `${res.data.result}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      repondre("❌ Impossible de générer le quiz. Réessayez.");

    } catch (error) {
      console.error("[AIQUIZ]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📖 HISTOIRE IA
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "story",
    classe: "IA",
    react: "📖",
    desc: "Générer une histoire",
    alias: ["histoire", "conte"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const theme = arg.join(" ") || "aventure fantastique";

      await repondre("📖 Création de l'histoire...");

      const prompt = `Écris une courte histoire captivante (environ 200 mots) sur le thème: "${theme}". Style narratif engageant.`;
      const apiUrl = `https://api.vrfrnd.xyz/api/gpt?prompt=${encodeURIComponent(prompt)}`;
      
      try {
        const res = await axios.get(apiUrl, { timeout: 30000 });
        
        if (res.data && res.data.result) {
          let result = `📖 *Histoire*\n\n`;
          result += `🎭 Thème: ${theme}\n\n`;
          result += `${res.data.result}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      repondre("❌ Impossible de générer l'histoire. Réessayez.");

    } catch (error) {
      console.error("[STORY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Ia.js chargé - Commandes: gpt, gemini, dalle, summarize, code, aitranslate, aiquiz, story");
