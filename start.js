/**
 * HANI-MD - Bot WhatsApp
 * Point d'entrée : charge les commandes, démarre le serveur web puis le bot.
 * Lance ce fichier avec: node start.js
 */

require("dotenv").config({ override: true });

// ═══════════════════════════════════════════════════════════
// 📦 SYSTÈME DE COMMANDES MODULAIRES (OVLCMD)
// ═══════════════════════════════════════════════════════════

const { getCommands } = require("./lib/ovlcmd");

// Charger tous les modules de commandes
const commandModules = [
  "./cmd/Menu",
  "./cmd/Owner",
  "./cmd/Telechargement",
  "./cmd/Outils",
  "./cmd/Conversion",
  "./cmd/Reaction",
  "./cmd/Fun",
  "./cmd/Prank",
  "./cmd/Ovl-game",
  "./cmd/Ia",
  "./cmd/Search",
  "./cmd/Groupe",
  "./cmd/Confidentialite",
  "./cmd/Fx_audio",
  "./cmd/Status",
  "./cmd/Image_edits",
  "./cmd/Logo",
  "./cmd/ProFeatures",
  "./cmd/Contacts",
  "./cmd/Ovl-economy",
  "./cmd/Premium",
  "./cmd/WavePayments",
  "./cmd/Systeme",
  "./cmd/Advanced",
  "./cmd/Config",
  "./cmd/Autoreply",
  "./cmd/Engagement",
  "./cmd/Newsletter",
  "./cmd/Referral",
  "./cmd/Support",
  "./cmd/Feedback",
  "./cmd/Tutorial",
  "./cmd/Payments",
  "./cmd/BotNetwork",
  "./cmd/VueUnique",
  "./cmd/Protection",
  "./cmd/GhostContact",
  "./cmd/Notes",
  "./cmd/Templates",
  "./cmd/Rappels",
  "./cmd/Traduction",
  "./cmd/Planificateur",
  "./cmd/AudioTranscription",
  "./cmd/Analytics",
  "./cmd/Resume",
  "./cmd/Silence",
  "./cmd/AutoSave",
  "./cmd/ExportChat",
  "./cmd/SearchMessages",
  "./cmd/Calendar",
  "./cmd/Antispam",
  "./cmd/MultiAccount"
];

let loadedModules = 0;
const failedModules = [];
for (const mod of commandModules) {
  try {
    require(mod);
    loadedModules++;
  } catch (e) {
    failedModules.push({ mod, error: e.message });
    console.log(`[CMD] ❌ Échec chargement ${mod}: ${e.message}`);
  }
}
if (failedModules.length > 0) {
  console.log(`[CMD] ⚠️ ${failedModules.length} module(s) non chargé(s) :`);
  failedModules.forEach(f => console.log(`   - ${f.mod}: ${f.error}`));
}
console.log(`[CMD] ✅ ${loadedModules}/${commandModules.length} modules de commandes chargés`);
console.log(`[CMD] 📋 ${getCommands().length} commandes disponibles via ovlcmd`);

// ═══════════════════════════════════════════════════════════
// 🌐 SERVEUR WEB (pages, API, admin)
// ═══════════════════════════════════════════════════════════

const { startWebServer } = require("./lib/webServer");
startWebServer();

// Connecter la base de données puis lancer le bot
// Priorité : Firebase → MySQL → JSON local (fallback automatique)
(async () => {
  let dbConnected = false;

  // 1. Essayer Firebase (si FIREBASE_URL défini)
  if (process.env.FIREBASE_URL) {
    try {
      const firebaseDB = require('./DataBase/firebase_db');
      dbConnected = await firebaseDB.connect();
      if (dbConnected) {
        console.log('[DB] 🔥 Firebase connecté — données premium sauvegardées sur Firebase');
      }
    } catch (e) {
      console.log('[DB] ⚠️ Firebase non disponible:', e.message);
    }
  }

  // 2. Sinon essayer MySQL
  if (!dbConnected) {
    try {
      const mysqlDB = require('./DataBase/mysql');
      dbConnected = await mysqlDB.connect();
      if (dbConnected) {
        console.log('[DB] ✅ MySQL connecté — données premium persistées dans la base');
      } else {
        console.log('[DB] ℹ️ Aucune base de données configurée — données sauvées en JSON local');
      }
    } catch (e) {
      console.log('[DB] ⚠️ MySQL non disponible:', e.message, '— mode JSON local');
    }
  }

  // NE PAS restaurer les sessions clients au démarrage
  // (crée trop de connexions WS concurrentes et déconnecte le bot principal)
  // Les clients se reconnecteront manuellement via /connect
  try {
    if (require('./DataBase/client_sessions')) {
      console.log('[SESSIONS] ℹ️ Sessions clients : pas de restauration auto (stabilité bot owner)');
    }
  } catch (e) {}

  // Lancer le bot
  const { startBot } = require("./lib/botConnection");
  startBot().catch((err) => {
    console.error("❌ Erreur de démarrage:", err.message);
  });
})();

// Gérer les erreurs non capturées
process.on("uncaughtException", (err) => {
  console.log("⚠️ Erreur non capturée:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("⚠️ Promesse rejetée:", err.message);
});
