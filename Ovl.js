/**
 * ═══════════════════════════════════════════════════════════
 * 🤖 HANI-MD - OVL Connection Manager
 * ═══════════════════════════════════════════════════════════
 * Gestionnaire de connexion WhatsApp avec Baileys
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  delay,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");

// Suppression des logs inutiles
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const msg = args.join(" ");
  if (
    msg.includes("node_modules") ||
    msg.includes("DEBUG") ||
    msg.includes("received") ||
    msg.includes("sent")
  ) {
    return;
  }
  originalLog(...args);
};

console.error = (...args) => {
  const msg = args.join(" ");
  if (msg.includes("node_modules") || msg.includes("DEBUG")) {
    return;
  }
  originalError(...args);
};

// Configuration
const SESSION_DIR = process.env.SESSION_DIR || "./session_principale";
const MAX_RECONNECT = 10;
let reconnectCount = 0;

/**
 * Créer une connexion WhatsApp
 * @param {Object} options - Options de connexion
 */
async function createConnection(options = {}) {
  const { onQR, onConnected, onDisconnected, onMessage, sessionDir } = options;
  
  const sessionPath = sessionDir || SESSION_DIR;
  
  // S'assurer que le dossier de session existe
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  // Charger l'état d'authentification
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
  // Obtenir la dernière version de Baileys
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  console.log(`[HANI-MD] 🔌 Connexion avec Baileys v${version.join(".")}`);
  
  // Créer le socket WhatsApp
  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      return { conversation: "" };
    }
  });
  
  // Événement de mise à jour des credentials
  sock.ev.on("creds.update", saveCreds);
  
  // Événement de connexion
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr && onQR) {
      onQR(qr);
    }
    
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log("[HANI-MD] ❌ Connexion fermée:", lastDisconnect?.error?.message);
      
      if (shouldReconnect && reconnectCount < MAX_RECONNECT) {
        reconnectCount++;
        console.log(`[HANI-MD] 🔄 Reconnexion (${reconnectCount}/${MAX_RECONNECT})...`);
        await delay(3000);
        return createConnection(options);
      }
      
      if (onDisconnected) {
        onDisconnected(lastDisconnect?.error);
      }
    }
    
    if (connection === "open") {
      reconnectCount = 0;
      console.log("[HANI-MD] ✅ Connexion établie!");
      
      if (onConnected) {
        onConnected(sock);
      }
    }
  });
  
  // Événement de message
  if (onMessage) {
    sock.ev.on("messages.upsert", async (msg) => {
      onMessage(sock, msg);
    });
  }
  
  return sock;
}

/**
 * Initialiser la connexion avec les handlers par défaut
 */
async function initConnection() {
  return createConnection({
    onConnected: (sock) => {
      const user = sock.user;
      console.log("[HANI-MD] 📱 Connecté en tant que:", user?.id || "Inconnu");
    },
    onDisconnected: (error) => {
      console.log("[HANI-MD] 🔌 Déconnecté:", error?.message || "Inconnue");
    }
  });
}

/**
 * Vérifier si une session existe
 */
function hasSession(sessionPath = SESSION_DIR) {
  const credsPath = path.join(sessionPath, "creds.json");
  return fs.existsSync(credsPath);
}

/**
 * Supprimer une session
 */
function deleteSession(sessionPath = SESSION_DIR) {
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true });
      return true;
    }
  } catch (e) {
    console.error("[HANI-MD] Erreur suppression session:", e.message);
  }
  return false;
}

module.exports = {
  createConnection,
  initConnection,
  hasSession,
  deleteSession,
  SESSION_DIR
};

console.log("[OVL] ✅ Connection Manager chargé");
