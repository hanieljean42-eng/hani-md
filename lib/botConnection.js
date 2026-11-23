/**
 * 🔌 HANI-MD - Connexion WhatsApp (startBot)
 * (extrait de start.js)
 */

const fs = require("fs");
const path = require("path");
const ROOT_DIR = path.join(__dirname, '..');
const pino = require("pino");
const zlib = require("zlib");
const PORT = process.env.PORT || 3000;

const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  getContentType,
} = require("@whiskeysockets/baileys");

const { handleCommand } = require("./commandHandler");
const { getSelfJid } = require("./selfRedirect");
const sessionBackup = require("./sessionBackup");
const { checkRappels } = require("../cmd/Rappels");
const { processScheduledMessages } = require("../cmd/Planificateur");
const { checkCalendarReminders } = require("../cmd/Calendar");
const { trackMessage } = require("../cmd/Analytics");
const { addToHistory } = require("../cmd/Resume");
const { isSilenced } = require("../cmd/Silence");
const {
  S,
  MAX_CONNECTION_FAILURES,
  config,
  AUTH_BACKEND,
  SESSION_FOLDER,
  SESSION_FB_PATH,
  isGhostJid,
  findGhostKey,
  saveGhostState,
  registerJid,
  protectionState,
  messageStore,
  MAX_STORED_MESSAGES,
  MAX_DELETED_MESSAGES,
  deletedMessages,
  saveDeletedMessages,
  getMessageText,
  viewOnceMessages,
  saveViewOnceMessages,
} = require("./state");

