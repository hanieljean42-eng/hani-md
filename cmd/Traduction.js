/**
 * ═══════════════════════════════════════════════════════════
 * 🌍 HANI-MD - Traduction
 * ═══════════════════════════════════════════════════════════
 * Parle avec n'importe qui dans n'importe quelle langue
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

const LANGUAGES = {
  fr: "Français", en: "Anglais", es: "Espagnol", de: "Allemand",
  it: "Italien", pt: "Portugais", ar: "Arabe", zh: "Chinois",
  ja: "Japonais", ko: "Coréen", ru: "Russe", hi: "Hindi",
  sw: "Swahili", nl: "Néerlandais", tr: "Turc", pl: "Polonais"
};

// ═══════════════════════════════════════════════════════════
// 🌍 TRADUIRE UN TEXTE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "trad",
    classe: "Outils",
    react: "🌍",
    desc: "Traduire du texte (.trad en Bonjour)",
    alias: ["translate", "traduire"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      if (arg.length < 2) {
        return repondre("❌ *Utilisation:*\n.trad [langue] [texte]\n\n📌 *Exemples:*\n.trad en Bonjour\n.trad es ¿Cómo estás?\n.trad ar Hello\n\n📝 *Langues:* fr, en, es, de, it, pt, ar, zh, ja, ko, ru, hi, sw, nl, tr, pl");
      }

      const targetLang = arg[0].toLowerCase();
      const text = arg.slice(1).join(" ");

      if (!LANGUAGES[targetLang]) {
        return repondre(`❌ Langue "${targetLang}" non supportée\n\n✅ Langues: ${Object.keys(LANGUAGES).join(", ")}`);
      }

      await repondre("🌍 Traduction en cours...");

      // Utiliser l'API MyMemory (gratuite, pas de clé requise)
      try {
        const response = await axios.get(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`,
          { timeout: 10000 }
        );

        if (response.data && response.data.responseData) {
          const translated = response.data.responseData.translatedText;
          const detected = response.data.responseData.match || "auto";
          
          repondre(`🌍 *Traduction*\n\n📝 Original (${detected}):\n${text}\n\n✅ ${LANGUAGES[targetLang]}:\n${translated}`);
        } else {
          repondre("❌ Erreur de traduction - service temporairement indisponible");
        }
      } catch (apiError) {
        console.error("[TRAD] API Error:", apiError.message);
        repondre("❌ Service de traduction temporairement indisponible\n\n💡 Réessayez plus tard");
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔄 DÉTECTER LA LANGUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "langue",
    classe: "Outils",
    react: "🔍",
    desc: "Détecter la langue d'un texte",
    alias: ["detectlang", "language"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const text = arg.join(" ");
      if (!text) {
        return repondre("❌ Utilisation: .langue [texte à analyser]");
      }

      await repondre("🔍 Analyse en cours...");

      try {
        const response = await axios.get(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`,
          { timeout: 10000 }
        );

        const detected = response.data?.responseData?.match || "inconnue";
        const langName = LANGUAGES[detected] || detected;

        repondre(`🔍 *Détection de langue*\n\n📝 Texte: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n\n✅ Langue détectée: *${langName}* (${detected})`);
      } catch (e) {
        repondre("❌ Impossible de détecter la langue");
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📚 DICTIONNAIRE MULTILINGUE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "dico",
    classe: "Outils",
    react: "📚",
    desc: "Définition d'un mot (Français/Anglais)",
    alias: ["def", "definition"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const word = arg[0];
      if (!word) {
        return repondre("❌ Utilisation: .dico [mot]");
      }

      await repondre("📚 Recherche...");

      // API Wiktionnaire simplifiée
      try {
        const response = await axios.get(
          `https://fr.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=extracts&explaintext&exsentences=3&format=json`,
          { timeout: 10000 }
        );

        const pages = response.data?.query?.pages;
        if (pages && pages[-1]) {
          return repondre(`❌ Mot "${word}" non trouvé dans le dictionnaire`);
        }

        repondre(`📚 *${word}*\n\n💡 Définition disponible sur:\nhttps://fr.wiktionary.org/wiki/${encodeURIComponent(word)}\n\n📖 Pour une définition détaillée, consultez le lien ci-dessus.`);
      } catch (e) {
        repondre(`📚 *${word}*\n\n🔗 https://fr.wiktionary.org/wiki/${encodeURIComponent(word)}`);
      }
    } catch (error) {
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Traduction.js chargé - Commandes: trad, langue, dico");
