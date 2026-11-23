/**
 * 🌐 HANI-MD - Serveur web Express (pages, API paiements, admin)
 * (extrait de start.js)
 */

const fs = require("fs");
const path = require("path");
const ROOT_DIR = path.join(__dirname, '..');
const express = require("express");
const QRCode = require("qrcode");
const { S } = require("./state");

function startWebServer() {
  // Démarrer le serveur Express pour le site web et garder le bot actif
  const express = require("express");
  // path déjà importé en haut du fichier
  const app = express();
  const port = process.env.PORT || 3000;
  
  // Middleware pour parser JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS - configurable via ALLOWED_ORIGINS (liste séparée par des virgules).
  // Par défaut '*' pour ne rien casser ; définissez ALLOWED_ORIGINS en prod pour restreindre.
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes('*')) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Charger le serveur premium (admin APIs, codes, users...)
  let premiumApp, requireAdmin;
  try {
    const ps = require('../web/premium-server');
    premiumApp  = ps.app;
    requireAdmin = ps.requireAdmin;
    console.log('[PREMIUM] ✅ Routes admin chargées depuis premium-server.js');
  } catch (e) {
    console.log('[PREMIUM] ⚠️ premium-server non disponible:', e.message);
    requireAdmin = (req, res, next) => next(); // fallback: pas de restriction
  }
  
  // Servir les fichiers statiques - web/public en priorité (pages HTML principales)
  app.use(express.static(path.join(ROOT_DIR, 'web', 'public')));
  app.use(express.static(path.join(ROOT_DIR, 'public')));
  
  // ═══════════════════════════════════════════════════════════
  // 🏥 HEALTH CHECK ENDPOINT (REQUIS PAR RENDER)
  // ═══════════════════════════════════════════════════════════
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      bot: "HANI-MD",
      version: "2.6.1",
      connection: S.connectionStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // ═══════════════════════════════════════════════════════════
  // 📱 PAGE QR CODE POUR CONNEXION WHATSAPP
  // ═══════════════════════════════════════════════════════════
  app.get("/qr", async (req, res) => {
    if (S.connectionStatus === 'connected') {
      res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HANI-MD - Connecté</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', sans-serif; 
        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .container { text-align: center; padding: 40px; }
      .emoji { font-size: 6rem; margin-bottom: 20px; }
      h1 { font-size: 2.5rem; margin-bottom: 15px; }
      p { font-size: 1.2rem; opacity: 0.9; }
      .btn { display: inline-block; margin-top: 30px; padding: 15px 40px; background: white; color: #128C7E; text-decoration: none; border-radius: 50px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="emoji">✅</div>
      <h1>Bot Connecté !</h1>
      <p>HANI-MD est maintenant connecté à WhatsApp</p>
      <a href="/" class="btn">🏠 Retour à l'accueil</a>
    </div>
  </body>
  </html>
      `);
    } else if (S.currentQR) {
      try {
        const qrImageUrl = await QRCode.toDataURL(S.currentQR, { width: 400, margin: 2 });
        res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <title>HANI-MD - Scanner QR Code</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', sans-serif; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .container { text-align: center; padding: 40px; }
      h1 { font-size: 2rem; margin-bottom: 10px; }
      .subtitle { font-size: 1rem; opacity: 0.9; margin-bottom: 30px; }
      .qr-box { 
        background: white; 
        padding: 20px; 
        border-radius: 20px; 
        display: inline-block;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .qr-box img { display: block; }
      .instructions { 
        margin-top: 30px; 
        background: rgba(255,255,255,0.1); 
        padding: 20px; 
        border-radius: 15px;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }
      .instructions h3 { margin-bottom: 15px; }
      .instructions ol { text-align: left; padding-left: 20px; }
      .instructions li { margin: 8px 0; }
      .refresh { margin-top: 20px; font-size: 0.9rem; opacity: 0.7; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🤖 HANI-MD - Connexion WhatsApp</h1>
      <p class="subtitle">Scanne ce QR code avec ton téléphone</p>
      <div class="qr-box">
        <img src="${qrImageUrl}" alt="QR Code WhatsApp">
      </div>
      <div class="instructions">
        <h3>📱 Comment faire ?</h3>
        <ol>
          <li>Ouvre <strong>WhatsApp</strong> sur ton téléphone</li>
          <li>Va dans <strong>Menu (⋮)</strong> ou <strong>Paramètres</strong></li>
          <li>Clique sur <strong>Appareils connectés</strong></li>
          <li>Appuie sur <strong>Connecter un appareil</strong></li>
          <li>Scanne ce QR code</li>
        </ol>
      </div>
      <p class="refresh">🔄 Page rafraîchie automatiquement toutes les 30 secondes</p>
    </div>
  </body>
  </html>
        `);
      } catch (e) {
        res.send("Erreur génération QR: " + e.message);
      }
    } else {
      res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="5">
    <title>HANI-MD - En attente</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', sans-serif; 
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .container { text-align: center; padding: 40px; }
      .spinner { font-size: 4rem; animation: spin 2s linear infinite; display: inline-block; }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      h1 { font-size: 2rem; margin: 20px 0; }
      p { opacity: 0.9; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="spinner">⏳</div>
      <h1>En attente du QR code...</h1>
      <p>Le bot démarre, patiente quelques secondes</p>
      <p style="margin-top: 20px; font-size: 0.9rem;">🔄 Rafraîchissement automatique...</p>
    </div>
  </body>
  </html>
      `);
    }
  });
  
  // API pour vérifier le statut de connexion
  app.get("/api/connection-status", (req, res) => {
    res.json({ status: S.connectionStatus, hasQR: !!S.currentQR });
  });
  
  // Routes pour les pages HTML
  app.get("/", (req, res) => {
    const indexPath = path.join(ROOT_DIR, 'web', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HANI-MD Premium</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', sans-serif; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .container { text-align: center; padding: 40px; }
      h1 { font-size: 3rem; margin-bottom: 20px; }
      .emoji { font-size: 5rem; margin-bottom: 20px; }
      p { font-size: 1.2rem; margin-bottom: 30px; opacity: 0.9; }
      .btn {
        display: inline-block;
        padding: 15px 40px;
        background: #25D366;
        color: white;
        text-decoration: none;
        border-radius: 50px;
        font-size: 1.2rem;
        font-weight: bold;
        transition: transform 0.3s, box-shadow 0.3s;
      }
      .btn:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      .status { margin-top: 30px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="emoji">🤖</div>
      <h1>HANI-MD Premium</h1>
      <p>Bot WhatsApp le plus puissant de Côte d'Ivoire</p>
      <a href="/subscribe.html" class="btn">💎 S'abonner Premium</a>
      <div class="status">
        <p>✅ Bot en ligne | 🌐 Serveur actif</p>
      </div>
    </div>
  </body>
  </html>
      `);
    }
  });
  
  // Route pour la page d'abonnement
  app.get("/subscribe.html", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'public', 'subscribe.html'));
  });
  
  // Route pour la page de paiements
  app.get("/payments.html", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'public', 'payments.html'));
  });
  
  // Route pour le panel admin (sans .html)
  app.get("/admin", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'public', 'admin.html'));
  });
  
  // Route pour la page d'activation (code premium)
  app.get("/activate", (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'public', 'activate.html'));
  });
  
  // API pour créer un paiement
  app.post("/api/payment/create", async (req, res) => {
    try {
      const PaymentSystem = require('./PaymentSystem');
      const { phone, plan, method } = req.body;
      
      if (!phone || !plan || !method) {
        return res.status(400).json({ success: false, error: 'Paramètres manquants' });
      }
      
      const payment = PaymentSystem.createPaymentRequest(phone, plan, method);
      res.json({ success: true, payment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // API pour obtenir les stats de paiement
  app.get("/api/payment/stats", (req, res) => {
    try {
      const PaymentSystem = require('./PaymentSystem');
      const stats = PaymentSystem.getPaymentStats();
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // API pour obtenir les paiements en attente
  app.get("/api/payment/pending", (req, res) => {
    try {
      const PaymentSystem = require('./PaymentSystem');
      const pending = PaymentSystem.getPendingPayments();
      res.json({ success: true, pending });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // API pour confirmer un paiement
  app.post("/api/payment/confirm", (req, res) => {
    try {
      const PaymentSystem = require('./PaymentSystem');
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'orderId manquant' });
      }
      
      const result = PaymentSystem.confirmPayment(orderId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // API pour rejeter un paiement
  app.post("/api/payment/reject", (req, res) => {
    try {
      const PaymentSystem = require('./PaymentSystem');
      const { orderId, reason } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'orderId manquant' });
      }
      
      const result = PaymentSystem.rejectPayment(orderId, reason || 'Paiement non reçu');
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // API statut du bot
  app.get("/api/status", (req, res) => {
    res.json({
      success: true,
      status: 'online',
      botName: 'HANI-MD Premium',
      version: 'V2.6.0',
      uptime: process.uptime()
    });
  });
  
  // ═══════════════════════════════════════════════════════════
  // 💳 API WAVE PAYMENT - PAIEMENT AUTOMATIQUE
  // ═══════════════════════════════════════════════════════════
  
  let wavePayments;
  try {
    wavePayments = require('../DataBase/wave_payments');
    console.log('[WAVE] ✅ Module Wave Payment chargé');
  } catch (e) {
    console.log('[WAVE] ⚠️ Module Wave non disponible:', e.message);
  }
  
  // Servir la page d'abonnement
  app.use('/subscribe', express.static(path.join(ROOT_DIR, 'web', 'public')));
  app.get('/subscribe', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'public', 'subscribe.html'));
  });
  
  // ═══════════════════════════════════════════════════════════
  // 🔔 NOTIFICATION OWNER EN TEMPS RÉEL (nouvelles demandes/inscriptions)
  // Envoie un message WhatsApp à l'owner dès qu'un client s'inscrit, pour
  // qu'il puisse valider la demande immédiatement dans l'espace admin.
  // Si le bot n'est pas connecté, la notification est mise en file et sera
  // envoyée à la prochaine connexion.
  // ═══════════════════════════════════════════════════════════
  function notifyOwnerNewRequest(data) {
    try {
      const planIcons = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
      const icon = planIcons[(data.plan || '').toUpperCase()] || '💎';
      const siteUrl = (process.env.RENDER_EXTERNAL_URL || process.env.SITE_URL || 'https://hani-tp3e.onrender.com').replace(/\/$/, '');
      const ownerNumber = (process.env.NUMERO_NOTIF || process.env.OWNER_NOTIF_NUMBER || process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
      const ownerJid = ownerNumber + '@s.whatsapp.net';
  
      const notifMessage =
        `🔔 *NOUVELLE DEMANDE D'INSCRIPTION*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *Client:* ${data.name || 'Non renseigné'}\n` +
        `📱 *WhatsApp:* +${data.phone || '?'}\n` +
        `${icon} *Plan:* ${data.plan || '-'}\n` +
        `💵 *Montant:* ${data.amount || '?'} FCFA\n` +
        `🔑 *Référence:* \`${data.reference || '-'}\`\n` +
        `⏰ *Date:* ${new Date(data.createdAt || Date.now()).toLocaleString('fr-FR')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `✅ *Validez la demande* dans l'espace admin :\n${siteUrl}/admin → onglet *Demandes*\n\n` +
        `Une fois validée, le client pourra connecter son bot.`;
  
      // Le bot tourne sur le numéro de l'owner : notifier ce même numéro
      // reviendrait à s'envoyer un message à soi-même (aucune alerte utile).
      // On n'envoie donc sur WhatsApp QUE si un numéro d'alerte distinct est
      // configuré (NUMERO_NOTIF). Dans tous les cas la demande reste visible
      // dans l'espace admin.
      const botNumber = (S.ovl?.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
      if (ownerNumber && ownerNumber === botNumber) {
        console.log(`[NOTIF] ℹ️ Demande "${data.reference}" — pas d'alerte WhatsApp (numéro identique au bot). Visible dans l'espace admin.`);
        return;
      }
  
      if (S.ovl && S.ovl.user) {
        // Bot connecté → envoi immédiat (temps réel)
        S.ovl.sendMessage(ownerJid, { text: notifMessage })
          .then(() => console.log(`[NOTIF] ✅ Demande d'inscription notifiée à ${ownerNumber}`))
          .catch(err => console.error('[NOTIF] Erreur envoi alerte:', err.message));
      } else {
        // Bot non connecté → file d'attente pour envoi ultérieur
        const notifFile = path.join(ROOT_DIR, 'DataBase', 'pending_owner_notifications.json');
        let notifications = [];
        if (fs.existsSync(notifFile)) {
          try { notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8')); } catch (e) { notifications = []; }
        }
        notifications.push({ ...data, message: notifMessage, sent: false });
        fs.writeFileSync(notifFile, JSON.stringify(notifications, null, 2));
        console.log('[NOTIF] ⏳ Bot non connecté — demande mise en file pour l\'owner');
      }
    } catch (e) {
      console.error('[NOTIF] Erreur notifyOwnerNewRequest:', e.message);
    }
  }
  
  // Créer un nouvel abonné (système manuel sans API Wave)
  app.post('/api/wave/subscribe', (req, res) => {
    try {
      const { name, phone, plan, reference } = req.body;
      
      if (!name || name.length < 3) {
        return res.status(400).json({ error: 'Nom requis (min 3 caractères)' });
      }
      if (!phone || phone.length < 8) {
        return res.status(400).json({ error: 'Numéro WhatsApp invalide' });
      }
      if (!plan) {
        return res.status(400).json({ error: 'Plan requis' });
      }
      
      // Générer ou utiliser la référence fournie
      const crypto = require('crypto');
      const paymentRef = reference || 'HANI-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      
      // Sauvegarder la demande
      const requestsFile = path.join(ROOT_DIR, 'DataBase', 'pending_payments.json');
      let requests = [];
      
      if (fs.existsSync(requestsFile)) {
        try { requests = JSON.parse(fs.readFileSync(requestsFile, 'utf8')); } catch(e) { requests = []; }
      }
      
      const request = {
        id: crypto.randomBytes(8).toString('hex'),
        reference: paymentRef,
        name,
        phone: phone.replace(/[^0-9]/g, ''),
        plan: plan.toUpperCase(),
        amount: { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[plan.toUpperCase()] || 2000,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      requests.push(request);
      fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
      
      console.log(`[WAVE] 📝 Nouvelle demande: ${name} - ${plan} - Réf: ${paymentRef}`);
  
      // 🔔 NOTIFIER L'OWNER EN TEMPS RÉEL (nouvelle inscription à valider)
      notifyOwnerNewRequest({
        type: 'subscribe_request',
        reference: paymentRef,
        name: request.name,
        phone: request.phone,
        plan: request.plan,
        amount: request.amount,
        createdAt: request.createdAt
      });
  
      // 🔔 Notification push vers l'admin (même si l'app est fermée)
      sendPushToAdmins({
        title: '🔔 Nouvelle demande',
        body: `${request.name} — ${request.plan} (${request.amount} FCFA)`,
        url: '/admin',
        tag: 'new-request'
      }).catch(() => {});
  
      res.json({
        success: true,
        requestId: request.id,
        reference: paymentRef,
        message: 'Demande enregistrée'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Vérifier le statut d'une demande (polling depuis subscribe.html)
  app.get('/api/subscribe/status/:ref', (req, res) => {
    try {
      const ref = req.params.ref.trim().toUpperCase();
      const requestsFile = path.join(ROOT_DIR, 'DataBase', 'pending_payments.json');
      let requests = [];
      if (fs.existsSync(requestsFile)) {
        try { requests = JSON.parse(fs.readFileSync(requestsFile, 'utf8')); } catch(e) { requests = []; }
      }
      const request = requests.find(r => r.reference === ref || r.id === ref);
      if (!request) {
        return res.json({ found: false, status: 'not_found' });
      }
      res.json({
        found: true,
        status: request.status,
        name: request.name,
        plan: request.plan,
        reference: request.reference
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Confirmation du paiement - SYSTÈME SÉCURISÉ avec validation owner
  app.post('/api/wave/confirm', async (req, res) => {
    try {
      const { transactionId, waveNumber, reference, phone, plan, amount, name } = req.body;
      const crypto = require('crypto');
      
      if (!transactionId || transactionId.length < 4) {
        return res.status(400).json({ error: 'Numéro de transaction invalide' });
      }
      if (!waveNumber || waveNumber.length < 8) {
        return res.status(400).json({ error: 'Numéro Wave invalide' });
      }
      
      const planUpper = (plan || 'OR').toUpperCase();
      const requestId = crypto.randomBytes(6).toString('hex').toUpperCase();
      
      // Sauvegarder la demande EN ATTENTE de validation owner
      const pendingFile = path.join(ROOT_DIR, 'DataBase', 'pending_validations.json');
      let pending = [];
      
      if (fs.existsSync(pendingFile)) {
        try { pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8')); } catch(e) { pending = []; }
      }
      
      const request = {
        id: requestId,
        transactionId,
        waveNumber: waveNumber.replace(/[^0-9]/g, ''),
        reference: reference || 'DIRECT',
        name: name || 'Client',
        phone: (phone || '').replace(/[^0-9]/g, ''),
        plan: planUpper,
        amount: amount || { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[planUpper] || 2000,
        status: 'pending_validation',
        createdAt: new Date().toISOString()
      };
      
      pending.push(request);
      fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
      
      // Logger la demande
      console.log(`\n[WAVE] 🔔 ═══════════════════════════════════════════`);
      console.log(`[WAVE] 📝 NOUVELLE DEMANDE DE PAIEMENT (EN ATTENTE)`);
      console.log(`[WAVE]    🆔 ID: ${requestId}`);
      console.log(`[WAVE]    👤 ${name || 'Client'} (${phone || waveNumber})`);
      console.log(`[WAVE]    💎 Plan: ${planUpper} - ${request.amount} FCFA`);
      console.log(`[WAVE]    📝 Transaction Wave: ${transactionId}`);
      console.log(`[WAVE]    ⚠️ EN ATTENTE DE VALIDATION OWNER`);
      console.log(`[WAVE] ═══════════════════════════════════════════\n`);
      
      // 🔔 ENVOYER NOTIFICATION À L'OWNER
      try {
        const ownerNumber = (process.env.NUMERO_NOTIF || process.env.OWNER_NOTIF_NUMBER || process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
        const ownerJid = ownerNumber + '@s.whatsapp.net';
        
        if (S.ovl && S.ovl.user) {
          const notifMessage = 
            `🔔 *NOUVELLE DEMANDE DE PAIEMENT*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🆔 *ID:* \`${requestId}\`\n` +
            `👤 *Client:* ${name || 'Non renseigné'}\n` +
            `📱 *Téléphone:* ${phone || waveNumber}\n` +
            `💎 *Plan:* ${planUpper}\n` +
            `💵 *Montant:* ${request.amount} FCFA\n` +
            `📝 *N° Transaction Wave:* ${transactionId}\n\n` +
            `⏰ *Date:* ${new Date().toLocaleString('fr-FR')}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `⚠️ *VÉRIFIEZ dans votre historique Wave* si vous avez reçu ce paiement !\n\n` +
            `✅ Si OK: *.validatepay ${requestId}*\n` +
            `❌ Si faux: *.rejectpay ${requestId}*\n\n` +
            `📋 Voir tout: *.pendingpay*`;
          
          await S.ovl.sendMessage(ownerJid, { text: notifMessage });
          console.log(`[WAVE] ✅ Notification envoyée à l'owner: ${ownerNumber}`);
        } else {
          console.log(`[WAVE] ⚠️ Bot non connecté - notification sauvegardée`);
          // Sauvegarder pour envoi ultérieur
          const notifFile = path.join(ROOT_DIR, 'DataBase', 'pending_owner_notifications.json');
          let notifications = [];
          if (fs.existsSync(notifFile)) {
            try { notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8')); } catch(e) { notifications = []; }
          }
          notifications.push({
            type: 'payment_request',
            requestId,
            name: name || 'Client',
            phone: phone || waveNumber,
            plan: planUpper,
            amount: request.amount,
            transactionId: transactionId,
            createdAt: new Date().toISOString(),
            sent: false
          });
          fs.writeFileSync(notifFile, JSON.stringify(notifications, null, 2));
        }
      } catch (notifError) {
        console.error('[WAVE] Erreur notification owner:', notifError.message);
      }
      
      res.json({
        success: true,
        pending: true,
        requestId: requestId,
        message: 'Demande enregistrée ! Votre paiement est en cours de vérification. Vous recevrez votre code par WhatsApp une fois validé.',
        info: 'L\'owner va vérifier votre paiement dans son historique Wave. Si tout est OK, vous recevrez votre code d\'activation par WhatsApp.'
      });
    } catch (e) {
      console.error('[WAVE] Erreur confirmation:', e);
      res.status(500).json({ error: e.message });
    }
  });
  
  // Vérifier statut d'un abonné
  app.get('/api/wave/status/:id', (req, res) => {
    try {
      if (!wavePayments) {
        return res.status(500).json({ error: 'Système Wave non disponible' });
      }
      
      const subscribers = wavePayments.getAllSubscribers();
      const subscriber = subscribers.find(s => 
        s.id === req.params.id || 
        s.phone === req.params.id.replace(/[^0-9]/g, '') ||
        s.paymentRef === req.params.id
      );
      
      if (!subscriber) {
        return res.status(404).json({ error: 'Abonné non trouvé' });
      }
      
      res.json({ success: true, subscriber });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // ═══════════════════════════════════════════════════════════
  // 🎁 ACTIVATION GRATUITE (Offre de lancement)
  // ═══════════════════════════════════════════════════════════
  app.post('/api/free/activate', (req, res) => {
    try {
      const crypto = require('crypto');
      const { name, phone, plan } = req.body;
  
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Nom requis (min 2 caractères)' });
      }
      if (!phone || phone.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ error: 'Numéro WhatsApp invalide' });
      }
  
      const planUpper = (plan || 'OR').toUpperCase();
      const planDays = planUpper === 'LIFETIME' ? 36500 : 30;
      const codeRandom = crypto.randomBytes(4).toString('hex').toUpperCase();
      const activationCode = `HANI-${planUpper}-${codeRandom}`;
      const cleanPhone = phone.replace(/[^0-9]/g, '');
  
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + planDays);
  
      // Sauvegarder le code dans premium_codes.json pour .upgrade
      const premiumCodesFile = path.join(ROOT_DIR, 'DataBase', 'premium_codes.json');
      let premiumCodes = {};
      if (fs.existsSync(premiumCodesFile)) {
        try { premiumCodes = JSON.parse(fs.readFileSync(premiumCodesFile, 'utf8')); } catch(e) { premiumCodes = {}; }
      }
      premiumCodes[activationCode] = {
        plan: planUpper,
        days: planDays,
        createdAt: new Date().toISOString(),
        used: false,
        usedBy: null,
        usedAt: null,
        source: 'free_launch'
      };
      fs.writeFileSync(premiumCodesFile, JSON.stringify(premiumCodes, null, 2));
  
      // Sauvegarder dans activation_codes.json aussi
      const codesFile = path.join(ROOT_DIR, 'DataBase', 'activation_codes.json');
      let codes = {};
      if (fs.existsSync(codesFile)) {
        try { codes = JSON.parse(fs.readFileSync(codesFile, 'utf8')); } catch(e) { codes = {}; }
      }
      codes[activationCode] = {
        plan: planUpper,
        days: planDays,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
        usedBy: null,
        source: 'free_launch'
      };
      fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
  
      // Logger
      console.log(`\n[FREE] 🎁 ═══════════════════════════════════════════`);
      console.log(`[FREE] 🆓 ACTIVATION GRATUITE (Offre de lancement)`);
      console.log(`[FREE]    👤 ${name} (${cleanPhone})`);
      console.log(`[FREE]    💎 Plan: ${planUpper}`);
      console.log(`[FREE]    🔑 Code: ${activationCode}`);
      console.log(`[FREE] ═══════════════════════════════════════════\n`);
  
      res.json({
        success: true,
        code: activationCode,
        plan: planUpper,
        expiresAt: expiresAt.toISOString(),
        message: 'Plan activé gratuitement ! Utilisez .upgrade ' + activationCode + ' sur WhatsApp.'
      });
    } catch (e) {
      console.error('[FREE] Erreur:', e);
      res.status(500).json({ error: e.message });
    }
  });
  
  // Confirmer paiement et générer code AUTOMATIQUEMENT
  app.post('/api/wave/confirm-payment', (req, res) => {
    try {
      if (!wavePayments) {
        return res.status(500).json({ error: 'Système Wave non disponible' });
      }
      
      const { subscriberId, transactionId, waveNumber, paymentRef } = req.body;
      
      if (!subscriberId && !paymentRef) {
        return res.status(400).json({ error: 'ID abonné ou référence requis' });
      }
      if (!transactionId) {
        return res.status(400).json({ error: 'Numéro de transaction Wave requis' });
      }
      if (!waveNumber || waveNumber.length < 8) {
        return res.status(400).json({ error: 'Numéro Wave invalide' });
      }
      
      // Rechercher l'abonné
      const subscribers = wavePayments.getAllSubscribers();
      const subscriber = subscribers.find(s => 
        s.id === subscriberId || 
        s.paymentRef === paymentRef
      );
      
      if (!subscriber) {
        return res.status(404).json({ error: 'Demande d\'abonnement non trouvée' });
      }
      
      if (subscriber.status === 'active' || subscriber.status === 'paid') {
        return res.json({ 
          success: true,
          activationCode: subscriber.activationCode,
          message: 'Votre code a déjà été généré'
        });
      }
      
      // Confirmer le paiement et générer le code automatiquement
      const result = wavePayments.confirmPayment(subscriber.id, `Auto-confirmé via site. TXN: ${transactionId}, Wave: ${waveNumber}`);
      
      if (result.success) {
        // Log la transaction pour l'owner
        console.log(`\n[WAVE] 💰 ═══════════════════════════════════════════`);
        console.log(`[WAVE] 💳 NOUVEAU PAIEMENT AUTO-CONFIRMÉ !`);
        console.log(`[WAVE]    📱 ${subscriber.name} (${subscriber.phone})`);
        console.log(`[WAVE]    💎 Plan: ${subscriber.plan} - ${subscriber.amount} FCFA`);
        console.log(`[WAVE]    🔑 Code: ${result.activationCode}`);
        console.log(`[WAVE]    📝 TXN Wave: ${transactionId} depuis ${waveNumber}`);
        console.log(`[WAVE] ═══════════════════════════════════════════\n`);
        
        res.json({
          success: true,
          activationCode: result.activationCode,
          message: 'Paiement confirmé ! Voici votre code d\'activation.',
          subscriber: {
            name: result.subscriber.name,
            plan: result.subscriber.plan,
            amount: result.subscriber.amount,
            expiresAt: result.subscriber.expiresAt
          }
        });
      } else {
        res.status(400).json({ error: result.error || 'Erreur lors de la confirmation' });
      }
    } catch (e) {
      console.error('[WAVE] Erreur confirmation:', e);
      res.status(500).json({ error: e.message });
    }
  });
  
  // Activer avec un code
  app.post('/api/wave/activate', (req, res) => {
    try {
      if (!wavePayments) {
        return res.status(500).json({ error: 'Système Wave non disponible' });
      }
      
      const { code, whatsappJid } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code d\'activation requis' });
      }
      
      const result = wavePayments.activateWithCode(code, whatsappJid || 'web');
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // ═══════════════════════════════════════════════════════════
  // 💳 API WAVE CHECKOUT - PAIEMENT AUTOMATIQUE
  // ═══════════════════════════════════════════════════════════
  
  // Créer une session de paiement Wave (API officielle)
  app.post('/api/wave/checkout', async (req, res) => {
    try {
      if (!wavePayments) {
        return res.status(500).json({ error: 'Système Wave non disponible' });
      }
      
      const { plan, phone, name } = req.body;
      
      if (!plan) {
        return res.status(400).json({ error: 'Plan requis' });
      }
      
      // Créer d'abord l'abonné
      const subscriber = wavePayments.createSubscriber(name || 'Client', phone || '', plan);
      
      if (!subscriber.success) {
        return res.status(400).json({ error: subscriber.error });
      }
      
      const amount = subscriber.subscriber.amount;
      const reference = subscriber.subscriber.paymentRef;
      
      // Créer la session Wave
      const checkoutResult = await wavePayments.createWaveCheckoutSession(amount, reference, phone);
      
      res.json({
        success: true,
        subscriber: subscriber.subscriber,
        checkout: checkoutResult
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Page de succès après paiement Wave
  app.get('/payment-success', (req, res) => {
    const ref = req.query.ref || '';
    res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paiement Réussi - HANI-MD</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: white; }
      .card { background: rgba(255,255,255,0.05); border-radius: 25px; padding: 50px 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; }
      .icon { font-size: 5rem; margin-bottom: 20px; }
      h1 { color: #25D366; margin-bottom: 15px; }
      p { opacity: 0.8; margin-bottom: 25px; }
      .ref { background: rgba(37,211,102,0.15); padding: 15px; border-radius: 10px; margin-bottom: 25px; font-family: monospace; font-size: 1.1rem; }
      .btn { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #25D366, #128C7E); color: white; text-decoration: none; border-radius: 50px; font-weight: 600; }
      .info { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-top: 25px; text-align: left; }
      .info h3 { margin-bottom: 15px; color: #25D366; }
      .info ol { margin-left: 20px; }
      .info li { margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✅</div>
      <h1>Paiement Réussi !</h1>
      <p>Votre paiement a été reçu avec succès.</p>
      ${ref ? `<div class="ref">Référence: ${ref}</div>` : ''}
      <div class="info">
        <h3>📱 Prochaines étapes</h3>
        <ol>
          <li>Vous allez recevoir un <strong>code d'activation</strong> par WhatsApp</li>
          <li>Sur WhatsApp, tapez: <code style="background:#000;padding:3px 8px;border-radius:5px;">.activer VOTRE-CODE</code></li>
          <li>Profitez de toutes les fonctionnalités premium !</li>
        </ol>
      </div>
      <a href="/" class="btn" style="margin-top: 25px;">Retour à l'accueil</a>
    </div>
  </body>
  </html>
    `);
  });
  
  // Page d'erreur après paiement Wave
  app.get('/payment-error', (req, res) => {
    const ref = req.query.ref || '';
    res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erreur de Paiement - HANI-MD</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: white; }
      .card { background: rgba(255,255,255,0.05); border-radius: 25px; padding: 50px 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; }
      .icon { font-size: 5rem; margin-bottom: 20px; }
      h1 { color: #ef4444; margin-bottom: 15px; }
      p { opacity: 0.8; margin-bottom: 25px; }
      .btn { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #25D366, #128C7E); color: white; text-decoration: none; border-radius: 50px; font-weight: 600; margin: 10px; }
      .btn-secondary { background: rgba(255,255,255,0.1); }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">❌</div>
      <h1>Paiement Échoué</h1>
      <p>Le paiement n'a pas pu être complété. Aucun montant n'a été débité.</p>
      <div>
        <a href="/subscribe.html" class="btn">Réessayer</a>
        <a href="https://wa.me/22550252467" class="btn btn-secondary" target="_blank">Contacter le support</a>
      </div>
    </div>
  </body>
  </html>
    `);
  });
  
  // ═══════════════════════════════════════════════════════════
  // 👤 API CLIENTS — Bot personnel par client (QR/code selon plan)
  // ═══════════════════════════════════════════════════════════
  
  let clientSessions;
  try {
    clientSessions = require('../DataBase/client_sessions');
    console.log('[SESSIONS] ✅ Gestionnaire multi-sessions chargé');
  } catch (e) {
    console.log('[SESSIONS] ⚠️ Gestionnaire sessions non disponible:', e.message);
  }
  
  // Vérifier si un clientId est valide (a payé)
  app.get('/api/clients/verify/:id', (req, res) => {
    if (!clientSessions) return res.status(503).json({ valid: false, error: 'Service indisponible' });
    try {
      const clientId = req.params.id.trim().toUpperCase();
      const info = clientSessions.verifyClient(clientId);
      // Paiement trouvé mais pas encore approuvé par l'owner
      if (!info.valid && info.pending) {
        return res.json({ valid: false, pending: true, name: info.name, plan: info.plan, error: info.error });
      }
      if (!info.valid) return res.json({ valid: false, error: 'ID client non reconnu. Vérifiez votre référence de paiement.' });
  
      const session = clientSessions.getSession(clientId);
      const status = session ? session.status : 'not_connected';
      const phoneNumber = session ? session.phoneNumber : null;
  
      res.json({
        valid: true,
        mode: 'personal_bot',
        plan: info.plan,
        name: info.name,
        status: info.status === 'expired' ? 'expired' : status,
        expiresAt: info.expiresAt,
        phoneNumber
      });
    } catch (e) {
      res.status(500).json({ valid: false, error: 'Erreur serveur: ' + e.message });
    }
  });
  
  // Initier/relancer la connexion WhatsApp pour un client
  app.post('/api/clients/connect/:id', async (req, res) => {
    if (!clientSessions) return res.status(503).json({ error: 'Service indisponible' });
    try {
      const clientId = req.params.id.trim().toUpperCase();
      const info = clientSessions.verifyClient(clientId);
      if (!info.valid) return res.status(403).json({ error: 'ID client invalide' });
      if (info.status === 'expired') return res.status(403).json({ error: 'Abonnement expiré' });
  
      const session = await clientSessions.createSession(clientId, info, true);
  
      res.json({
        status: session.status,
        phoneNumber: session.phoneNumber,
        plan: session.plan
      });
    } catch (e) {
      res.status(500).json({ error: 'Erreur création session: ' + e.message });
    }
  });
  
  // Demander un code d'appairage (alternative au QR code)
  app.post('/api/clients/pair/:id', async (req, res) => {
    if (!clientSessions) return res.status(503).json({ error: 'Service indisponible' });
    try {
      const clientId = req.params.id.trim().toUpperCase();
      const phone = req.body.phone;
  
      if (!phone || phone.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ error: 'Numéro de téléphone invalide' });
      }
  
      const info = clientSessions.verifyClient(clientId);
      if (!info.valid) return res.status(403).json({ error: 'ID client invalide' });
      if (info.status === 'expired') return res.status(403).json({ error: 'Abonnement expiré' });
  
      // Un code d'appairage doit être demandé sur un socket "propre" (non enregistré,
      // WebSocket ouvert). On (re)crée une session dédiée puis on demande le code ; si
      // le socket n'est pas encore prêt, on réessaie une fois avec une session fraîche.
      const isPairable = (s) =>
        s && (s.status === 'initializing' || s.status === 'qr_ready' || s.status === 'pairing_code')
          && (clientSessions.wsIsOpen(s.sock) || s.status === 'qr_ready' || s.status === 'pairing_code');
  
      let session = clientSessions.getSession(clientId);
      if (!isPairable(session)) {
        await clientSessions.createSession(clientId, info, true);
      }
  
      let result;
      try {
        result = await clientSessions.requestPairingCode(clientId, phone);
      } catch (firstErr) {
        // Nouvelle tentative : session fraîche + petit délai pour l'ouverture du WebSocket
        await clientSessions.createSession(clientId, info, true);
        await new Promise(r => setTimeout(r, 1500));
        result = await clientSessions.requestPairingCode(clientId, phone);
      }
  
      if (result.alreadyConnected) {
        return res.json({ status: 'connected', phoneNumber: result.phoneNumber });
      }
  
      res.json({
        success: true,
        code: result.code,
        message: 'Entrez ce code dans WhatsApp → Appareils connectés → Connecter un appareil → Connecter avec un numéro'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Récupérer le QR code et le statut de connexion d'un client
  app.get('/api/clients/qr/:id', (req, res) => {
    if (!clientSessions) return res.status(503).json({ status: 'error' });
    try {
      const clientId = req.params.id.trim().toUpperCase();
      const session = clientSessions.getSession(clientId);
  
      if (!session) return res.json({ status: 'not_connected' });
  
      res.json({
        status: session.status,
        qr: session.qr || null,
        phoneNumber: session.phoneNumber,
        plan: session.plan
      });
    } catch (e) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });
  
  // ═══════════════════════════════════════════════════════════
  // 💳 GESTION DES PAIEMENTS EN ATTENTE (ADMIN)
  // ═══════════════════════════════════════════════════════════
  
  // ═══════════════════════════════════════════════════════════
  // 🔔 WEB PUSH (notifications admin, même app fermée)
  // ═══════════════════════════════════════════════════════════
  let webpush = null;
  try {
    webpush = require('web-push');
    const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@hani-md.app';
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
      console.log('[PUSH] ✅ Web Push configuré');
    } else {
      console.warn('[PUSH] ⚠️ VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes — push désactivé');
    }
  } catch (e) {
    console.warn('[PUSH] web-push non disponible:', e.message);
  }
  
  const PUSH_SUBS_FILE = path.join(ROOT_DIR, 'DataBase', 'push_subscriptions.json');
  function loadPushSubs() {
    try { const a = JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, 'utf8')); return Array.isArray(a) ? a : []; }
    catch { return []; }
  }
  function savePushSubs(arr) {
    try { fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(arr, null, 2)); } catch (e) { console.error('[PUSH] save:', e.message); }
  }
  async function sendPushToAdmins(payload) {
    if (!webpush || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    const subs = loadPushSubs();
    if (!subs.length) return;
    const data = JSON.stringify(payload);
    const kept = [];
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification(s, data); kept.push(s); }
      catch (e) {
        // 404/410 = abonnement expiré → on le retire ; sinon on garde
        if (e.statusCode !== 404 && e.statusCode !== 410) kept.push(s);
      }
    }));
    if (kept.length !== subs.length) savePushSubs(kept);
  }
  
  // Clé publique VAPID (pour que le navigateur puisse s'abonner)
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
  });
  
  // Enregistrer un abonnement push (admin uniquement)
  app.post('/api/push/subscribe', requireAdmin, (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Abonnement invalide' });
    const subs = loadPushSubs();
    if (!subs.find(s => s.endpoint === sub.endpoint)) {
      subs.push(sub);
      savePushSubs(subs);
    }
    res.json({ success: true });
  });
  
  // Supprimer un abonnement push (admin uniquement)
  app.post('/api/push/unsubscribe', requireAdmin, (req, res) => {
    const { endpoint } = req.body || {};
    let subs = loadPushSubs();
    const before = subs.length;
    subs = subs.filter(s => s.endpoint !== endpoint);
    if (subs.length !== before) savePushSubs(subs);
    res.json({ success: true });
  });
  
  // Envoyer une notification de test (admin uniquement)
  app.post('/api/push/test', requireAdmin, async (req, res) => {
    await sendPushToAdmins({ title: 'HANI-MD', body: '🔔 Test de notification reçu !', url: '/admin', tag: 'test' });
    res.json({ success: true });
  });
  
  const PENDING_FILE = path.join(ROOT_DIR, 'DataBase', 'pending_payments.json');
  
  function readPendingPayments() {
    try {
      if (!fs.existsSync(PENDING_FILE)) return [];
      const raw = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  }
  
  function savePendingPayments(arr) {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(arr, null, 2));
  }
  
  // Lister les paiements en attente (admin)
  app.get('/api/admin/payments', requireAdmin, (req, res) => {
    const payments = readPendingPayments();
    res.json({ success: true, payments });
  });
  
  // Approuver un paiement → le client peut maintenant connecter son bot
  app.post('/api/admin/payments/approve/:ref', requireAdmin, async (req, res) => {
    try {
      const ref = req.params.ref.trim().toUpperCase();
      const payments = readPendingPayments();
      const idx = payments.findIndex(p =>
        p.reference === ref || p.id === ref
      );
      if (idx === -1) return res.status(404).json({ error: 'Référence non trouvée: ' + ref });
  
      payments[idx].status = 'approved';
      payments[idx].approvedAt = new Date().toISOString();
      savePendingPayments(payments);
  
      const p = payments[idx];
      console.log(`[ADMIN] ✅ Paiement approuvé: ${p.name} - ${p.plan} - Réf: ${p.reference}`);
  
      try {
        const premiumDB = require('../DataBase/premium');
        const clientJid = p.phone.replace(/\D/g, '') + '@s.whatsapp.net';
        const planDays = p.plan?.toUpperCase() === 'LIFETIME' ? -1 : 30;
        premiumDB.addPremium(clientJid, p.plan || 'OR', planDays);
        console.log(`[PREMIUM] ✅ Client activé sur bot unique: ${clientJid} (${p.plan || 'OR'})`);
      } catch (premiumErr) {
        console.error('[PREMIUM] Erreur activation client:', premiumErr.message);
      }
  
      // Notifier le client par WhatsApp si le bot est connecté
      if (S.ovl && S.connectionStatus === 'connected' && p.phone) {
        try {
          const siteUrl = process.env.RENDER_EXTERNAL_URL
            || process.env.SITE_URL
            || 'https://hani-tp3e.onrender.com';
          const planIcons = { BRONZE: '🥉', ARGENT: '🥈', OR: '🥇', DIAMANT: '💎', LIFETIME: '👑' };
          const icon = planIcons[p.plan?.toUpperCase()] || '💎';
          const clientJid = p.phone.replace(/\D/g, '') + '@s.whatsapp.net';
          await S.ovl.sendMessage(clientJid, {
            text: `✅ *HANI-MD — Abonnement activé !*\n\nBonjour *${p.name}* 👋\n\nVotre paiement a été validé ! 🎉\n${icon} Plan: *${p.plan}*\n🔑 Référence: *${p.reference}*\n\n🤖 *Connectez VOTRE bot personnel :*\n1️⃣ Ouvrez : ${siteUrl}/connect\n2️⃣ Entrez votre référence : *${p.reference}*\n3️⃣ Scannez le QR code (ou utilisez le code d'appairage)\n\n📲 Votre WhatsApp devient alors le bot HANI-MD.\nLe bot répond *uniquement dans votre discussion* — envoyez *.menu* pour voir les commandes.\n\n🌐 Site: ${siteUrl}`
          });
          console.log(`[ADMIN] 📱 Notification envoyée à ${p.phone}`);
        } catch (notifErr) {
          console.error('[ADMIN] Erreur notification WA client:', notifErr.message);
        }
      }
  
      res.json({
        success: true,
        message: `Paiement approuvé pour ${p.name}`,
        client: { name: p.name, phone: p.phone, plan: p.plan, reference: p.reference }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Rejeter/supprimer un paiement
  app.post('/api/admin/payments/reject/:ref', requireAdmin, (req, res) => {
    try {
      const ref = req.params.ref.trim().toUpperCase();
      const payments = readPendingPayments();
      const idx = payments.findIndex(p => p.reference === ref || p.id === ref);
      if (idx === -1) return res.status(404).json({ error: 'Référence non trouvée' });
      payments[idx].status = 'rejected';
      payments[idx].rejectedAt = new Date().toISOString();
      savePendingPayments(payments);
      res.json({ success: true, message: 'Paiement rejeté' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Lister toutes les sessions (admin uniquement)
  app.get('/api/clients/list', requireAdmin, (req, res) => {
    if (!clientSessions) return res.status(503).json({ sessions: [] });
    res.json({ sessions: clientSessions.listSessions() });
  });
  
  // Déconnecter (kick) une session client (admin uniquement)
  app.post('/api/clients/kick/:id', requireAdmin, async (req, res) => {
    if (!clientSessions) return res.status(503).json({ error: 'Service indisponible' });
    try {
      const clientId = req.params.id.trim().toUpperCase();
      const session = clientSessions.getSession(clientId);
      if (session) {
        session._closing = true;
        if (session.sock) {
          try { await session.sock.logout(); } catch { try { session.sock.end(undefined); } catch {} }
        }
        clientSessions.removeSession(clientId);
      }
      res.json({ success: true, message: `Session ${clientId} déconnectée` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Supprimer complètement une session client (fichiers inclus)
  app.post('/api/clients/delete/:id', requireAdmin, async (req, res) => {
    if (!clientSessions) return res.status(503).json({ error: 'Service indisponible' });
    try {
      const clientId = req.params.id.trim().toUpperCase();
      // Déconnecter si active
      const session = clientSessions.getSession(clientId);
      if (session) {
        session._closing = true;
        if (session.sock) {
          try { await session.sock.logout(); } catch { try { session.sock.end(undefined); } catch {} }
        }
        clientSessions.removeSession(clientId);
      }
      // Supprimer les fichiers de session
      const sessionDir = path.join(ROOT_DIR, 'DataBase', 'client_sessions', clientId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      console.log(`[ADMIN] 🗑️ Session ${clientId} supprimée complètement`);
      res.json({ success: true, message: `Session ${clientId} supprimée définitivement` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Route pour la page de connexion client
  app.get('/connect', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'web', 'public', 'connect.html'));
  });
  
  // ═══════════════════════════════════════════════════════════
  // 🔌 MONTER LES ROUTES ADMIN (premium-server.js)
  // Les routes /api/admin/* n'existent QUE dans premium-server
  // ═══════════════════════════════════════════════════════════
  if (premiumApp) {
    app.use(premiumApp);
    console.log('[PREMIUM] ✅ Routes /api/admin/* montées dans le serveur principal');
  }
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Serveur web actif sur le port ${port}`);
    console.log(`📱 Site accessible: http://localhost:${port}`);
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    for (const name in networkInterfaces) {
      for (const iface of networkInterfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`📲 Accès depuis téléphone: http://${iface.address}:${port}`);
        }
      }
    }
  
    // 💓 SELF-PING — Empêche Render de mettre le service en veille
    // Sans cela, Render endort le service après 15 min → WhatsApp se déconnecte
    setTimeout(() => {
      const selfUrl = (
        process.env.RENDER_EXTERNAL_URL ||
        process.env.SITE_URL ||
        `http://localhost:${port}`
      ).replace(/\/$/, '');
      const https = require('https');
      const http = require('http');
      setInterval(() => {
        try {
          const url = selfUrl + '/health';
          const client = url.startsWith('https') ? https : http;
          const req = client.get(url, (res) => {
            if (res.statusCode === 200) {
              console.log('[KEEPALIVE] 💓 Self-ping OK — service actif');
            }
          });
          req.on('error', () => {});
          req.setTimeout(10000, () => req.destroy());
        } catch(e) {}
      }, 4 * 60 * 1000); // Toutes les 4 minutes (Render dort après 15 min)
      console.log(`[KEEPALIVE] 💓 Self-ping activé → ${selfUrl}/health (toutes les 4 min)`);
    }, 30000); // Démarrer 30s après le lancement
  });
}

module.exports = { startWebServer };