async function startBot() {
  if (S.isReconnecting) return; // Eviter les appels concurrents
  S.isReconnecting = true;
  S.reconnectPending = false; // La reconnexion planifiée se réalise → on en autorise une nouvelle
  // Fermer proprement l'ancien socket s'il existe.
  // IMPORTANT: détacher les listeners AVANT — sinon le "close" du vieux socket
  // planifie une reconnexion qui tue le nouveau socket (boucle 428 infinie).
  try { if (S.ovl) { S.ovl.ev?.removeAllListeners(); S.ovl.ws?.terminate(); S.ovl.end(undefined); } } catch(e) {}
  S.ovl = null;
  await new Promise(r => setTimeout(r, 1000)); // Laisser WhatsApp souffler
  S.isReconnecting = false;
  console.log("\n");
  console.log("╔════════════════════════════════════════╗");
  console.log("║       🤖 OVL-MD-V2 - Bot WhatsApp      ║");
  console.log("║    Connexion directe par QR Code       ║");
  console.log("╚════════════════════════════════════════╝");
  console.log("\n");

  // Créer le dossier de session s'il n'existe pas
  if (!fs.existsSync(SESSION_FOLDER)) {
    fs.mkdirSync(SESSION_FOLDER, { recursive: true });
  }

  // Firebase chargé tôt : la copie du bundle sur RTDB est la session
  // la plus fraîche (mise à jour à chaque creds.update), avant SESSION_ID.
  let firebaseDB = null;
  try { firebaseDB = require('../DataBase/firebase_db'); } catch (e) { firebaseDB = null; }
  if (firebaseDB && typeof firebaseDB.isConnected === 'function' && !firebaseDB.isConnected() && process.env.FIREBASE_URL) {
    try { await firebaseDB.connect(); } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════
  // 🔑 RESTAURER SESSION DEPUIS SESSION_ID (DÉPLOIEMENT CLOUD)
  // ═══════════════════════════════════════════════════════
  const sessionId = process.env.SESSION_ID || '';
  const credsPath = path.join(SESSION_FOLDER, 'creds.json');
  const hasExistingSession = fs.existsSync(credsPath);

  // Sur Render : le disque est éphémère — toujours restaurer depuis SESSION_ID
  // même si un creds.json existe (il peut être d'un redémarrage précédent invalide)
  const isCloud = !!process.env.SESSION_ID;

  // Priorité 1 : bundle Firebase (le plus récent — sauvegardé en continu)
  let sessionRestored = await sessionBackup.restoreBundle(firebaseDB, SESSION_FOLDER);

  // Priorité 2 : SESSION_ID (bootstrap initial ou secours)
  if (!sessionRestored && sessionId && (isCloud || !hasExistingSession)) {
    try {
      if (sessionId.startsWith('HANI-MD-V2~')) {
        const base64Data = sessionId.replace('HANI-MD-V2~', '');
        const compressed = Buffer.from(base64Data, 'base64');
        const jsonStr = zlib.brotliDecompressSync(compressed).toString('utf-8');
        const bundle = JSON.parse(jsonStr);
        for (const [filename, b64content] of Object.entries(bundle)) {
          if (!filename.startsWith('session-')) fs.writeFileSync(path.join(SESSION_FOLDER, filename), Buffer.from(b64content, 'base64'));
        }
        console.log(`[SESSION] ✅ Session restaurée depuis SESSION_ID V2 (${Object.keys(bundle).length} fichiers)`);
      } else if (sessionId.startsWith('HANI-MD~')) {
        const jsonStr = Buffer.from(sessionId.slice(8), 'base64').toString('utf-8');
        const bundle = JSON.parse(jsonStr);
        for (const [filename, b64content] of Object.entries(bundle)) {
          if (!filename.startsWith('session-')) fs.writeFileSync(path.join(SESSION_FOLDER, filename), Buffer.from(b64content, 'base64'));
        }
        console.log(`[SESSION] ✅ Session restaurée depuis SESSION_ID (${Object.keys(bundle).length} fichiers)`);
      } else if (sessionId.startsWith('HANI-MD_')) {
        const decoded = Buffer.from(sessionId.slice(8), 'base64').toString('utf-8');
        fs.writeFileSync(credsPath, decoded);
        console.log('[SESSION] ✅ Session restaurée depuis SESSION_ID (format simple)');
      } else {
        console.error('[SESSION] ❌ Format SESSION_ID non reconnu (doit commencer par HANI-MD-V2~ ou HANI-MD~)');
      }
    } catch (e) {
      console.error('[SESSION] ❌ Impossible de restaurer SESSION_ID:', e.message);
      console.log('[SESSION] Le bot va afficher un QR code...');
    }
  } else if (!sessionRestored && !sessionId && !hasExistingSession) {
    console.log('[SESSION] ℹ️ Aucune SESSION_ID définie — affichage du QR code...');
  } else if (!sessionRestored && hasExistingSession) {
    console.log('[SESSION] ✅ Session existante trouvée sur disque');
  }

  // ═══════════════════════════════════════════════════════
  // 🔑 ÉTAT D'AUTHENTIFICATION
  // Priorité : Firebase (persistant, survit aux redémarrages Render)
  //            sinon useMultiFileAuthState (disque éphémère + SESSION_ID)
  // ═══════════════════════════════════════════════════════
  let sessionBackend = 'disk';
  let state, saveCreds;

  // Sélection du backend d'authentification selon AUTH_BACKEND
  if (AUTH_BACKEND === 'disk') {
    const mf = await useMultiFileAuthState(SESSION_FOLDER);
    state = mf.state;
    saveCreds = mf.saveCreds;
    sessionBackend = 'disk';
    console.log('[SESSION] 💾 Auth state via DISK (forcé par WHATSAPP_AUTH_BACKEND=disk)');
  } else if (AUTH_BACKEND === 'firebase') {
    // S'assurer que Firebase est connecté si demandé
    if (firebaseDB && typeof firebaseDB.isConnected === 'function' && !firebaseDB.isConnected() && process.env.FIREBASE_URL) {
      try { await firebaseDB.connect(); } catch (_) {}
    }
    if (firebaseDB && typeof firebaseDB.isConnected === 'function' && firebaseDB.isConnected()) {
      try {
        const fbAuth = await firebaseDB.useFirebaseAuthState(SESSION_FB_PATH);
        state = fbAuth.state;
        saveCreds = fbAuth.saveCreds;
        sessionBackend = 'firebase';
        console.log('[SESSION] 🔥 Auth state via Firebase (forcé par WHATSAPP_AUTH_BACKEND=firebase)');
      } catch (e) {
        console.error('[SESSION] ⚠️ Firebase auth state indisponible, fallback disque:', e.message);
      }
    }
    if (!state) {
      const mf = await useMultiFileAuthState(SESSION_FOLDER);
      state = mf.state;
      saveCreds = mf.saveCreds;
      sessionBackend = 'disk';
      console.log('[SESSION] 💾 Auth state via DISK (fallback — Firebase non disponible)');
    }
  } else { // auto
    if (process.env.SESSION_ID) {
      // Priorité au DISK si SESSION_ID est fournie (déploiements Render/Railway)
      const mf = await useMultiFileAuthState(SESSION_FOLDER);
      state = mf.state;
      saveCreds = mf.saveCreds;
      sessionBackend = 'disk';
      console.log('[SESSION] 💾 Auth state via DISK (auto — SESSION_ID détectée)');
    } else if (firebaseDB && typeof firebaseDB.isConnected === 'function' && firebaseDB.isConnected()) {
      try {
        const fbAuth = await firebaseDB.useFirebaseAuthState(SESSION_FB_PATH);
        state = fbAuth.state;
        saveCreds = fbAuth.saveCreds;
        sessionBackend = 'firebase';
        console.log('[SESSION] 🔥 Auth state via Firebase (persistant entre redémarrages)');
      } catch (e) {
        console.error('[SESSION] ⚠️ Firebase auth state indisponible, fallback disque:', e.message);
      }
    }
    if (!state) {
      const mf = await useMultiFileAuthState(SESSION_FOLDER);
      state = mf.state;
      saveCreds = mf.saveCreds;
      sessionBackend = 'disk';
    }
  }

  // [DIAG] État des credentials chargés
  console.log(`[DIAG] creds.registered=${state.creds?.registered} creds.me=${state.creds?.me?.id || 'null'} account=${state.creds?.account?.accountSignature ? 'oui' : 'non'} waVersion...`);

  // Obtenir la version WhatsApp la plus récente
  let waVersion;
  try {
    const { version } = await require('@whiskeysockets/baileys').fetchLatestBaileysVersion();
    waVersion = version;
  } catch(e) {
    waVersion = [2, 3000, 1023042587];
  }

  // Créer la connexion WhatsApp avec paramètres optimisés pour la stabilité
  S.ovl = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "silent" }).child({ level: "silent" }),
      ),
    },
    logger: pino({ level: "silent" }),
    version: waVersion,
    browser: Browsers.macOS("Chrome"),  // macOS Chrome - plus accepté par WhatsApp
    keepAliveIntervalMs: 30000,          // Ping toutes les 30s (moins agressif pour Render)
    markOnlineOnConnect: false,         // Ne pas marquer en ligne (plus discret)
    generateHighQualityLinkPreview: false, // Désactivé pour économiser les ressources
    syncFullHistory: !state.creds?.me, // Synchro complète UNIQUEMENT en mode pairing (pas d'identité) — une session avec me existant qui resync = 428 Precondition Required chez WA
    retryRequestDelayMs: 3000,          // Délai entre les tentatives
    connectTimeoutMs: 120000,           // Timeout de connexion 2min (Render est lent)
    defaultQueryTimeoutMs: 90000,       // Timeout des requêtes plus long
    emitOwnEvents: true,                // Recevoir ses propres messages
    fireInitQueries: true,              // Initialiser les requêtes au démarrage
    getMessage: async (key) => {
      return { conversation: "" };
    },
  });

  // Gérer les événements de connexion
  S.ovl.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      S.currentQR = qr;
      S.connectionStatus = 'waiting_qr';
      console.log("\n📱 QR CODE DISPONIBLE !");
      console.log("═══════════════════════════════════════════════════");
      console.log("👉 Ouvre ton navigateur sur: http://localhost:" + PORT + "/qr");
      console.log("═══════════════════════════════════════════════════");
      console.log("   Puis scanne le QR avec WhatsApp → Appareils connectés\n");
    }

    if (connection === "connecting") {
      console.log("🔄 Connexion en cours...");
    }

    if (connection === "open") {
      S.currentQR = null;
      S.connectionStatus = 'connected';
      console.log("\n");
      console.log("╔════════════════════════════════════════╗");
      console.log("║     ✅ CONNEXION RÉUSSIE !             ║");
      console.log("╚════════════════════════════════════════╝");
      console.log("\n");

      // ── Auto-génération SESSION_ID pour Render (backend disque uniquement) ──
      if (sessionBackend === 'disk') try {
        const sessionFiles = fs.readdirSync(SESSION_FOLDER);
        const bundle = {};
        for (const f of sessionFiles) {
          const fp = path.join(SESSION_FOLDER, f);
          if (fs.statSync(fp).isFile()) bundle[f] = fs.readFileSync(fp).toString('base64');
        }
        const sessionId = 'HANI-MD~' + Buffer.from(JSON.stringify(bundle)).toString('base64');
        fs.writeFileSync(path.join(ROOT_DIR, 'session_id.txt'), sessionId);
        console.log("╔════════════════════════════════════════╗");
        console.log("║  🔑 SESSION_ID sauvegardée dans        ║");
        console.log("║     session_id.txt  → copie sur Render ║");
        console.log("╚════════════════════════════════════════╝");
        console.log(`📏 Longueur: ${sessionId.length} caractères\n`);
      } catch(e) {
        console.log('[SESSION] Auto-save SESSION_ID échoué:', e.message);
      }
      // ────────────────────────────────────────────────────────────

      // 🗄️ Restaurer le coffre vues-uniques depuis Firebase (disque effacé au redeploy)
      try { require('./vault').restoreFromFirebase(); } catch (e) {}

      console.log("📊 Informations du bot:");
      console.log(`   • Préfixe: ${config.PREFIXE}`);
      console.log(`   • Mode: ${config.MODE}`);
      console.log(`   • Owner: ${config.NOM_OWNER}`);
      console.log("\n");
      console.log("🛡️ Commandes de protection disponibles:");
      console.log(`   • ${config.PREFIXE}antilink on/off`);
      console.log(`   • ${config.PREFIXE}antispam on/off`);
      console.log(`   • ${config.PREFIXE}antibot on/off`);
      console.log(`   • ${config.PREFIXE}anticall on/off`);
      console.log(`   • ${config.PREFIXE}antitag on/off`);
      console.log("\n");
      console.log("💡 Tape " + config.PREFIXE + "menu sur WhatsApp pour voir toutes les commandes");
      console.log("\n");

      // 🤖 BOT CLONE NETWORK — désactivé au démarrage (stabilité Render)
      // Les bots réseau ne sont PAS reconnectés automatiquement pour éviter
      // de surcharger le serveur et de déconnecter le bot owner.
      // Utilisez la commande botconnect manuellement si nécessaire.
      console.log('[BOT-NET] ℹ️ Auto-connect désactivé (stabilité serveur)');

      // 👻 PRÉSENCE — mode fantôme désactivé par défaut
      // Par défaut, la présence WhatsApp reste NATURELLE : tu apparais en ligne
      // quand tu utilises WhatsApp, et "vu à" (dernière connexion) quand tu te
      // déconnectes — exactement comme WhatsApp normal.
      // Le mode fantôme (invisible en permanence) ne s'active que si GHOST_MODE="true".
      setTimeout(async () => {
        try {
          if (process.env.GHOST_MODE === "true") {
            await S.ovl.sendPresenceUpdate("unavailable");
            if (typeof S.ovl.updateLastSeenPrivacy === 'function') {
              await S.ovl.updateLastSeenPrivacy("none");
            }
            if (typeof S.ovl.updateOnlinePrivacy === 'function') {
              await S.ovl.updateOnlinePrivacy("match_last_seen");
            }
            console.log("[GHOST] 👻 Mode fantôme activé — bot apparaît hors ligne");
          } else {
            // Restaurer une présence visible/naturelle
            if (typeof S.ovl.updateLastSeenPrivacy === 'function') {
              await S.ovl.updateLastSeenPrivacy("all");
            }
            if (typeof S.ovl.updateOnlinePrivacy === 'function') {
              await S.ovl.updateOnlinePrivacy("all");
            }
            console.log("[GHOST] ✅ Présence naturelle — en ligne quand actif, 'vu à' hors ligne");
          }
        } catch(e) {
          console.log("[GHOST] presence:", e.message);
        }
        // Ne maintenir "hors ligne" que si le mode fantôme est explicitement activé
        if (process.env.GHOST_MODE === "true") {
          setInterval(async () => {
            try { await S.ovl.sendPresenceUpdate("unavailable"); } catch(e) {}
          }, 180000);
        }
      }, 3000);
      
      // 🔔 Envoyer les notifications de paiement en attente à l'owner
      setTimeout(async () => {
        try {
          const notifFile = path.join(ROOT_DIR, 'DataBase', 'pending_owner_notifications.json');
          if (fs.existsSync(notifFile)) {
            let notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8') || '[]');
            const pending = notifications.filter(n => !n.sent);
            
            if (pending.length > 0) {
              const ownerJid = getSelfJid(S.ovl);
              
              for (const notif of pending) {
                // Message déjà pré-formaté (ex: demandes d'inscription mises en file)
                let msg = notif.message || null;

                if (!msg && notif.type === 'payment') {
                  msg =
                    `💰 *PAIEMENT WAVE REÇU*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `👤 *Client:* ${notif.name}\n` +
                    `📱 *Téléphone:* ${notif.phone}\n` +
                    `💎 *Plan:* ${notif.plan}\n` +
                    `💵 *Montant:* ${notif.amount} FCFA\n` +
                    `📝 *Transaction:* ${notif.transactionId}\n\n` +
                    `🔑 *Code:* \`${notif.activationCode}\`\n\n` +
                    `⏰ *Date:* ${new Date(notif.createdAt).toLocaleString('fr-FR')}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━`;
                }

                if (msg) {
                  await S.ovl.sendMessage(ownerJid, { text: msg });
                  notif.sent = true;
                  await delay(1000);
                }
              }
              
              fs.writeFileSync(notifFile, JSON.stringify(notifications, null, 2));
              console.log(`[NOTIF] ✅ ${pending.length} notification(s) envoyée(s) à l'owner`);
            }
          }
        } catch (e) {
          console.error('[NOTIF] Erreur envoi notifications:', e.message);
        }
      }, 5000); // Attendre 5 secondes après connexion

      // On ne charge plus les modules obfusqués pour éviter les erreurs (ex: sharp).
      console.log(
        "ℹ️ Modules obfusqués ignorés. Utilise les commandes simples intégrées (ping, menu, info, protections).",
      );
    }

    if (connection === "close") {
      S.connectionStatus = 'disconnected';
      // Anti-tempête : plusieurs "close" consécutifs ne doivent planifier qu'UNE reconnexion
      if (S.reconnectPending) {
        console.log('⏳ Reconnexion déjà planifiée — événement close ignoré');
        return;
      }
      S.reconnectPending = true;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || "Inconnue";

      console.log(`\n⚠️ Connexion fermée (code: ${statusCode}, raison: ${reason})`);
      try { console.log('[DIAG] err:', JSON.stringify(lastDisconnect?.error?.output || {}).slice(0, 400)); } catch(e) {}

      // Vérifier si c'est un conflit ou erreur temporaire (NE PAS supprimer la session)
      const isConflict = reason?.toLowerCase().includes("conflict");
      const isConnectionFailure = reason?.toLowerCase().includes("connection failure");
      const isStreamError = reason?.toLowerCase().includes("stream errored");
      const isTemporaryError = isConflict || isConnectionFailure || isStreamError;
      
      // SEUL CAS de suppression de session: code 401 avec message "logged out" explicite
      const isRealLogout = statusCode === DisconnectReason.loggedOut && 
                           reason?.toLowerCase().includes("logged out");
      
      // Détecter les boucles de "Connection Failure" répétées
      if (isConnectionFailure && statusCode === 401) {
        S.connectionFailureCount++;
        console.log(`⚠️ Échec de connexion ${S.connectionFailureCount}/${MAX_CONNECTION_FAILURES}`);
        
        if (S.connectionFailureCount >= MAX_CONNECTION_FAILURES) {
          S.connectionFailureCount = 0;
          if (sessionBackend === 'firebase' && firebaseDB) {
            console.log("❌ Trop d'échecs - suppression session Firebase et nouveau QR...");
            try { await firebaseDB.clearAuthState(SESSION_FB_PATH); } catch (e) {}
            await delay(3000);
            startBot();
          } else if (process.env.SESSION_ID) {
            // Sur Railway/cloud : purger la copie Firebase (elle est morte aussi)
            await sessionBackup.clearBundle(firebaseDB);
            console.error('❌ SESSION INVALIDÉE — Regénérez la SESSION_ID:');
            console.error('   1. node session-generator.js  (sur votre PC)');
            console.error('   2. Mettez à jour SESSION_ID dans Railway Variables');
            console.error('⏳ Nouvelle tentative dans 60 secondes...');
            await delay(60000);
            startBot();
          } else {
            console.log("❌ Trop d'échecs - suppression session et nouveau QR...");
            if (fs.existsSync(SESSION_FOLDER)) {
              fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
            }
            await delay(3000);
            startBot();
          }
          return;
        }
      } else {
        // Réinitialiser le compteur si c'est une autre erreur
        S.connectionFailureCount = 0;
      }
      
      if (isRealLogout) {
        S.connectionFailureCount = 0;
        if (sessionBackend === 'firebase' && firebaseDB) {
          console.log('❌ Déconnexion WhatsApp détectée - suppression session Firebase et nouveau QR...');
          try { await firebaseDB.clearAuthState(SESSION_FB_PATH); } catch (e) {}
          await delay(3000);
          startBot();
        } else if (process.env.SESSION_ID) {
          // Sur Railway/cloud : purger la copie Firebase (déconnectée aussi)
          await sessionBackup.clearBundle(firebaseDB);
          console.error('❌ DÉCONNEXION WHATSAPP DÉTECTÉE');
          console.error('   → Allez dans WhatsApp > Appareils connectés > Déconnecter TOUT');
          console.error('   → Puis: node session-generator.js sur votre PC');
          console.error('   → Puis mettez à jour SESSION_ID dans Railway');
          console.error('⏳ Nouvelle tentative dans 60 secondes...');
          await delay(60000);
          startBot();
        } else {
          console.log("❌ Déconnexion manuelle - suppression session et nouveau QR...");
          if (fs.existsSync(SESSION_FOLDER)) {
            fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          }
          await delay(3000);
          startBot();
        }
      } else if (isTemporaryError) {
        // Erreur temporaire (conflit, connection failure, stream error) - garder la session
        console.log("⚡ Erreur temporaire détectée - reconnexion dans 8s...");
        await delay(8000);
        startBot();
      } else if (statusCode === DisconnectReason.connectionClosed || 
                 statusCode === DisconnectReason.connectionLost ||
                 statusCode === DisconnectReason.timedOut ||
                 statusCode === DisconnectReason.restartRequired) {
        // 428 répétés = session corrompue côté serveur → après 5 échecs on repart sur un QR frais
        if (statusCode === DisconnectReason.connectionClosed) {
          S.terminatedCount = (S.terminatedCount || 0) + 1;
          if (S.terminatedCount >= 5 && sessionBackend === 'firebase' && firebaseDB) {
            S.terminatedCount = 0;
            console.log("❌ 5x Connection Terminated — session Firebase corrompue, nettoyage et nouveau QR...");
            try { await firebaseDB.clearAuthState(SESSION_FB_PATH); } catch (e) {}
            await delay(5000);
            startBot();
            return;
          }
        }
        console.log("🔄 Reconnexion dans 60 secondes (cooldown anti-throttle WA)...");
        await delay(60000);
        startBot();
      } else {
        // Autres erreurs - reconnexion standard (garder la session)
        console.log("🔄 Reconnexion dans 3 secondes...");
        await delay(3000);
        startBot();
      }
    }

    // Réinitialiser le compteur en cas de connexion réussie
    if (connection === "open") {
      S.connectionFailureCount = 0;
      S.terminatedCount = 0;
    }
  });

  // Sauvegarder les credentials
  // Sauvegarde continue du bundle session vers Firebase (le disque Render
  // est éphémère — sans ça, chaque restart repart sur des clés périmées).
  // Uniquement en backend disk : en backend firebase, l'état vit déjà dans RTDB.
  const backupCtl = sessionBackend === 'disk'
    ? sessionBackup.startAutoBackup(firebaseDB, SESSION_FOLDER)
    : { schedule: () => {}, pushNow: async () => false };
  S.ovl.ev.on("creds.update", async () => { await saveCreds(); backupCtl.schedule(); });

  // Gérer les messages avec le handler lisible ci-dessus
  S.ovl.ev.on("messages.upsert", async (m) => {
    try {
      // [DEBUG] Tracer chaque upsert pour diagnostiquer la réception
      const _msgs = m.messages || [];
      const _first = _msgs[0];
      console.log(`[UPSERT] type=${m.type} count=${_msgs.length} remoteJid=${_first?.key?.remoteJid} fromMe=${_first?.key?.fromMe} hasMsg=${!!_first?.message} msgType=${Object.keys(_first?.message || {})[0] || 'none'}`);

      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;

      // 📇 Enregistrer le JID de l'expéditeur automatiquement
      registerJid(msg);
      
      // ═══════════════════════════════════════════════════════════
      // 👻 INTERCEPTEUR CONTACTS FANTÔMES — bloquer silencieusement
      // Utilise les JIDs complets (@lid ou @s.whatsapp.net) pour matcher
      // ═══════════════════════════════════════════════════════════
      if (global._ghostContacts && global._ghostContacts.size > 0 && !msg.key.fromMe) {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const chatJid = msg.key.remoteJid;
        const isPrivateChat = !chatJid?.endsWith('@g.us');
        
        // Vérifier par le JID du sender ET par le JID du chat (privé)
        const ghostKey = findGhostKey(senderJid) || (isPrivateChat ? findGhostKey(chatJid) : null);
        
        if (ghostKey) {
          // Stocker le message silencieusement
          const ghostText = getMessageText(msg);
          const ghostMsgType = Object.keys(msg.message || {})[0] || 'inconnu';
          const isGroup = chatJid?.endsWith('@g.us');
          let groupName = null;
          if (isGroup) {
            try { groupName = (await S.ovl.groupMetadata(chatJid))?.subject; } catch(e) {}
          }
          
          const msgs = global._ghostMessages.get(ghostKey) || [];
          if (!global._ghostMessages.has(ghostKey)) global._ghostMessages.set(ghostKey, msgs);
          
          msgs.push({
            text: ghostText || null,
            type: ghostMsgType.replace('Message', ''),
            date: new Date().toLocaleString('fr-FR'),
            pushName: msg.pushName || 'Inconnu',
            fromGroup: isGroup,
            groupName: groupName,
            timestamp: Date.now()
          });
          
          // Mettre à jour le pushName et ajouter les JIDs découverts
          const ghostInfo = global._ghostContacts.get(ghostKey);
          if (ghostInfo) {
            if (msg.pushName) ghostInfo.pushName = msg.pushName;
            // Ajouter le senderJid et chatJid s'ils ne sont pas déjà connus
            if (!ghostInfo.allJids) ghostInfo.allJids = [];
            if (senderJid && !ghostInfo.allJids.includes(senderJid)) ghostInfo.allJids.push(senderJid);
            if (isPrivateChat && chatJid && !ghostInfo.allJids.includes(chatJid)) ghostInfo.allJids.push(chatJid);
            global._ghostContacts.set(ghostKey, ghostInfo);
          }
          
          // Limiter à 500 messages max
          if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
          
          // Sauvegarder (toutes les 3 msgs pour ne pas surcharger)
          if (msgs.length % 3 === 0) saveGhostState();
          
          // ── ACTIONS pour faire disparaître ──
          // Le lastMessages est requis par Baileys pour archive/markRead/clear
          const lastMsgForModify = [{
            key: msg.key,
            messageTimestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000)
          }];
          
          // 1. Marquer comme lu (supprime le badge)
          try { await S.ovl.readMessages([msg.key]); } catch(e) { console.log('[GHOST] readMessages err:', e.message); }
          
          // 2. Supprimer le message pour moi
          try {
            await S.ovl.chatModify(
              { deleteForMe: { key: msg.key, timestamp: msg.messageTimestamp || Math.floor(Date.now()/1000) } },
              chatJid
            );
          } catch(e) { console.log('[GHOST] deleteForMe err:', e.message); }
          
          if (isPrivateChat) {
            // 3. Muter 1 an
            try {
              await S.ovl.chatModify({ mute: Math.floor(Date.now()/1000) + 365*24*60*60 }, chatJid);
            } catch(e) { console.log('[GHOST] mute err:', e.message); }
            
            // 4. Archiver (nécessite lastMessages)
            try {
              await S.ovl.chatModify({ archive: true, lastMessages: lastMsgForModify }, chatJid);
            } catch(e) { console.log('[GHOST] archive err:', e.message); }
            
            // 5. Marquer le chat comme lu (nécessite lastMessages)
            try {
              await S.ovl.chatModify({ markRead: true, lastMessages: lastMsgForModify }, chatJid);
            } catch(e) { console.log('[GHOST] markRead err:', e.message); }
          }
          
          const phone = ghostInfo?.phone || senderJid?.split('@')[0] || '?';
          console.log(`[GHOST] 👻 Message intercepté de +${phone} (JID: ${senderJid}) — ${ghostMsgType} — ${msgs.length} msg stockés`);
          
          // NE PAS traiter ce message
          if (!ghostText || !ghostText.startsWith(config.PREFIXE)) {
            return; // Bloquer totalement
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // 👁️ INTERCEPTER LES MESSAGES À VUE UNIQUE
      // ═══════════════════════════════════════════════════════════
      const viewOnceContent = msg.message.viewOnceMessage || msg.message.viewOnceMessageV2 || msg.message.viewOnceMessageV2Extension;
      if (viewOnceContent) {
        const chatJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0] || "inconnu";
        
        console.log(`\n══════════════════════════════════════`);
        console.log(`👁️ VUE UNIQUE DÉTECTÉE!`);
        console.log(`   ID: ${msg.key.id}`);
        console.log(`   De: ${msg.pushName || senderJid}`);
        console.log(`   Type: ${mediaType}`);
        console.log(`   Chat: ${chatJid}`);
        console.log(`══════════════════════════════════════\n`);
        
        // Stocker le message à vue unique avec plus d'infos
        viewOnceMessages.set(msg.key.id, {
          id: msg.key.id,
          sender: senderJid,
          chat: chatJid,
          pushName: msg.pushName || "Inconnu",
          type: mediaType.replace("Message", ""),
          date: new Date().toLocaleString("fr-FR"),
          timestamp: Date.now(),
          message: msg,  // Message complet pour téléchargement
          fromMe: msg.key.fromMe
        });
        
        // Garder les 50 derniers
        if (viewOnceMessages.size > 50) {
          const firstKey = viewOnceMessages.keys().next().value;
          viewOnceMessages.delete(firstKey);
        }
        
        // Sauvegarder sur le disque
        saveViewOnceMessages(viewOnceMessages);

        console.log(`[VV] ✅ Vue unique sauvegardée. Total: ${viewOnceMessages.size}`);

        // ═══════════════════════════════════════════════════════════
        // 🗄️ COFFRE WEB — téléchargement auto immédiat (avant expiration URL)
        // ═══════════════════════════════════════════════════════════
        (async () => {
          try {
            const vault = require('./vault');
            const mediaNode = vault.findMediaNode(mediaMsg);
            if (!mediaNode) return; // pas de média téléchargeable (boutons, texte...)
            const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
              logger: pino({ level: 'silent' }),
              reuploadRequest: S.ovl?.updateMediaMessage?.bind(S.ovl),
            });
            const entry = await vault.saveMedia({
              id: msg.key.id,
              buffer,
              mime: mediaNode.node?.mimetype || '',
              meta: {
                sender: senderJid,
                pushName: msg.pushName || 'Inconnu',
                chat: chatJid,
                type: mediaNode.type.replace('Message', ''),
                caption: mediaNode.node?.caption || '',
              },
            });
            // 📲 Copie dans le self-chat : le média vit dans WhatsApp
            // (= stockage direct sur le téléphone de l'owner, sans limite)
            try {
              const selfJid = getSelfJid(S.ovl);
              const cap = `👁️ *Vue unique capturée*\n👤 ${entry.pushName} (${senderJid.split('@')[0]})\n🕐 ${entry.date}`
                + (entry.caption ? `\n💬 ${entry.caption}` : '') + `\n🗄️ Archivée dans le coffre /vault`;
              const t = mediaNode.type;
              if (t === 'imageMessage') await S.ovl.sendMessage(selfJid, { image: buffer, caption: cap });
              else if (t === 'videoMessage') await S.ovl.sendMessage(selfJid, { video: buffer, caption: cap });
              else if (t === 'audioMessage') await S.ovl.sendMessage(selfJid, { audio: buffer, mimetype: mediaNode.node?.mimetype || 'audio/ogg; codecs=opus', ptt: !!mediaNode.node?.ptt });
              else if (t === 'documentMessage') await S.ovl.sendMessage(selfJid, { document: buffer, mimetype: mediaNode.node?.mimetype || 'application/octet-stream', fileName: mediaNode.node?.fileName || 'document', caption: cap });
              else if (t === 'stickerMessage') await S.ovl.sendMessage(selfJid, { sticker: buffer });
              else await S.ovl.sendMessage(selfJid, { text: cap });
            } catch (e) { console.log('[VAULT] ⚠️ Transfert self-chat échoué:', e.message); }
          } catch (e) {
            console.log('[VAULT] ⚠️ Téléchargement vue unique échoué:', e.message);
          }
        })();
      }
      
      // Stocker tous les messages pour anti-delete
      if (!msg.key.fromMe && msg.message) {
        const msgType = Object.keys(msg.message)[0];
        messageStore.set(msg.key.id, {
          key: msg.key,
          message: msg.message,
          sender: msg.key.remoteJid,
          pushName: msg.pushName || "Inconnu",
          timestamp: new Date(),
          type: msgType,
          text: getMessageText(msg)
        });
        
        // Limiter la taille du store
        if (messageStore.size > MAX_STORED_MESSAGES) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 📇 COLLECTER LES CONTACTS CONNUS (pour statusJidList)
      // ═══════════════════════════════════════════════════════════
      if (!msg.key.fromMe) {
        const senderForContact = msg.key.participant || msg.key.remoteJid;
        if (senderForContact && senderForContact.endsWith('@s.whatsapp.net')) {
          const cleanJid = senderForContact.replace(/:\d+@/, '@');
          global._knownContactJids.add(cleanJid);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 🕵️ INTERCEPTEUR SPY — approche hani.js (Set de numéros purs)
      // ═══════════════════════════════════════════════════════════
      if (!msg.key.fromMe && msg.message) {
        const spyList = global._watchList;
        const spyMap  = global.presenceSpyList;
        const hasTargets = (spyList && spyList.size > 0) || (spyMap && spyMap.size > 0);

        if (hasTargets) {
          const senderJid = msg.key.participant || msg.key.remoteJid;
          const senderNum = senderJid?.split('@')[0]?.split(':')[0] || '';
          const ownerNum  = (process.env.NUMERO_OWNER || '22550252467').replace(/\D/g, '');
          const ownerJid  = ownerNum + '@s.whatsapp.net';

          // Construire la liste unifiée de numéros surveillés
          const watched = new Set();
          if (spyList) for (const n of spyList) watched.add(String(n));
          if (spyMap)  for (const [jid] of spyMap) watched.add(jid.split('@')[0].split(':')[0]);

          // Correspondance flexible : fin de numéro suffit (gère indicatif absent)
          let matchedNum = null;
          for (const w of watched) {
            if (senderNum === w || senderNum.endsWith(w) || w.endsWith(senderNum)) {
              matchedNum = w;
              break;
            }
          }

          if (matchedNum) {
            console.log(`[SPY] 🔔 Match: sender=${senderNum} → watched=${matchedNum}`);
            try {
              const watchedName = msg.pushName || senderNum;
              const chatId      = msg.key.remoteJid;
              const isGrp       = chatId?.endsWith('@g.us');
              const msgType     = getContentType(msg.message);
              const msgText     = getMessageText(msg);

              let alert = `🕵️ *ALERTE SURVEILLANCE*\n`;
              alert += `━━━━━━━━━━━━━━━━━━━━\n`;
              alert += `👤 *Nom:* ${watchedName}\n`;
              alert += `📱 *Numéro:* +${senderNum}\n`;
              alert += `💬 *Chat:* ${isGrp ? 'Groupe' : 'Privé'}\n`;
              alert += `📝 *Type:* ${(msgType || 'texte').replace('Message', '')}\n`;
              alert += `🕐 *Heure:* ${new Date().toLocaleString('fr-FR')}\n`;
              alert += `━━━━━━━━━━━━━━━━━━━━`;
              if (msgText) alert += `\n\n📄 *Message:*\n"${msgText.substring(0, 400)}"`;

              if (['imageMessage','videoMessage','audioMessage'].includes(msgType)) {
                try {
                  const buf = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: pino({ level: 'silent' }),
                    reuploadRequest: S.ovl.updateMediaMessage
                  });
                  if (msgType === 'imageMessage') {
                    await S.ovl.sendMessage(ownerJid, { image: buf, caption: alert });
                  } else if (msgType === 'videoMessage') {
                    await S.ovl.sendMessage(ownerJid, { video: buf, caption: alert });
                  } else {
                    await S.ovl.sendMessage(ownerJid, { text: alert });
                    await S.ovl.sendMessage(ownerJid, { audio: buf, mimetype: 'audio/mp4', ptt: true });
                  }
                } catch (_) {
                  await S.ovl.sendMessage(ownerJid, { text: alert });
                }
              } else {
                await S.ovl.sendMessage(ownerJid, { text: alert });
              }
              console.log(`[SPY] ✅ Alerte envoyée à owner pour ${watchedName} (+${senderNum})`);
            } catch (e) {
              console.log('[SPY] ⚠️ Erreur alerte:', e.message);
            }
          }
        }
      }

      // Log pour déboguer
      const body = getMessageText(msg);
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const chatJid = msg.key.remoteJid;
      const isGroup = chatJid?.endsWith('@g.us');

      if (body) {
        console.log(`📩 Message reçu: "${body}" de ${chatJid} (fromMe: ${msg.key.fromMe})`);
      }

      // ═══════════════════════════════════════════════════════
      // 📊 TRACKING ANALYTICS & HISTORIQUE (Nouvelles Fonctionnalités)
      // ═══════════════════════════════════════════════════════
      if (!msg.key.fromMe && body) {
        try {
          // Tracking pour analytics
          trackMessage(senderJid, isGroup);
          // Ajouter à l'historique pour résumé et recherche
          addToHistory(chatJid, body, senderJid);
        } catch (e) {
          // Silencieux si erreur
        }
      }

      // ═══════════════════════════════════════════════════════
      // 🔇 VÉRIFICATION MODE SILENCE (Nouvelles Fonctionnalités)
      // ═══════════════════════════════════════════════════════
      const ownerNumber = process.env.NUMERO_OWNER || "22550252467";
      const ownerJid = ownerNumber.replace(/\D/g, "") + "@s.whatsapp.net";
      const isOwner = msg.key.fromMe || senderJid === ownerJid;

      if (!isOwner && !msg.key.fromMe) {
        try {
          if (isSilenced(ownerJid, chatJid)) {
            console.log(`[SILENCE] 🔇 Message ignoré de ${chatJid} (mode silence actif)`);
            return; // Bloquer tout traitement si silence actif
          }
        } catch (e) {
          // Continuer si erreur
        }
      }

      // ═══════════════════════════════════════════════════════
      // 🤖 AUTOREPLY — Vérifier les déclencheurs configurés
      // ═══════════════════════════════════════════════════════
      // Ignorer les messages de groupe pour l'autoréponse
      const isGroupMsg = msg.key.remoteJid?.endsWith('@g.us');
      if (!msg.key.fromMe && body && !isGroupMsg) {
        try {
          const AUTOREPLY_DB_PATH = path.join(ROOT_DIR, 'DataBase', 'autoreply_advanced.json');
          if (fs.existsSync(AUTOREPLY_DB_PATH)) {
            const arDB = JSON.parse(fs.readFileSync(AUTOREPLY_DB_PATH, 'utf8'));
            if (arDB.settings?.enabled !== false && arDB.replies && Object.keys(arDB.replies).length > 0) {
              const msgLower = arDB.settings?.caseSensitive ? body : body.toLowerCase();
              let matched = null;

              for (const [trigger, data] of Object.entries(arDB.replies)) {
                const t = arDB.settings?.caseSensitive ? trigger : trigger.toLowerCase();
                let isMatch = false;
                
                if (arDB.settings?.partialMatch !== false) {
                  // Mode partial : contient n'importe où
                  isMatch = msgLower.includes(t);
                } else {
                  // Mode exact : match complet OU mot entier (avec espaces/punctuation)
                  isMatch = msgLower === t || 
                            new RegExp('(?:^|\\s|[^\\w])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|\\s|[^\\w])', 'i').test(msgLower);
                }
                
                if (isMatch) { matched = data; break; }
              }

              if (matched) {
                const chatJid = msg.key.remoteJid;
                const replyText = typeof matched === 'string' ? matched : matched.response;
                if (replyText) {
                  await S.ovl.sendMessage(chatJid, { text: replyText }, { quoted: msg });
                  console.log(`[AUTOREPLY] ✅ Trigger → réponse envoyée à ${chatJid}`);
                  try {
                    arDB.stats = arDB.stats || {};
                    arDB.stats.totalTriggers = (arDB.stats.totalTriggers || 0) + 1;
                    fs.writeFileSync(AUTOREPLY_DB_PATH, JSON.stringify(arDB, null, 2));
                  } catch(e) {}
                }
              }

              // ── MESSAGE D'ABSENCE (awaymsg) ──
              if (!matched && arDB.awayEnabled) {
                const now = new Date();
                const [startH, startM] = (arDB.awaySchedule?.start || '22:00').split(':').map(Number);
                const [endH, endM]     = (arDB.awaySchedule?.end   || '08:00').split(':').map(Number);
                const mins = now.getHours() * 60 + now.getMinutes();
                const startMins = startH * 60 + startM;
                const endMins   = endH   * 60 + endM;
                const isAbsent  = startMins > endMins
                  ? (mins >= startMins || mins < endMins)   // passe minuit
                  : (mins >= startMins && mins < endMins);
                if (isAbsent) {
                  const senderName = msg.pushName || msg.key.remoteJid.split('@')[0];
                  const awayText = (arDB.awayMessage || '🕐 Je suis absent.')
                    .replace('{name}', senderName)
                    .replace('{number}', msg.key.remoteJid.split('@')[0])
                    .replace('{time}', now.toLocaleTimeString('fr-FR'));
                  await S.ovl.sendMessage(msg.key.remoteJid, { text: awayText }, { quoted: msg });
                  console.log('[AWAYMSG] ✅ Message absence envoyé');
                }
              }

              // ── MESSAGE DE BIENVENUE (welcomemsg) ──
              if (!matched && arDB.welcomeEnabled) {
                const welcomeKey = `welcome_sent_${msg.key.remoteJid}`;
                const alreadySent = global._welcomeSent || (global._welcomeSent = new Set());
                if (!alreadySent.has(welcomeKey)) {
                  alreadySent.add(welcomeKey);
                  const senderName = msg.pushName || msg.key.remoteJid.split('@')[0];
                  const wText = (arDB.welcomeMessage || '👋 Bienvenue!')
                    .replace('{name}', senderName)
                    .replace('{number}', msg.key.remoteJid.split('@')[0])
                    .replace('{time}', new Date().toLocaleTimeString('fr-FR'));
                  await S.ovl.sendMessage(msg.key.remoteJid, { text: wText }, { quoted: msg });
                  console.log('[WELCOMEMSG] ✅ Bienvenue envoyé à', msg.key.remoteJid);
                }
              }
            }
          }
        } catch (arErr) {
          console.log('[AUTOREPLY] Erreur:', arErr.message);
        }
      }

      // ═══════════════════════════════════════════════════════
      // ✅ DÉTECTION SPÉCIALE "C'EST BIEN" (sans préfixe)
      // ═══════════════════════════════════════════════════════
      const msgBodyForCestBien = getMessageText(msg);
      const cestBienOwnerNumber = process.env.NUMERO_OWNER || "22550252467";
      const cestBienOwnerJid = cestBienOwnerNumber.replace(/\D/g, "") + "@s.whatsapp.net";
      const cestBienSenderJid = msg.key.participant || msg.key.remoteJid;
      const cestBienIsOwner = msg.key.fromMe || cestBienSenderJid === cestBienOwnerJid;

      if (cestBienIsOwner && msgBodyForCestBien) {
        const normalizedBody = msgBodyForCestBien.trim().toLowerCase();
        if (normalizedBody === "c'est bien" || normalizedBody === "c'est bien" || normalizedBody === "cest bien") {
          console.log("[C'EST BIEN] ✅ Détection sans préfixe");
          if (global._handleCestBien) {
            try {
              await global._handleCestBien(S.ovl, msg, async (text) => {
                await S.ovl.sendMessage(msg.key.remoteJid, { text });
              });
            } catch (e) {
              console.error("[C'EST BIEN] Erreur:", e.message);
            }
          }
        }
      }

      // Traiter les commandes (même les messages envoyés par soi-même)
      await handleCommand(S.ovl, msg);
      // 👻 Re-signaler "hors ligne" après chaque commande traitée
      // UNIQUEMENT si le mode fantôme est explicitement activé.
      // Sinon, on laisse la présence WhatsApp naturelle (en ligne quand actif,
      // "vu à" quand déconnecté) — c'est ce comportement qui était sur-masqué.
      if (process.env.GHOST_MODE === "true") {
        try { await S.ovl.sendPresenceUpdate("unavailable"); } catch(e) {}
      }
    } catch (e) {
      console.log("⚠️ Erreur message:", e.message);
    }
  });

  // Gérer les messages supprimés (messages.update)
  S.ovl.ev.on("messages.update", async (updates) => {
    if (!protectionState.antidelete) return;
    
    for (const update of updates) {
      // Détecter si le message a été supprimé
      if (update.update?.messageStubType === 1 || update.update?.message === null) {
        const msgId = update.key?.id;
        const storedMsg = messageStore.get(msgId);
        
        if (storedMsg) {
          console.log(`🗑️ Message supprimé détecté de ${storedMsg.sender}`);
          
          // Ajouter aux messages supprimés
          deletedMessages.push({
            sender: storedMsg.pushName,
            chat: storedMsg.sender,
            type: storedMsg.type?.replace("Message", "") || "texte",
            text: storedMsg.text,
            date: new Date().toLocaleString("fr-FR"),
            originalMessage: storedMsg
          });
          
          // Limiter la taille
          if (deletedMessages.length > MAX_DELETED_MESSAGES) {
            deletedMessages.shift();
          }
          // Sauvegarder sur disque immédiatement (persistance après redémarrage)
          saveDeletedMessages(deletedMessages);
          
          // Envoyer le message supprimé à toi-même
          try {
            const myJid = getSelfJid(S.ovl);
            if (myJid) {
              let notifText = `🗑️ *Message supprimé détecté*\n\n`;
              notifText += `👤 De: ${storedMsg.pushName}\n`;
              notifText += `💬 Chat: ${storedMsg.sender}\n`;
              notifText += `📝 Type: ${storedMsg.type?.replace("Message", "")}\n`;
              notifText += `🕐 Date: ${new Date().toLocaleString("fr-FR")}\n`;
              // Texte du message — plusieurs tentatives
              const msgContent = storedMsg.text ||
                getMessageText({ message: storedMsg.message }) ||
                "";
              if (msgContent) {
                notifText += `\n📄 *Contenu:*\n"${msgContent}"`;
              } else {
                // Fallback : afficher le type brut si pas de texte extractible
                notifText += `\n📄 Contenu: [${storedMsg.type || 'inconnu'} — pas de texte]`;
              }
              
              await S.ovl.sendMessage(myJid, { text: notifText });
              
              // Si c'était un média, essayer de le renvoyer
              if (storedMsg.type === "imageMessage" || storedMsg.type === "videoMessage" || storedMsg.type === "audioMessage") {
                try {
                  const stream = await downloadMediaMessage(
                    { message: storedMsg.message, key: storedMsg.key },
                    "buffer",
                    {},
                    { logger: pino({ level: "silent" }), reuploadRequest: S.ovl.updateMediaMessage }
                  );
                  
                  if (storedMsg.type === "imageMessage") {
                    await S.ovl.sendMessage(myJid, { image: stream, caption: "🗑️ Image supprimée" });
                  } else if (storedMsg.type === "videoMessage") {
                    await S.ovl.sendMessage(myJid, { video: stream, caption: "🗑️ Vidéo supprimée" });
                  } else if (storedMsg.type === "audioMessage") {
                    await S.ovl.sendMessage(myJid, { audio: stream, mimetype: "audio/mp4" });
                  }
                } catch (mediaErr) {
                  console.log("⚠️ Impossible de récupérer le média supprimé");
                }
              }
            }
          } catch (e) {
            console.log("⚠️ Erreur notification antidelete:", e.message);
          }
        }
      }
    }
  });

  // Gérer les appels basiquement (bloquer si anticall actif)
  S.ovl.ev.on("call", async (calls) => {
    for (const call of calls || []) {
      if (call.status === "offer" && protectionState.anticall) {
        try {
          await S.ovl.rejectCall(call.id, call.from);
          await S.ovl.sendMessage(call.from, { text: "❌ Les appels sont désactivés sur ce bot." });
        } catch (e) {
          // Ignorer
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 👁️ SURVEILLANCE PRÉSENCE — TOUS LES MOYENS POSSIBLES
  // ═══════════════════════════════════════════════════════════
  const ownerJid = getSelfJid(S.ovl);

  // Helper: envoyer notification au proprio sans plantage
  const spyNotify = async (text) => {
    try { await S.ovl.sendMessage(ownerJid, { text }); } catch(_) {}
  };

  // ── MÉTHODE 1 : presenceSubscribe (événement temps réel) ───
  const subscribeAll = async () => {
    for (const [jid] of global.presenceSpyList) {
      try { await S.ovl.presenceSubscribe(jid); } catch(_) {}
    }
  };
  await subscribeAll(); // souscription immédiate au démarrage

  // ── MÉTHODE 2 : Re-souscription périodique (toutes les 4 min)
  // WhatsApp expire les souscriptions présence → renouveler régulièrement
  if (global._presenceInterval) clearInterval(global._presenceInterval);
  global._presenceInterval = setInterval(subscribeAll, 4 * 60 * 1000);

  // ── MÉTHODE 3 : Polling "À propos" + business profile (toutes les 15 min)
  if (global._statusPollInterval) clearInterval(global._statusPollInterval);
  global._statusPollInterval = setInterval(async () => {
    for (const [jid, info] of global.presenceSpyList) {
      const num = jid.split('@')[0];
      try {
        // Vérifier si toujours sur WhatsApp
        const [onWA] = await S.ovl.onWhatsApp('+' + num).catch(() => [null]);
        if (onWA && !onWA.exists) {
          await spyNotify(`⚠️ *SURVEILLANCE*\n\n👤 *+${num}* n'est plus sur WhatsApp ou a changé de numéro.`);
          continue;
        }
      } catch(_) {}

      try {
        // Vérifier changement de statut "À propos"
        const s = await S.ovl.fetchStatus(jid).catch(() => null);
        const newStatus = s?.status || '';
        if (newStatus && newStatus !== info.lastAbout) {
          const old = info.lastAbout || '(inconnu)';
          info.lastAbout = newStatus;
          global.presenceSpyList.set(jid, info);
          await spyNotify(
            `📝 *CHANGEMENT DE BIO*\n\n👤 *+${num}* a changé son statut "À propos"\n\n` +
            `Avant: _${old}_\nAprès: _${newStatus}_`
          );
        } else if (newStatus && !info.lastAbout) {
          info.lastAbout = newStatus;
          global.presenceSpyList.set(jid, info);
        }
      } catch(_) {}

      try {
        // Tenter profil business
        const bp = await S.ovl.getBusinessProfile(jid).catch(() => null);
        if (bp?.description && bp.description !== info.lastBizDesc) {
          info.lastBizDesc = bp.description;
          global.presenceSpyList.set(jid, info);
          await spyNotify(
            `🏪 *PROFIL BUSINESS*\n\n👤 *+${num}* a un profil professionnel:\n_${bp.description}_`
          );
        }
      } catch(_) {}
    }
  }, 15 * 60 * 1000);

  // ═══════════════════════════════════════════════════════════
  // 🔄 VÉRIFICATEURS DES NOUVELLES FONCTIONNALITÉS
  // ═══════════════════════════════════════════════════════════

  // ── Vérifier les rappels toutes les 1 minute ─────
  if (global._rappelInterval) clearInterval(global._rappelInterval);
  global._rappelInterval = setInterval(async () => {
    try { await checkRappels(S.ovl); } catch(e) {}
  }, 60 * 1000);

  // ── Vérifier les messages planifiés toutes les 1 minute ─────
  if (global._scheduledInterval) clearInterval(global._scheduledInterval);
  global._scheduledInterval = setInterval(async () => {
    try { await processScheduledMessages(S.ovl); } catch(e) {}
  }, 60 * 1000);

  // ── Vérifier les rappels calendrier toutes les 2 minutes ─────
  if (global._calendarInterval) clearInterval(global._calendarInterval);
  global._calendarInterval = setInterval(async () => {
    try { await checkCalendarReminders(S.ovl); } catch(e) {}
  }, 2 * 60 * 1000);

  console.log("[SCHEDULER] ✅ Vérificateurs automatiques démarrés");

  // ── MÉTHODE 4 : Événement presence.update (temps réel) ─────
  S.ovl.ev.on('presence.update', async ({ id, presences }) => {
    // 👻 GHOST : Ignorer les mises à jour de présence des contacts fantômes
    if (isGhostJid(id)) return;
    if (!global.presenceSpyList.has(id)) return;
    const info = global.presenceSpyList.get(id) || {};
    const num = id.split('@')[0];

    for (const [, presence] of Object.entries(presences || {})) {
      const lastPres = presence.lastKnownPresence;
      const isOnline = lastPres === 'available' || lastPres === 'composing' || lastPres === 'recording';
      const wasOnline = info.isOnline;

      info.isOnline = isOnline;
      info.lastKnownPresence = lastPres;
      if (presence.lastSeen) info.lastSeen = presence.lastSeen;
      info.lastUpdate = Date.now();
      global.presenceSpyList.set(id, info);

      const heure = new Date().toLocaleString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

      if (lastPres === 'composing') {
        await spyNotify(`✏️ *EN TRAIN D'ÉCRIRE*\n\n👤 *+${num}* est en train d'écrire un message\n🕐 ${heure}`);
      } else if (lastPres === 'recording') {
        await spyNotify(`🎤 *EN TRAIN D'ENREGISTRER*\n\n👤 *+${num}* enregistre un audio\n🕐 ${heure}`);
      } else if (isOnline && !wasOnline) {
        await spyNotify(`👁️ *SURVEILLANCE PRÉSENCE*\n\n🟢 *+${num}* vient de se connecter\n🕐 ${heure}\n\n_Contact sous surveillance_`);
      } else if (!isOnline && wasOnline) {
        const lastSeenStr = presence.lastSeen
          ? new Date(presence.lastSeen * 1000).toLocaleString('fr-FR') : heure;
        await spyNotify(`👁️ *SURVEILLANCE PRÉSENCE*\n\n🔴 *+${num}* s'est déconnecté\n🕐 Dernière vue: ${lastSeenStr}\n\n_Contact sous surveillance_`);
      }
    }
  });

  // ── MÉTHODE 5 : message.receipt.update — livraison + lecture ──
  S.ovl.ev.on('message.receipt.update', async (receipts) => {
    for (const receipt of receipts || []) {
      const senderJid = receipt.key?.participant || receipt.key?.remoteJid;
      // 👻 GHOST : Ignorer les accusés de lecture des contacts fantômes
      if (senderJid && isGhostJid(senderJid)) continue;
      if (!senderJid || !global.presenceSpyList.has(senderJid)) continue;
      const num = senderJid.split('@')[0];
      const info = global.presenceSpyList.get(senderJid) || {};

      if (receipt.receipt?.readTimestamp) {
        const heure = new Date(receipt.receipt.readTimestamp * 1000).toLocaleString('fr-FR');
        info.lastReceipt = receipt.receipt.readTimestamp;
        global.presenceSpyList.set(senderJid, info);
        await spyNotify(`✅ *ACCUSÉ DE LECTURE*\n\n👤 *+${num}* a lu ton message\n🕐 À: ${heure}\n\n_Contact sous surveillance_`);
      } else if (receipt.receipt?.deliveredTimestamp && !info.lastDelivered) {
        const heure = new Date(receipt.receipt.deliveredTimestamp * 1000).toLocaleString('fr-FR');
        info.lastDelivered = receipt.receipt.deliveredTimestamp;
        global.presenceSpyList.set(senderJid, info);
        await spyNotify(`📬 *MESSAGE REÇU*\n\n👤 *+${num}* a reçu ton message (✓✓)\n🕐 À: ${heure}`);
      }
    }
  });

  // ── MÉTHODE 6 : messages.update — statut d'envoi (1✓ 2✓ lu) ─
  S.ovl.ev.on('messages.update', async (updates) => {
    for (const u of updates || []) {
      const remoteJid = u.key?.remoteJid;
      if (!remoteJid || !global.presenceSpyList.has(remoteJid)) continue;
      const status = u.update?.status;
      if (!status) continue;
      const num = remoteJid.split('@')[0];
      const heure = new Date().toLocaleString('fr-FR', { hour:'2-digit', minute:'2-digit' });
      // status: 3=reçu, 4=lu, 5=lu(audio)
      if (status === 4 || status === 5) {
        await spyNotify(`💙 *MESSAGE LU*\n\n👤 *+${num}* a lu ton message (ticks bleus)\n🕐 ${heure}`);
      } else if (status === 3) {
        await spyNotify(`📩 *MESSAGE REÇU*\n\n👤 *+${num}* a reçu ton message (✓✓)\n🕐 ${heure}`);
      }
    }
  });

  // ── MÉTHODE 7 : Vue de ton statut (status@broadcast) ────────────
  // + Auto-surveillance : si quelqu'un regarde ton statut, l'ajouter comme cible
  // + Auto-view et auto-react aux statuts des contacts
  S.ovl.ev.on('messages.upsert', async ({ messages: msgs }) => {
    for (const m of msgs || []) {
      if (m.key?.remoteJid === 'status@broadcast' && !m.key?.fromMe) {
        // 👻 GHOST : Ignorer totalement les statuts des contacts fantômes
        const statusSender = m.key?.participant || m.key?.remoteJid;
        if (statusSender && isGhostJid(statusSender)) {
          console.log(`[GHOST] 👻 Statut ignoré de ${statusSender}`);
          continue;
        }
        // ── AUTO-VIEW / AUTO-REACT (commandes .autoview et .autoreact) ──
        if (m.message) {
          try {
            const scPath = path.join(ROOT_DIR, 'DataBase', 'status_config.json');
            if (fs.existsSync(scPath)) {
              const sc = JSON.parse(fs.readFileSync(scPath, 'utf8'));
              const senderJid = m.key?.participant;
              if (sc.autoView) {
                await S.ovl.readMessages([m.key]);
                console.log(`[STATUS] 👁️ Auto-vu: ${senderJid}`);
              }
              if (sc.autoReact && senderJid) {
                await S.ovl.sendMessage(senderJid, {
                  react: { text: sc.reactEmoji || '❤️', key: m.key }
                });
                console.log(`[STATUS] ❤️ Auto-réaction: ${senderJid}`);
              }
            }
          } catch (e) {
            console.log('[STATUS] Erreur autoview/autoreact:', e.message);
          }
        }
        const viewer = m.key?.participant || m.key?.remoteJid;
        if (!viewer) continue;
        const num = viewer.split('@')[0];
        const heure = new Date().toLocaleString('fr-FR', { hour:'2-digit', minute:'2-digit' });

        if (global.presenceSpyList.has(viewer)) {
          // Déjà surveillé → notifier la vue
          await spyNotify(`📊 *VUE DE STATUT*\n\n👤 *+${num}* a regardé ton statut\n🕐 À: ${heure}\n\n_Contact sous surveillance_`);
        } else if (global.autoSpyEnabled) {
          // Mode auto-spy actif → ajouter automatiquement ce viewer comme cible
          global.presenceSpyList.set(viewer, {
            addedAt: Date.now(),
            isOnline: false,
            lastSeen: null,
            lastReceipt: null,
            autoAdded: true
          });
          // Souscrire immédiatement à sa présence
          try { await S.ovl.presenceSubscribe(viewer); } catch(_) {}
          // Récupérer son statut "À propos"
          let bio = '';
          try { const s = await S.ovl.fetchStatus(viewer).catch(()=>null); bio = s?.status || ''; } catch(_) {}
          await spyNotify(
            `🕵️ *ESPION DÉTECTÉ — AJOUTÉ AUTOMATIQUEMENT*\n\n` +
            `👤 *+${num}* vient de regarder ton statut en cachette\n` +
            `📝 Bio: ${bio || '(non disponible)'}\n` +
            `🕐 Heure: ${heure}\n\n` +
            `📡 Surveillance activée sur ce contact.\n` +
            `Tu recevras toutes ses activités désormais.`
          );
        }
      }
    }
  });

  // ── MÉTHODE 8 : contacts.update — changement de photo de profil ─
  S.ovl.ev.on('contacts.update', async (updates) => {
    for (const contact of updates || []) {
      // 👻 GHOST : Ignorer les mises à jour de contacts fantômes
      if (contact.id && isGhostJid(contact.id)) continue;
      if (!contact.id || !global.presenceSpyList.has(contact.id)) continue;
      const num = contact.id.split('@')[0];
      const info = global.presenceSpyList.get(contact.id) || {};

      if (contact.imgUrl && contact.imgUrl !== info.lastPP) {
        info.lastPP = contact.imgUrl;
        global.presenceSpyList.set(contact.id, info);
        await spyNotify(`🖼️ *PHOTO DE PROFIL CHANGÉE*\n\n👤 *+${num}* a changé sa photo de profil\n🕐 ${new Date().toLocaleString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`);
      }
    }
  });

  return S.ovl;
}


module.exports = { startBot };
