// Variante temporaire de session-generator.js : exporte le QR en PNG
// pour affichage à l'écran (au lieu de l'art ASCII uniquement).
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
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
const QR_PNG = "./qr_scan.png";

async function generateSession(isRetry = false) {
  if (!isRetry && fs.existsSync(SESSION_FOLDER)) {
    fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
    console.log("Ancienne session supprimee");
  }
  fs.mkdirSync(SESSION_FOLDER, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

  let version;
  try {
    version = (await fetchLatestBaileysVersion()).version;
  } catch (e) {
    version = [2, 3000, 1020394028];
  }
  console.log("Version WhatsApp:", version.join("."));

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    connectTimeoutMs: 30000,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await QRCode.toFile(QR_PNG, qr, { scale: 10, margin: 2 });
      console.log("QR_PNG_READY");
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("CONNEXION OUVERTE !");
      console.log(">>> ENVOIE UN MESSAGE DANS N'IMPORTE QUEL CHAT MAINTENANT <<<");
      console.log("(ça force WhatsApp à distribuer les clés de tes propres messages)");
      // Laisser ~30s pour que le téléphone distribue les sender-keys
      // des messages envoyés par l'owner (sinon Bad MAC en prod).
      await delay(30000);
      await saveCreds();
      await delay(2000);
      console.log("Encodage session...");

      const files = fs.readdirSync(SESSION_FOLDER);
      const bundle = {};
      for (const f of files) {
        const fp = path.join(SESSION_FOLDER, f);
        if (fs.statSync(fp).isFile()) bundle[f] = fs.readFileSync(fp).toString("base64");
      }
      const compressed = zlib.brotliCompressSync(Buffer.from(JSON.stringify(bundle)));
      const sessionData = "HANI-MD-V2~" + compressed.toString("base64");
      fs.writeFileSync(SESSION_OUTPUT, sessionData);

      console.log("SESSION_OK numero=" + (sock.user?.id?.split(":")[0] || "?"));
      console.log("SESSION_LEN=" + sessionData.length);
      await delay(2000);
      process.exit(0);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("Connexion fermee code=" + code);
      if (code === DisconnectReason.loggedOut || code === DisconnectReason.connectionReplaced) {
        process.exit(1);
      }
      console.log("Reconnexion dans 5s...");
      await delay(5000);
      generateSession(true);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

generateSession();
