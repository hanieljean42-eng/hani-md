/**
 * ═══════════════════════════════════════════════════════════
 * ⚙️ HANI-MD - Commandes Système
 * ═══════════════════════════════════════════════════════════
 * Ping, uptime, info, aide système
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const os = require("os");

// ═══════════════════════════════════════════════════════════
// 🏓 PING
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ping",
    classe: "Système",
    react: "🏓",
    desc: "Vérifier la latence du bot",
    alias: ["p", "latency"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const start = Date.now();
      await repondre("🏓 Pinging...");
      const end = Date.now();
      
      const latency = end - start;
      let status;
      
      if (latency < 200) {
        status = "🟢 Excellent";
      } else if (latency < 500) {
        status = "🟡 Bon";
      } else if (latency < 1000) {
        status = "🟠 Moyen";
      } else {
        status = "🔴 Lent";
      }

      repondre(`🏓 *PONG!*\n\n⚡ Latence: ${latency}ms\n📊 Status: ${status}`);

    } catch (error) {
      console.error("[PING]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ⏱️ UPTIME
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "uptime",
    classe: "Système",
    react: "⏱️",
    desc: "Temps d'activité du bot",
    alias: ["up", "runtime"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const uptime = process.uptime();
      
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      let uptimeStr = "";
      if (days > 0) uptimeStr += `${days} jour(s) `;
      if (hours > 0) uptimeStr += `${hours} heure(s) `;
      if (minutes > 0) uptimeStr += `${minutes} minute(s) `;
      uptimeStr += `${seconds} seconde(s)`;

      repondre(`⏱️ *Uptime du Bot*\n\n🕐 ${uptimeStr}\n\n🤖 HANI-MD fonctionne parfaitement!`);

    } catch (error) {
      console.error("[UPTIME]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ℹ️ INFO BOT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "botinfo",
    classe: "Système",
    react: "ℹ️",
    desc: "Informations sur le bot",
    alias: ["info", "about"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      let info = `╔════════════════════════╗\n`;
      info += `║   🤖 *HANI-MD PREMIUM*   ║\n`;
      info += `╚════════════════════════╝\n\n`;
      
      info += `📛 *Nom:* HANI-MD\n`;
      info += `📌 *Version:* 2.6.0 SECURE\n`;
      info += `👑 *Créateur:* HANIEL\n`;
      info += `🌍 *Pays:* Côte d'Ivoire\n\n`;
      
      info += `⚙️ *Technique:*\n`;
      info += `├ 💻 Node.js: ${process.version}\n`;
      info += `├ 📦 Baileys: Multi-Device\n`;
      info += `├ 💾 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
      info += `└ ⏱️ Uptime: ${hours}h ${minutes}m\n\n`;
      
      info += `🔥 *Fonctionnalités:*\n`;
      info += `├ 📥 Téléchargements\n`;
      info += `├ 🎵 Musique & Vidéo\n`;
      info += `├ 👥 Gestion Groupes\n`;
      info += `├ 🤖 IA intégrée\n`;
      info += `├ 🎮 Jeux & Fun\n`;
      info += `└ 💎 Premium Multi-Clients\n\n`;
      
      info += `🌐 *Support:*\n`;
      info += `├ wa.me/22550252467\n`;
      info += `└ github.com/haniel-bot\n\n`;
      
      info += `✨ *Powered by HANI-MD*`;

      repondre(info);

    } catch (error) {
      console.error("[BOTINFO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📱 INFO SYSTÈME
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "sysinfo",
    classe: "Système",
    react: "💻",
    desc: "Informations système",
    alias: ["system", "server"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem() / 1024 / 1024 / 1024;
      const freeMem = os.freemem() / 1024 / 1024 / 1024;
      const usedMem = totalMem - freeMem;

      let info = `💻 *Informations Système*\n\n`;
      
      info += `🖥️ *Serveur:*\n`;
      info += `├ OS: ${os.type()}\n`;
      info += `├ Platform: ${os.platform()}\n`;
      info += `├ Arch: ${os.arch()}\n`;
      info += `└ Hostname: ${os.hostname()}\n\n`;
      
      info += `⚡ *CPU:*\n`;
      info += `├ Modèle: ${cpus[0].model}\n`;
      info += `├ Cores: ${cpus.length}\n`;
      info += `└ Vitesse: ${cpus[0].speed} MHz\n\n`;
      
      info += `💾 *Mémoire:*\n`;
      info += `├ Totale: ${totalMem.toFixed(2)} GB\n`;
      info += `├ Utilisée: ${usedMem.toFixed(2)} GB\n`;
      info += `└ Libre: ${freeMem.toFixed(2)} GB\n\n`;
      
      info += `🤖 *Process:*\n`;
      info += `├ Node.js: ${process.version}\n`;
      info += `├ PID: ${process.pid}\n`;
      info += `└ RAM Bot: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;

      repondre(info);

    } catch (error) {
      console.error("[SYSINFO]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES COMMANDES (HELP)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "help",
    classe: "Système",
    react: "📋",
    desc: "Afficher l'aide et les commandes",
    alias: ["aide", "commands", "cmd"]
  },
  async (ovl, msg, { arg, repondre }) => {
    try {
      const category = arg[0]?.toLowerCase();
      
      const categories = {
        telechargement: ["play", "video", "tiktok", "fb", "ig", "twitter", "pinterest", "song", "spotify"],
        outils: ["sticker", "toimg", "calc", "tts", "qrcode", "shorturl", "translate"],
        fun: ["dice", "coinflip", "8ball", "love", "blague", "citation", "horoscope", "slot", "ppc"],
        groupe: ["kick", "add", "promote", "demote", "grouplink", "tagall", "antilink"],
        owner: ["restart", "broadcast", "ban", "sudo", "shell", "stats"],
        systeme: ["ping", "uptime", "botinfo", "menu", "help"],
        ia: ["gpt", "gemini", "imagine", "dalle"],
        search: ["google", "youtube", "wikipedia", "lyrics"]
      };

      if (category && categories[category]) {
        let help = `📋 *Commandes ${category.charAt(0).toUpperCase() + category.slice(1)}*\n\n`;
        categories[category].forEach(cmd => {
          help += `• .${cmd}\n`;
        });
        help += `\n💡 Tapez .menu pour le menu complet`;
        return repondre(help);
      }

      let help = `📋 *AIDE HANI-MD*\n\n`;
      help += `🔥 *Catégories disponibles:*\n\n`;
      
      Object.keys(categories).forEach(cat => {
        const emoji = {
          telechargement: "📥",
          outils: "🛠️",
          fun: "🎭",
          groupe: "👥",
          owner: "👑",
          systeme: "⚙️",
          ia: "🤖",
          search: "🔍"
        }[cat] || "📦";
        
        help += `${emoji} *.help ${cat}*\n`;
      });

      help += `\n💡 *Exemples:*\n`;
      help += `• .help telechargement\n`;
      help += `• .help fun\n`;
      help += `• .menu (menu complet)\n\n`;
      help += `✨ Powered by HANI-MD`;

      repondre(help);

    } catch (error) {
      console.error("[HELP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔔 ALIVE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "alive",
    classe: "Système",
    react: "✅",
    desc: "Vérifier si le bot est en ligne",
    alias: ["test", "online"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      let alive = `╔═══════════════════════╗\n`;
      alive += `║  ✅ *HANI-MD EN LIGNE*  ║\n`;
      alive += `╚═══════════════════════╝\n\n`;
      alive += `🤖 Je suis actif et prêt!\n`;
      alive += `⏱️ En ligne depuis: ${hours}h ${minutes}m\n\n`;
      alive += `📝 Tapez *.menu* pour voir les commandes\n`;
      alive += `📞 Support: wa.me/22550252467\n\n`;
      alive += `✨ *HANI-MD Premium V2.6.0*`;

      repondre(alive);

    } catch (error) {
      console.error("[ALIVE]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 SPEED TEST
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "speed",
    classe: "Système",
    react: "⚡",
    desc: "Tester la vitesse du bot",
    alias: ["speedtest"]
  },
  async (ovl, msg, { repondre }) => {
    try {
      const start = Date.now();
      
      // Test de réponse
      await repondre("⚡ Test de vitesse en cours...");
      const responseTime = Date.now() - start;

      // Test CPU
      const cpuStart = Date.now();
      let x = 0;
      for (let i = 0; i < 1000000; i++) {
        x += Math.random();
      }
      const cpuTime = Date.now() - cpuStart;

      // Résultats
      let result = `⚡ *Test de Vitesse*\n\n`;
      result += `📨 Réponse: ${responseTime}ms\n`;
      result += `💻 CPU (1M ops): ${cpuTime}ms\n`;
      result += `💾 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n\n`;
      
      const overall = responseTime + cpuTime;
      if (overall < 500) {
        result += `📊 Status: 🟢 Excellent`;
      } else if (overall < 1000) {
        result += `📊 Status: 🟡 Bon`;
      } else {
        result += `📊 Status: 🟠 À améliorer`;
      }

      repondre(result);

    } catch (error) {
      console.error("[SPEED]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📍 VCARD (Contact du bot)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "owner",
    classe: "Système",
    react: "👑",
    desc: "Contact du propriétaire",
    alias: ["dev", "creator"]
  },
  async (ovl, msg, { ms, repondre }) => {
    try {
      const ownerNumber = "22550252467";
      
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:HANIEL - HANI-MD
ORG:HANI-MD Premium Bot
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

      await ovl.sendMessage(msg.key.remoteJid, {
        contacts: {
          displayName: "HANIEL",
          contacts: [{
            vcard
          }]
        }
      }, { quoted: ms });

      repondre("👑 *Propriétaire du Bot*\n\n📞 HANIEL\n💬 WhatsApp: +225 50252467\n\n✨ Powered by HANI-MD");

    } catch (error) {
      console.error("[OWNER]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Systeme.js chargé - Commandes: ping, uptime, botinfo, sysinfo, help, alive, speed, owner");
