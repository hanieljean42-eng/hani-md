/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║         🔐 GÉNÉRATEUR DE SESSION HANI-MD 🔐               ║
 * ║                                                           ║
 * ║  Ce script génère une SESSION_ID que tu peux utiliser     ║
 * ║  pour déployer le bot sur Render, Railway, Heroku, etc.   ║
 * ║                                                           ║
 * ║  Usage: node session-generator.js                         ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const readline = require("readline");
const zlib = require("zlib");
const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const SESSION_FOLDER = "./DataBase/session/principale";
const SESSION_OUTPUT = "./session_id.txt";
const SESSION_OUTPUT_LEGACY = "./session_id_legacy.txt";

console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🔐 GÉNÉRATEUR DE SESSION HANI-MD 🔐               ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  1. Scanne le QR code avec ton WhatsApp                   ║
║  2. Attends la confirmation de connexion                  ║
║  3. La SESSION_ID sera générée automatiquement            ║
║  4. Copie-la dans les variables d'environnement           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

async function generateSession(isRetry = false) {
  // Nettoyer l'ancienne session seulement au premier lancement
  if (!isRetry) {
    if (fs.existsSync(SESSION_FOLDER)) {
      fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
      console.log("🗑️  Ancienne session supprimée");
    }
  }

  // Créer le dossier
  fs.mkdirSync(SESSION_FOLDER, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

  // Obtenir la version WhatsApp avec fallback
  let version;
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
    console.log(`[SESSION] Version WhatsApp: ${version.join(".")}`)
  } catch (e) {
    version = [2, 3000, 1020394028];
    console.log(`[SESSION] Version fallback: ${version.join(".")}`)
  }

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    connectTimeoutMs: 30000,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 SCANNE CE QR CODE AVEC WHATSAPP:\n");
      qrcode.generate(qr, { small: true });
      console.log("\n⏳ En attente du scan...\n");
    }

    if (connection === "open") {
      console.log("\n✅ CONNEXION RÉUSSIE !\n");
      
      // Attendre que les credentials soient sauvegardés
      await delay(3000);
      await saveCreds();
      
      // Lire les fichiers de session et les encoder en base64
      const sessionData = await encodeSession();
      const sessionLegacy = await encodeSessionLegacy();
      
      if (sessionData) {
        // Sauvegarder dans un fichier
        fs.writeFileSync(SESSION_OUTPUT, sessionData);
        if (sessionLegacy) {
          try { fs.writeFileSync(SESSION_OUTPUT_LEGACY, sessionLegacy); } catch (e) {}
        }
        
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║              🎉 SESSION GÉNÉRÉE AVEC SUCCÈS !             ║
╠═══════════════════════════════════════════════════════════╣
║  📱 Numéro: ${(sock.user?.id?.split(":")[0] || "").padEnd(44)}║
║  👤 Nom: ${(sock.user?.name || "").padEnd(47)}║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📋 Ta SESSION_ID a été sauvegardée dans:                 ║
║     → session_id.txt                                      ║
║     → session_id_legacy.txt (compatibilité)               ║
║                                                           ║
║  🚀 Pour déployer sur Render:                             ║
║     1. Ajoute une variable d'environnement                ║
║     2. Nom: SESSION_ID                                    ║
║     3. Valeur: (contenu de session_id.txt)                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
        
        // Afficher la SESSION_ID (les premiers 100 caractères)
        console.log("\n🔑 SESSION_ID (début):");
        console.log(sessionData.substring(0, 100) + "...\n");
        console.log(`📏 Longueur totale (V2): ${sessionData.length} caractères`);
        if (sessionLegacy) {
          console.log(`📏 Longueur totale (V1 legacy): ${sessionLegacy.length} caractères\n`);
        } else {
          console.log("\n");
        }
        
        // Copier dans le presse-papier si possible
        try {
          const { exec } = require("child_process");
          exec(`echo ${sessionData} | clip`, (err) => {
            if (!err) {
              console.log("📋 SESSION_ID copiée dans le presse-papier !\n");
            }
          });
        } catch (e) {}
      }
      
      console.log("👋 Fermeture du générateur...");
      await delay(2000);
      process.exit(0);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message || "Inconnue";
      
      console.log(`[SESSION] ❌ Connexion fermée - Code: ${statusCode} | Raison: ${errorMsg}`);
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("❌ Déconnecté (loggedOut). Relance le script.");
        process.exit(1);
      } else if (statusCode === DisconnectReason.connectionReplaced) {
        console.log("⚠️ Connexion remplacée (autre appareil). Relance le script.");
        process.exit(1);
      } else {
        reconnectAttempts++;
        if (reconnectAttempts > MAX_RECONNECT) {
          console.log(`❌ Échec après ${MAX_RECONNECT} tentatives. Vérifier la connexion internet.`);
          process.exit(1);
        }
        console.log(`🔄 Reconnexion (${reconnectAttempts}/${MAX_RECONNECT}) dans 5s...`);
        await delay(5000);
        generateSession(true);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

async function encodeSession() {
  try {
    const files = fs.readdirSync(SESSION_FOLDER);
    const sessionBundle = {};
    
    for (const file of files) {
      const filePath = path.join(SESSION_FOLDER, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath);
        sessionBundle[file] = content.toString("base64");
      }
    }
    
    // Encoder tout le bundle en base64 (Brotli-compressé pour réduire la longueur)
    const jsonString = JSON.stringify(sessionBundle);
    const compressed = zlib.brotliCompressSync(Buffer.from(jsonString));
    const base64Session = compressed.toString("base64");
    
    return "HANI-MD-V2~" + base64Session;
  } catch (e) {
    console.error("❌ Erreur encodage session:", e.message);
    return null;
  }
}

// Encodage legacy (V1, sans compression) pour compatibilité si nécessaire
async function encodeSessionLegacy() {
  try {
    const files = fs.readdirSync(SESSION_FOLDER);
    const sessionBundle = {};
    for (const file of files) {
      const filePath = path.join(SESSION_FOLDER, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath);
        sessionBundle[file] = content.toString("base64");
      }
    }
    const jsonString = JSON.stringify(sessionBundle);
    const base64Session = Buffer.from(jsonString).toString("base64");
    return "HANI-MD~" + base64Session;
  } catch (e) {
    return null;
  }
}

// Fonction pour décoder (utilisée au démarrage du bot)
function decodeSession(sessionId) {
  try {
    if (!sessionId || !sessionId.startsWith("HANI-MD~")) {
      return null;
    }
    
    const base64Data = sessionId.replace("HANI-MD~", "");
    const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
    const sessionBundle = JSON.parse(jsonString);
    
    return sessionBundle;
  } catch (e) {
    console.error("❌ Erreur décodage session:", e.message);
    return null;
  }
}

// Lancer le générateur
generateSession();
