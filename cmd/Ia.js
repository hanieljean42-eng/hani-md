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

// ─── Helper IA — Pollinations.ai (gratuit, sans clé) + Gemini en fallback ─────
async function askGemini(prompt) {
  // 1ère tentative : Pollinations.ai text (100% gratuit, aucune clé requise)
  try {
    const res = await axios.post(
      "https://text.pollinations.ai/",
      { messages: [{ role: "user", content: prompt }], model: "openai", seed: Math.floor(Math.random() * 99999) },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );
    const text = typeof res.data === "string" ? res.data : res.data?.choices?.[0]?.message?.content;
    if (text && text.trim()) return text.trim();
  } catch(e) {}

  // 2ème tentative : Google Gemini REST API (si clé disponible)
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
      );
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch(e) {}
  }

  throw new Error("Service IA temporairement indisponible. Réessayez dans quelques secondes.");
}

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

      let response;
      try {
        response = await askGemini(question);
      } catch(e) {
        return repondre(`❌ ${e.message}`);
      }

      if (response.length > 4000) response = response.substring(0, 4000) + "\n\n... [Réponse tronquée]";
      repondre(`🤖 *HANI-AI*\n\n❓ *Question:*\n${question}\n\n💡 *Réponse:*\n${response}\n\n✨ Powered by HANI-MD`);

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

      let response;
      try {
        response = await askGemini(question);
      } catch(e) {
        return repondre(`❌ ${e.message}`);
      }

      if (response.length > 4000) response = response.substring(0, 4000) + "\n\n... [Réponse tronquée]";
      repondre(`💎 *Google Gemini*\n\n❓ *Question:*\n${question}\n\n💡 *Réponse:*\n${response}\n\n✨ Powered by HANI-MD`);

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

      // Pollinations.ai — génération d'images gratuite sans clé
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&width=768&height=768&seed=${Math.floor(Math.random()*99999)}`;
      try {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: { url: imageUrl },
          caption: `🎨 *HANI-AI Image*\n\n📝 Prompt: ${prompt}\n\n✨ Powered by HANI-MD`
        }, { quoted: ms });
      } catch(e) {
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
      try {
        const summary = await askGemini(prompt);
        repondre(`📝 *Résumé*\n\n${summary}\n\n✨ Powered by HANI-MD`);
      } catch(e) {
        repondre(`❌ ${e.message}`);
      }

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
      try {
        let code = await askGemini(prompt);
        if (code.length > 4000) code = code.substring(0, 4000) + "\n\n... [Code tronqué]";
        repondre(`💻 *Code Assistant*\n\n📝 Demande: ${request}\n\n${code}\n\n✨ Powered by HANI-MD`);
      } catch(e) {
        repondre(`❌ ${e.message}`);
      }

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

      const prompt = `Traduis ce texte en ${targetLang} de manière naturelle et fluide:\n\n"${text}". Donne uniquement la traduction, rien d'autre.`;
      try {
        const translation = await askGemini(prompt);
        repondre(`🌐 *Traduction IA*\n\n📝 Original: ${text}\n🎯 Langue: ${targetLang}\n\n✅ Traduction:\n${translation}\n\n✨ Powered by HANI-MD`);
      } catch(e) {
        repondre(`❌ ${e.message}`);
      }

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
      try {
        const quiz = await askGemini(prompt);
        repondre(`🧠 *Quiz IA*\n\n📚 Sujet: ${topic}\n\n${quiz}\n\n✨ Powered by HANI-MD`);
      } catch(e) {
        repondre(`❌ ${e.message}`);
      }

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
      try {
        const story = await askGemini(prompt);
        repondre(`📖 *Histoire*\n\n🎭 Thème: ${theme}\n\n${story}\n\n✨ Powered by HANI-MD`);
      } catch(e) {
        repondre(`❌ ${e.message}`);
      }

    } catch (error) {
      console.error("[STORY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Ia.js chargé - Commandes: gpt, gemini, dalle, summarize, code, aitranslate, aiquiz, story");
