/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║         🔌 HANI-MD - Connection Manager                   ║
 * ║      Module unifié de gestion des connexions WhatsApp     ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const config = require('./config');

const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

// ═══════════════════════════════════════════════════════════
// 📊 ÉTAT DE CONNEXION
// ═══════════════════════════════════════════════════════════

const connectionState = {
  currentQR: null,
  qrDataURL: null,
  lastUpdate: null,
  isConnected: false,
  connectionStatus: "disconnected", // disconnected, waiting_qr, connecting, connected
  botInfo: null,
  qrCount: 0,
  reconnectCount: 0,
  maxReconnect: 10,
  connectionFailureCount: 0,
  maxConnectionFailures: 1
};

// ═══════════════════════════════════════════════════════════
// 🔑 RESTAURATION DE SESSION
// ═══════════════════════════════════════════════════════════

async function restoreSessionFromId(sessionId, sessionFolder) {
  if (!sessionId) {
    console.log("[SESSION] Pas de SESSION_ID, scan QR requis...");
    return false;
  }
  
  const isV2 = sessionId.startsWith("HANI-MD-V2~");
  const isV1 = sessionId.startsWith("HANI-MD~");
  
  if (!isV1 && !isV2) {
    console.log("[SESSION] ⚠️ Format SESSION_ID non reconnu");
    return false;
  }
  
  try {
    console.log(`[SESSION] 🔑 Restauration (format ${isV2 ? 'V2 sécurisé' : 'V1 legacy'})...`);
    
    const base64Data = sessionId.replace("HANI-MD-V2~", "").replace("HANI-MD~", "");
    const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
    const sessionBundle = JSON.parse(jsonString);
    
    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }
    
    for (const [filename, base64Content] of Object.entries(sessionBundle)) {
      const filePath = path.join(sessionFolder, filename);
      const content = Buffer.from(base64Content, "base64");
      fs.writeFileSync(filePath, content);
    }
    
    console.log("[SESSION] ✅ Session restaurée avec succès!");
    return true;
  } catch (e) {
    console.error("[SESSION] ❌ Erreur restauration:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 🔄 CRÉATION DE CONNEXION
// ═══════════════════════════════════════════════════════════

async function createConnection(options = {}) {
  const {
    sessionFolder = config.SESSION_DIR,
    onQR,
    onConnected,
    onDisconnected,
    onMessage,
    onConnectionUpdate,
    printQRInTerminal = true
  } = options;
  
  // S'assurer que le dossier existe
  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
  }
  
  // Restaurer depuis SESSION_ID si disponible
  if (config.SESSION_ID) {
    const credsPath = path.join(sessionFolder, 'creds.json');
    if (!fs.existsSync(credsPath)) {
      await restoreSessionFromId(config.SESSION_ID, sessionFolder);
    }
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  
  let version;
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
    console.log(`[CONN] 🔌 Connexion avec Baileys v${version.join(".")}`);
  } catch (e) {
    version = [2, 3000, 1020394028];
    console.log(`[CONN] ⚠️ Version fallback utilisée: ${version.join(".")} (réseau indisponible)`);
  }
  
  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => ({ conversation: "" })
  });
  
  // Événements
  sock.ev.on("creds.update", saveCreds);
  
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      connectionState.currentQR = qr;
      connectionState.qrCount++;
      connectionState.connectionStatus = "waiting_qr";
      connectionState.lastUpdate = Date.now();
      
      // Afficher le QR dans le terminal
      console.log("\n[CONN] 📱 Scannez ce QR code avec WhatsApp:\n");
      qrcode.generate(qr, { small: true });
      
      // Générer QR en base64 pour l'interface web
      try {
        connectionState.qrDataURL = await QRCode.toDataURL(qr);
      } catch (e) {}
      
      if (onQR) onQR(qr);
    }
    
    if (onConnectionUpdate) {
      onConnectionUpdate(update);
    }
    
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || "Inconnue";
      
      console.log(`[CONN] ❌ Connexion fermée: ${reason} (${statusCode})`);
      
      connectionState.isConnected = false;
      connectionState.connectionStatus = "disconnected";
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const isConflict = statusCode === DisconnectReason.connectionReplaced;
      const isStreamError = reason?.toLowerCase().includes("stream errored");
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("[CONN] ⚠️ Session déconnectée - Suppression...");
        connectionState.connectionFailureCount = 0;
        
        // Supprimer la session
        try {
          if (fs.existsSync(sessionFolder)) {
            fs.rmSync(sessionFolder, { recursive: true, force: true });
            fs.mkdirSync(sessionFolder, { recursive: true });
          }
        } catch (e) {}
        
        if (onDisconnected) onDisconnected(lastDisconnect?.error, true);
        
        // Reconnecter pour nouveau QR
        await delay(3000);
        return createConnection(options);
        
      } else if (shouldReconnect) {
        connectionState.reconnectCount++;
        const delayMs = connectionState.reconnectCount > connectionState.maxReconnect
          ? 30000  // Délai de 30s après beaucoup d'échecs
          : (isConflict ? 10000 : 3000);
        console.log(`[CONN] 🔄 Reconnexion #${connectionState.reconnectCount} dans ${delayMs/1000}s...`);
        
        await delay(delayMs);
        return createConnection(options);
      }
      
      if (onDisconnected) onDisconnected(lastDisconnect?.error, false);
    }
    
    if (connection === "open") {
      connectionState.reconnectCount = 0;
      connectionState.connectionFailureCount = 0;
      connectionState.isConnected = true;
      connectionState.connectionStatus = "connected";
      connectionState.currentQR = null;
      connectionState.qrDataURL = null;
      connectionState.botInfo = sock.user;
      
      console.log("[CONN] ✅ Connexion établie!");
      console.log(`[CONN] 📱 Connecté: ${sock.user?.id || 'Inconnu'}`);
      
      if (onConnected) onConnected(sock);
    }
  });
  
  // Messages
  if (onMessage) {
    sock.ev.on("messages.upsert", async (msgUpdate) => {
      onMessage(sock, msgUpdate);
    });
  }
  
  return sock;
}

// ═══════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  createConnection,
  restoreSessionFromId,
  connectionState,
  getConnectionState: () => connectionState,
  isConnected: () => connectionState.isConnected,
  getQRCode: () => connectionState.currentQR,
  getQRDataURL: () => connectionState.qrDataURL
};

console.log("[CONN] ✅ Module de connexion chargé");
