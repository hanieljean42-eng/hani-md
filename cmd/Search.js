/**
 * ═══════════════════════════════════════════════════════════
 * 🔍 HANI-MD - Commandes de Recherche
 * ═══════════════════════════════════════════════════════════
 * Google, YouTube, Wikipedia, Lyrics, etc.
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// 🔍 GOOGLE SEARCH
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "google",
    classe: "Recherche",
    react: "🔍",
    desc: "Rechercher sur Google",
    alias: ["g", "search"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .google [recherche]");
      }

      await repondre("🔍 Recherche en cours...");

      // API de recherche
      const apiUrl = `https://api.vrfrnd.xyz/api/google?query=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        if (response.data && response.data.results) {
          let results = `🔍 *Résultats Google*\n\n🔎 Recherche: ${query}\n\n`;
          
          response.data.results.slice(0, 5).forEach((r, i) => {
            results += `*${i + 1}. ${r.title}*\n`;
            results += `${r.description || ""}\n`;
            results += `🔗 ${r.link}\n\n`;
          });
          
          results += `✨ Powered by HANI-MD`;
          return repondre(results);
        }
      } catch (e) {}

      // Fallback - lien direct
      repondre(`🔍 *Recherche Google*\n\n🔎 ${query}\n\n🔗 https://www.google.com/search?q=${encodeURIComponent(query)}`);

    } catch (error) {
      console.error("[GOOGLE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎬 YOUTUBE SEARCH
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ytsearch",
    classe: "Recherche",
    react: "🎬",
    desc: "Rechercher sur YouTube",
    alias: ["yt", "youtubesearch"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .ytsearch [titre]");
      }

      await repondre("🎬 Recherche YouTube en cours...");

      // API YouTube search
      const apiUrl = `https://api.vrfrnd.xyz/api/ytsearch?query=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        if (response.data && response.data.results) {
          const results = response.data.results.slice(0, 5);
          
          let text = `🎬 *Résultats YouTube*\n\n🔎 Recherche: ${query}\n\n`;
          
          results.forEach((video, i) => {
            text += `*${i + 1}. ${video.title}*\n`;
            text += `⏱️ ${video.duration || "N/A"} | 👁️ ${video.views || "N/A"}\n`;
            text += `🔗 ${video.url}\n\n`;
          });
          
          text += `💡 Utilisez .play [lien] pour télécharger\n`;
          text += `✨ Powered by HANI-MD`;
          
          // Envoyer avec thumbnail du premier résultat
          if (results[0]?.thumbnail) {
            await ovl.sendMessage(msg.key.remoteJid, {
              image: { url: results[0].thumbnail },
              caption: text
            }, { quoted: ms });
          } else {
            repondre(text);
          }
          return;
        }
      } catch (e) {}

      // Fallback
      repondre(`🎬 *Recherche YouTube*\n\n🔗 https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);

    } catch (error) {
      console.error("[YTSEARCH]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📚 WIKIPEDIA
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "wikipedia",
    classe: "Recherche",
    react: "📚",
    desc: "Rechercher sur Wikipedia",
    alias: ["wiki", "w"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .wikipedia [sujet]");
      }

      await repondre("📚 Recherche Wikipedia...");

      // API Wikipedia
      const apiUrl = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        if (response.data) {
          let wiki = `📚 *Wikipedia*\n\n`;
          wiki += `📖 *${response.data.title}*\n\n`;
          wiki += `${response.data.extract || "Aucune description disponible."}\n\n`;
          wiki += `🔗 ${response.data.content_urls?.desktop?.page || ""}\n\n`;
          wiki += `✨ Powered by HANI-MD`;
          
          return repondre(wiki);
        }
      } catch (e) {
        // Si l'article n'existe pas
        if (e.response?.status === 404) {
          return repondre(`❌ Aucun article trouvé pour "${query}"`);
        }
      }

      // Fallback
      repondre(`📚 *Wikipedia*\n\n🔗 https://fr.wikipedia.org/wiki/${encodeURIComponent(query)}`);

    } catch (error) {
      console.error("[WIKIPEDIA]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎵 LYRICS (Paroles)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "lyrics",
    classe: "Recherche",
    react: "🎵",
    desc: "Trouver les paroles d'une chanson",
    alias: ["paroles", "lyric"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .lyrics [artiste - titre]");
      }

      await repondre("🎵 Recherche des paroles...");

      // API Lyrics
      const apiUrl = `https://api.vrfrnd.xyz/api/lyrics?query=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 15000 });
        
        if (response.data && response.data.lyrics) {
          let lyrics = response.data.lyrics;
          
          // Limiter la longueur
          if (lyrics.length > 4000) {
            lyrics = lyrics.substring(0, 4000) + "\n\n... [Paroles tronquées]";
          }
          
          let result = `🎵 *Paroles*\n\n`;
          result += `🎤 ${response.data.title || query}\n`;
          result += `👤 ${response.data.artist || "Artiste inconnu"}\n\n`;
          result += `📝 *Lyrics:*\n\n${lyrics}\n\n`;
          result += `✨ Powered by HANI-MD`;
          
          return repondre(result);
        }
      } catch (e) {}

      // Fallback
      repondre(`❌ Paroles non trouvées pour "${query}"\n\n💡 Essayez: .lyrics Artiste - Titre`);

    } catch (error) {
      console.error("[LYRICS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🌤️ MÉTÉO
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "weather",
    classe: "Recherche",
    react: "🌤️",
    desc: "Météo d'une ville",
    alias: ["meteo", "climat"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const city = arg.join(" ");
      if (!city) {
        return repondre("❌ Utilisation: .weather [ville]");
      }

      await repondre("🌤️ Recherche météo...");

      // API Météo (wttr.in - gratuit)
      const apiUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        if (response.data && response.data.current_condition) {
          const current = response.data.current_condition[0];
          const location = response.data.nearest_area[0];
          
          let weather = `🌤️ *Météo*\n\n`;
          weather += `📍 ${location.areaName[0].value}, ${location.country[0].value}\n\n`;
          weather += `🌡️ Température: ${current.temp_C}°C\n`;
          weather += `🤒 Ressenti: ${current.FeelsLikeC}°C\n`;
          weather += `💧 Humidité: ${current.humidity}%\n`;
          weather += `💨 Vent: ${current.windspeedKmph} km/h\n`;
          weather += `☁️ Condition: ${current.weatherDesc[0].value}\n`;
          weather += `👁️ Visibilité: ${current.visibility} km\n\n`;
          weather += `✨ Powered by HANI-MD`;
          
          return repondre(weather);
        }
      } catch (e) {}

      repondre(`❌ Météo non disponible pour "${city}"`);

    } catch (error) {
      console.error("[WEATHER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📰 NEWS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "news",
    classe: "Recherche",
    react: "📰",
    desc: "Actualités récentes",
    alias: ["actu", "actualites"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const topic = arg.join(" ") || "actualités";

      await repondre("📰 Recherche des actualités...");

      // Lien vers les actualités
      repondre(`📰 *Actualités*\n\n🔎 Sujet: ${topic}\n\n🔗 https://news.google.com/search?q=${encodeURIComponent(topic)}&hl=fr\n\n✨ Powered by HANI-MD`);

    } catch (error) {
      console.error("[NEWS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🖼️ IMAGE SEARCH
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "image",
    classe: "Recherche",
    react: "🖼️",
    desc: "Rechercher des images",
    alias: ["img", "images"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .image [recherche]");
      }

      await repondre("🖼️ Recherche d'images...");

      // API Pinterest/Images
      const apiUrl = `https://api.vrfrnd.xyz/api/pinterest?query=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          const images = response.data.results.slice(0, 5);
          
          for (const img of images) {
            await ovl.sendMessage(msg.key.remoteJid, {
              image: { url: img },
              caption: `🖼️ ${query}\n✨ HANI-MD`
            }, { quoted: ms });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          return;
        }
      } catch (e) {}

      repondre(`❌ Aucune image trouvée pour "${query}"`);

    } catch (error) {
      console.error("[IMAGE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📱 APK SEARCH
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "apk",
    classe: "Recherche",
    react: "📱",
    desc: "Rechercher et télécharger un APK",
    alias: ["app", "playstore"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .apk [nom de l'app]");
      }

      await repondre("📱 Recherche de l'APK...");

      // Lien Play Store
      repondre(`📱 *Recherche APK*\n\n🔎 App: ${query}\n\n🔗 Play Store:\nhttps://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps\n\n💡 Pour télécharger l'APK:\nhttps://apkpure.com/search?q=${encodeURIComponent(query)}\n\n✨ Powered by HANI-MD`);

    } catch (error) {
      console.error("[APK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎬 MOVIE SEARCH
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "movie",
    classe: "Recherche",
    react: "🎬",
    desc: "Rechercher un film",
    alias: ["film", "cinema"]
  },
  async (ovl, msg, { arg, ms, repondre }) => {
    try {
      const query = arg.join(" ");
      if (!query) {
        return repondre("❌ Utilisation: .movie [titre du film]");
      }

      await repondre("🎬 Recherche du film...");

      // API OMDb ou alternative
      const apiUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=d4efcfec`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        if (response.data && response.data.Response !== "False") {
          const movie = response.data;
          
          let info = `🎬 *${movie.Title}* (${movie.Year})\n\n`;
          info += `📊 Note: ⭐ ${movie.imdbRating}/10\n`;
          info += `🎭 Genre: ${movie.Genre}\n`;
          info += `⏱️ Durée: ${movie.Runtime}\n`;
          info += `🎬 Réalisateur: ${movie.Director}\n`;
          info += `🌟 Acteurs: ${movie.Actors}\n\n`;
          info += `📝 Synopsis:\n${movie.Plot}\n\n`;
          info += `✨ Powered by HANI-MD`;
          
          if (movie.Poster && movie.Poster !== "N/A") {
            await ovl.sendMessage(msg.key.remoteJid, {
              image: { url: movie.Poster },
              caption: info
            }, { quoted: ms });
          } else {
            repondre(info);
          }
          return;
        }
      } catch (e) {}

      repondre(`❌ Film non trouvé: "${query}"`);

    } catch (error) {
      console.error("[MOVIE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Search.js chargé - Commandes: google, ytsearch, wikipedia, lyrics, weather, news, image, apk, movie");
