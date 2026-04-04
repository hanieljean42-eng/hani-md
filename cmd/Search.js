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
const { ytSearch } = require("../lib/dl");

const UA = "HANI-MD-Bot/2.0 (WhatsApp Bot)";
const TMDB_KEY = process.env.TMDB_API_KEY || "8265bd1679663a7ea12ac168da84d2e8";

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

      repondre(`🔍 *Recherche Google*\n\n🔎 ${query}\n\n🔗 https://www.google.com/search?q=${encodeURIComponent(query)}\n\n✨ Powered by HANI-MD`);

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

      let results;
      try { results = await ytSearch(query); } catch(e) { results = []; }

      if (results && results.length > 0) {
        let text = `🎬 *Résultats YouTube*\n\n🔎 Recherche: ${query}\n\n`;
        results.slice(0, 5).forEach((v, i) => {
          text += `*${i + 1}. ${v.title}*\n`;
          text += `⏱️ ${v.duration || "N/A"} | 👁️ ${v.views || "N/A"}\n`;
          text += `🔗 ${v.url}\n\n`;
        });
        text += `💡 Utilisez .ytaudio ou .ytvideo pour télécharger\n✨ Powered by HANI-MD`;
        if (results[0]?.thumbnail) {
          await ovl.sendMessage(msg.key.remoteJid, { image: { url: results[0].thumbnail }, caption: text }, { quoted: ms });
        } else { repondre(text); }
      } else {
        repondre(`🎬 *Recherche YouTube*\n\n🔗 https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
      }

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

      const apiUrl = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(apiUrl, { timeout: 10000, headers: { "User-Agent": UA } });
        
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

      try {
        const parts = query.split(/[-–]/).map(p => p.trim());
        const artist = parts[0] || query;
        const title = parts[1] || query;
        const lyricsResp = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 15000, headers: { "User-Agent": UA } });
        if (lyricsResp.data?.lyrics) {
          let lyrics = lyricsResp.data.lyrics;
          if (lyrics.length > 4000) lyrics = lyrics.substring(0, 4000) + "\n\n... [Paroles tronquées]";
          return repondre(`🎵 *Paroles*\n\n🎤 ${title}\n👤 ${artist}\n\n📝 *Lyrics:*\n\n${lyrics}\n\n✨ Powered by HANI-MD`);
        }
      } catch (e) {}

      repondre(`❌ Paroles non trouvées pour "${query}"\n\n💡 Format: .lyrics Artiste - Titre`);

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

      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?nologo=true&width=512&height=512&seed=${Math.floor(Math.random()*99999)}`;
      try {
        await ovl.sendMessage(msg.key.remoteJid, {
          image: { url: imgUrl },
          caption: `🖼️ *Image: ${query}*\n✨ Powered by HANI-MD`
        }, { quoted: ms });
      } catch(e) {
        repondre(`❌ Impossible de charger l'image pour "${query}"`);
      }

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

      try {
        const tmdbResp = await axios.get(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${TMDB_KEY}&language=fr`, { timeout: 10000 });
        const movie = tmdbResp.data?.results?.[0];
        if (movie) {
          const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
          const info = `🎬 *${movie.title}* (${movie.release_date?.split('-')[0] || 'N/A'})\n\n📊 Note: ⭐ ${movie.vote_average?.toFixed(1)}/10\n� Langue: ${movie.original_language?.toUpperCase() || 'N/A'}\n\n📝 Synopsis:\n${movie.overview || 'Aucun synopsis.'}\n\n✨ Powered by HANI-MD`;
          if (posterUrl) {
            await ovl.sendMessage(msg.key.remoteJid, { image: { url: posterUrl }, caption: info }, { quoted: ms });
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
