/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💎 HANI-MD PREMIUM WEB SERVER v2.0                ║
 * ║           Dashboard Moderne de Gestion Premium            ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Import du module premium
let premiumDB;
try {
  premiumDB = require('../DataBase/premium');
} catch (e) {
  console.error('[WEB] Erreur chargement premium:', e.message);
}

// Import du module Wave
let wavePayments;
try {
  wavePayments = require('../DataBase/wave_payments');
} catch (e) {
  console.error('[WEB] Erreur chargement wave_payments:', e.message);
}

// Persistance Firebase (survit au disque éphémère de Render)
let jsonStore = null;
try { jsonStore = require('../DataBase/jsonStore'); } catch (e) { jsonStore = null; }

// Écrit le fichier sur disque + write-through Firebase (best-effort).
function persistJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  if (jsonStore) { jsonStore.backupFile(file).catch(() => {}); }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[SECURITY] ⚠️ ADMIN_PASSWORD non défini dans .env ! Ajoutez-le pour sécuriser le panel.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] ⚠️ JWT_SECRET non défini dans .env ! Ajoutez-le pour sécuriser les sessions.');
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(16).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

// Comparaison timing-safe pour éviter les attaques par analyse temporelle
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Sessions admin simples
const adminSessions = new Map();

// Middleware d'authentification admin
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  const session = adminSessions.get(token);
  if (Date.now() > session.expires) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Session expirée' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════
// 📄 ROUTES PAGES
// ═══════════════════════════════════════════════════════════

// Page d'accueil - Landing page publique
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Page de paiement client
app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

// Page d'activation de code
app.get('/activate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'activate.html'));
});

// ═══════════════════════════════════════════════════════════
// 🔐 API AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password && safeEqual(password, ADMIN_PASSWORD)) {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, {
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24h
    });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  adminSessions.delete(token);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// 📊 API STATISTIQUES (ADMIN)
// ═══════════════════════════════════════════════════════════

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = premiumDB.getStats();
    const users = premiumDB.getAllPremiumUsers();
    const codes = premiumDB.getUnusedCodes();
    
    // Calcul revenus
    const prices = { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 };
    let revenue = 0;
    for (const [plan, count] of Object.entries(stats.byPlan || {})) {
      revenue += (count || 0) * (prices[plan] || 0);
    }
    
    res.json({
      success: true,
      stats: {
        ...stats,
        revenue,
        activeUsers: users.length,
        availableCodes: codes.length
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 👥 API UTILISATEURS PREMIUM (ADMIN)
// ═══════════════════════════════════════════════════════════

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = premiumDB.getAllPremiumUsers();
    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const { phone, plan, days } = req.body;
    
    if (!phone || !plan) {
      return res.status(400).json({ error: 'Numéro et plan requis' });
    }
    
    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const result = premiumDB.addPremium(jid, plan.toUpperCase(), days || 30);
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/users/:phone', requireAdmin, (req, res) => {
  try {
    const jid = req.params.phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const result = premiumDB.removePremium(jid);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 🔑 API CODES (ADMIN)
// ═══════════════════════════════════════════════════════════

app.get('/api/admin/codes', requireAdmin, (req, res) => {
  try {
    const codes = premiumDB.getUnusedCodes();
    res.json({ success: true, codes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/codes/generate', requireAdmin, (req, res) => {
  try {
    const { plan, count } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: 'Plan requis' });
    }
    
    const codes = [];
    const num = Math.min(count || 1, 50);
    
    for (let i = 0; i < num; i++) {
      const result = premiumDB.generateCode(plan.toUpperCase());
      if (result.success) {
        codes.push(result.code);
      }
    }
    
    res.json({ success: true, codes, count: codes.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/codes/:code', requireAdmin, (req, res) => {
  try {
    const result = premiumDB.deleteCode(req.params.code);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 🌐 API PUBLIQUE (CLIENTS)
// ═══════════════════════════════════════════════════════════

// Récupérer les plans disponibles
app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      { id: 'BRONZE', name: 'Bronze', price: 500, currency: 'FCFA', duration: 30, commands: 100, icon: '🥉' },
      { id: 'ARGENT', name: 'Argent', price: 1000, currency: 'FCFA', duration: 30, commands: 300, icon: '🥈' },
      { id: 'OR', name: 'Or', price: 2000, currency: 'FCFA', duration: 30, commands: 'Illimité', icon: '🥇' },
      { id: 'DIAMANT', name: 'Diamant', price: 5000, currency: 'FCFA', duration: 30, commands: 'Illimité', features: ['VIP Support', 'Exclusif'], icon: '💎' },
      { id: 'LIFETIME', name: 'Lifetime', price: 15000, currency: 'FCFA', duration: 'À vie', commands: 'Illimité', features: ['Tout inclus', 'À vie'], icon: '👑' }
    ],
    paymentMethods: [
      { id: 'wave', name: 'Wave', number: 'Via bouton Wave', icon: '📱' },
      { id: 'orange', name: 'Orange Money', number: 'Contactez le support', icon: '🟠' },
      { id: 'mtn', name: 'MTN Money', number: 'Contactez le support', icon: '🟡' }
    ]
  });
});

// Vérifier le statut premium d'un numéro
app.get('/api/status/:phone', (req, res) => {
  try {
    const jid = req.params.phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const info = premiumDB.getPremiumInfo(jid);
    
    res.json({
      success: true,
      phone: req.params.phone,
      plan: info.plan,
      isPremium: info.isPremium,
      expiresAt: info.expiresAt,
      dailyLimit: info.dailyLimit
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Activer un code (API publique)
app.post('/api/activate', (req, res) => {
  try {
    const { code, phone } = req.body;
    
    if (!code || !phone) {
      return res.status(400).json({ error: 'Code et numéro requis' });
    }
    
    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const result = premiumDB.redeemCode(code.toUpperCase(), jid);
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Créer une demande d'abonnement
app.post('/api/subscribe', (req, res) => {
  try {
    const { phone, plan, paymentMethod } = req.body;
    
    if (!phone || !plan) {
      return res.status(400).json({ error: 'Numéro et plan requis' });
    }
    
    // Sauvegarder la demande
    const requestsFile = path.join(__dirname, '..', 'DataBase', 'premium_requests.json');
    let requests = [];
    
    if (fs.existsSync(requestsFile)) {
      requests = JSON.parse(fs.readFileSync(requestsFile, 'utf8'));
    }
    
    const request = {
      id: crypto.randomBytes(8).toString('hex'),
      phone: phone.replace(/[^0-9]/g, ''),
      plan: plan.toUpperCase(),
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    requests.push(request);
    persistJSON(requestsFile, requests);
    
    // Générer le lien Wave pour compatibilité frontend
    const paymentNumber = process.env.WAVE_NUMBER || '';
    const cleanNumber = paymentNumber.replace(/[^0-9]/g, '');
    const paymentAmount = { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[plan.toUpperCase()];
    res.json({
      success: true,
      message: 'Demande enregistrée ! Effectuez le paiement puis envoyez la capture.',
      requestId: request.id,
      paymentInfo: {
        number: paymentNumber,
        amount: paymentAmount
      },
      paymentLink: {
        web: `https://pay.wave.com/m/${cleanNumber}`
      },
      paymentNumber: cleanNumber,
      amount: paymentAmount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Récupérer les demandes en attente (admin)
app.get('/api/admin/requests', requireAdmin, (req, res) => {
  try {
    const requestsFile = path.join(__dirname, '..', 'DataBase', 'premium_requests.json');
    let requests = [];
    
    if (fs.existsSync(requestsFile)) {
      requests = JSON.parse(fs.readFileSync(requestsFile, 'utf8'));
    }
    
    res.json({ success: true, requests });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approuver une demande (admin)
app.post('/api/admin/requests/:id/approve', requireAdmin, (req, res) => {
  try {
    const requestsFile = path.join(__dirname, '..', 'DataBase', 'premium_requests.json');
    let requests = [];
    
    if (fs.existsSync(requestsFile)) {
      requests = JSON.parse(fs.readFileSync(requestsFile, 'utf8'));
    }
    
    const request = requests.find(r => r.id === req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Générer un code et l'activer
    const codeResult = premiumDB.generateCode(request.plan);
    if (!codeResult.success) {
      return res.status(500).json({ error: 'Erreur génération code' });
    }
    
    const jid = request.phone + '@s.whatsapp.net';
    const activateResult = premiumDB.redeemCode(codeResult.code, jid);
    
    // Marquer comme approuvé
    request.status = 'approved';
    request.approvedAt = new Date().toISOString();
    request.code = codeResult.code;
    
    persistJSON(requestsFile, requests);
    
    res.json({
      success: true,
      message: 'Demande approuvée',
      code: codeResult.code,
      phone: request.phone
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 💳 API WAVE PAYMENTS (SYSTÈME MANUEL)
// ═══════════════════════════════════════════════════════════

// Inscription + enregistrement de la demande
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
    const paymentRef = reference || 'HANI-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Sauvegarder la demande
    const requestsFile = path.join(__dirname, '..', 'DataBase', 'pending_payments.json');
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
    persistJSON(requestsFile, requests);
    
    console.log(`[WAVE] 📝 Nouvelle demande: ${name} - ${plan} - Réf: ${paymentRef}`);
    
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

// Confirmation du paiement manuel avec génération de code
app.post('/api/wave/confirm', (req, res) => {
  try {
    const { transactionId, waveNumber, reference, phone, plan, amount, name } = req.body;
    
    if (!transactionId || transactionId.length < 4) {
      return res.status(400).json({ error: 'Numéro de transaction invalide' });
    }
    if (!waveNumber || waveNumber.length < 8) {
      return res.status(400).json({ error: 'Numéro Wave invalide' });
    }
    
    // Générer un code d'activation unique
    const planUpper = (plan || 'OR').toUpperCase();
    const codeRandom = crypto.randomBytes(4).toString('hex').toUpperCase();
    const activationCode = `HANI-${planUpper}-${codeRandom}`;
    
    // Calculer la date d'expiration
    const planDays = planUpper === 'LIFETIME' ? 36500 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);
    
    // Sauvegarder la transaction confirmée
    const transactionsFile = path.join(__dirname, '..', 'DataBase', 'confirmed_payments.json');
    let transactions = [];
    
    if (fs.existsSync(transactionsFile)) {
      try { transactions = JSON.parse(fs.readFileSync(transactionsFile, 'utf8')); } catch(e) { transactions = []; }
    }
    
    const transaction = {
      id: crypto.randomBytes(8).toString('hex'),
      activationCode,
      transactionId,
      waveNumber: waveNumber.replace(/[^0-9]/g, ''),
      reference: reference || 'DIRECT',
      name: name || 'Client',
      phone: (phone || '').replace(/[^0-9]/g, ''),
      plan: planUpper,
      amount: amount || { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[planUpper] || 2000,
      status: 'confirmed',
      expiresAt: expiresAt.toISOString(),
      confirmedAt: new Date().toISOString()
    };
    
    transactions.push(transaction);
    persistJSON(transactionsFile, transactions);
    
    // Sauvegarder le code d'activation
    const codesFile = path.join(__dirname, '..', 'DataBase', 'activation_codes.json');
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
      transactionId: transaction.id
    };
    
    persistJSON(codesFile, codes);
    
    // Aussi enregistrer dans premium_codes.json pour compatibilité avec .upgrade
    const premiumCodesFile = path.join(__dirname, '..', 'DataBase', 'premium_codes.json');
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
      usedAt: null
    };
    persistJSON(premiumCodesFile, premiumCodes);
    
    // Logger le paiement
    console.log(`[WAVE] 💰 PAIEMENT CONFIRMÉ:`);
    console.log(`   👤 ${name || 'Client'} (${phone || waveNumber})`);
    console.log(`   💳 Plan: ${planUpper} - ${transaction.amount} FCFA`);
    console.log(`   📝 Transaction Wave: ${transactionId}`);
    console.log(`   🔑 Code généré: ${activationCode}`);
    
    // 🔔 Sauvegarder notification pour l'owner (sera lue par le bot)
    try {
      const notifFile = path.join(__dirname, '..', 'DataBase', 'pending_owner_notifications.json');
      let notifications = [];
      if (fs.existsSync(notifFile)) {
        try { notifications = JSON.parse(fs.readFileSync(notifFile, 'utf8')); } catch(e) { notifications = []; }
      }
      notifications.push({
        type: 'payment',
        name: name || 'Client',
        phone: phone || waveNumber,
        plan: planUpper,
        amount: transaction.amount,
        transactionId: transactionId,
        activationCode: activationCode,
        createdAt: new Date().toISOString(),
        sent: false
      });
      persistJSON(notifFile, notifications);
    } catch (e) {
      console.error('[NOTIF] Erreur sauvegarde notification:', e.message);
    }
    
    res.json({
      success: true,
      code: activationCode,
      message: 'Paiement confirmé ! Voici votre code.',
      expiresAt: expiresAt.toISOString()
    });
  } catch (e) {
    console.error('[WAVE] Erreur confirmation:', e);
    res.status(500).json({ error: e.message });
  }
});

// Vérifier statut d'un abonné
app.get('/api/wave/status/:id', (req, res) => {
  try {
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

// Activer avec un code (public)
app.post('/api/wave/activate', (req, res) => {
  try {
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
// 💳 CONFIRMATION AUTOMATIQUE DU PAIEMENT
// ═══════════════════════════════════════════════════════════

// Confirmer paiement et générer code automatiquement
app.post('/api/wave/confirm-payment', (req, res) => {
  try {
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
      return res.status(400).json({ 
        error: 'Cet abonnement a déjà été confirmé',
        activationCode: subscriber.activationCode 
      });
    }
    
    // Confirmer le paiement et générer le code automatiquement
    const result = wavePayments.confirmPayment(subscriber.id, `Auto-confirmé. TXN: ${transactionId}, Wave: ${waveNumber}`);
    
    if (result.success) {
      // Aussi activer dans le système premium existant
      try {
        const jid = result.subscriber.phone + '@s.whatsapp.net';
        const planDays = result.subscriber.planDetails?.duration || 30;
        if (premiumDB && premiumDB.addPremium) {
          premiumDB.addPremium(jid, result.subscriber.plan, planDays);
        }
      } catch (e) {
        console.error('[WAVE] Erreur sync premium:', e.message);
      }
      
      // Log la transaction pour l'owner
      console.log(`[WAVE] 💰 NOUVEAU PAIEMENT AUTO-CONFIRMÉ:`);
      console.log(`   📱 ${subscriber.name} (${subscriber.phone})`);
      console.log(`   💳 Plan: ${subscriber.plan} - ${subscriber.amount} FCFA`);
      console.log(`   🔑 Code: ${result.activationCode}`);
      console.log(`   📝 TXN Wave: ${transactionId} depuis ${waveNumber}`);
      
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

// ═══════════════════════════════════════════════════════════
// 👑 API WAVE ADMIN (OWNER)
// ═══════════════════════════════════════════════════════════

// Liste tous les abonnés Wave
app.get('/api/admin/wave/subscribers', requireAdmin, (req, res) => {
  try {
    const status = req.query.status || null;
    const subscribers = wavePayments.getAllSubscribers(status);
    res.json({ success: true, subscribers, count: subscribers.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stats Wave
app.get('/api/admin/wave/stats', requireAdmin, (req, res) => {
  try {
    const stats = wavePayments.getStats();
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirmer paiement (génère le code)
app.post('/api/admin/wave/confirm/:id', requireAdmin, (req, res) => {
  try {
    const { adminNote } = req.body;
    const result = wavePayments.confirmPayment(req.params.id, adminNote);
    
    if (result.success) {
      // Aussi activer dans le système premium existant
      try {
        const jid = result.subscriber.phone + '@s.whatsapp.net';
        const planDays = result.subscriber.planDetails?.duration || 30;
        premiumDB.addPremium(jid, result.subscriber.plan, planDays);
      } catch (e) {
        console.error('[WAVE] Erreur sync premium:', e.message);
      }
    }
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rechercher un abonné
app.get('/api/admin/wave/search', requireAdmin, (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Paramètre de recherche requis' });
    }
    const results = wavePayments.findSubscriber(q);
    res.json({ success: true, results, count: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Vérifier abonnement actif par téléphone
app.get('/api/admin/wave/check/:phone', requireAdmin, (req, res) => {
  try {
    const result = wavePayments.checkActiveSubscription(req.params.phone);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// �️ API SUPPRESSION PAIEMENTS & DEMANDES (ADMIN)
// ═══════════════════════════════════════════════════════════

// Supprimer un paiement Wave individuel
app.delete('/api/admin/payments/:id', requireAdmin, (req, res) => {
  try {
    const f = path.join(__dirname, '..', 'DataBase', 'pending_payments.json');
    let items = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
    const before = items.length;
    items = items.filter(r => r.id !== req.params.id);
    persistJSON(f, items);
    res.json({ success: true, deleted: before - items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vider tous les paiements traités (approuvés / rejetés)
app.post('/api/admin/payments/clear', requireAdmin, (req, res) => {
  try {
    const f = path.join(__dirname, '..', 'DataBase', 'pending_payments.json');
    let items = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
    const before = items.length;
    items = items.filter(r => r.status === 'pending');
    persistJSON(f, items);
    res.json({ success: true, deleted: before - items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Supprimer une demande premium individuelle
app.delete('/api/admin/requests/:id', requireAdmin, (req, res) => {
  try {
    const f = path.join(__dirname, '..', 'DataBase', 'premium_requests.json');
    let items = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
    const before = items.length;
    items = items.filter(r => r.id !== req.params.id);
    persistJSON(f, items);
    res.json({ success: true, deleted: before - items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vider toutes les demandes traitées (approuvées)
app.post('/api/admin/requests/clear', requireAdmin, (req, res) => {
  try {
    const f = path.join(__dirname, '..', 'DataBase', 'premium_requests.json');
    let items = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
    const before = items.length;
    items = items.filter(r => r.status === 'pending');
    persistJSON(f, items);
    res.json({ success: true, deleted: before - items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
// �🚀 EXPORT
// ═══════════════════════════════════════════════════════════

function startPremiumServer(port = 3001) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`[PREMIUM-WEB] 🌐 Dashboard Premium: http://localhost:${port}`);
      console.log(`[PREMIUM-WEB] 👑 Admin Panel: http://localhost:${port}/admin`);
      console.log(`[PREMIUM-WEB] 💳 Page Abonnement Wave: http://localhost:${port}/subscribe`);
      resolve(server);
    }).on('error', reject);
  });
}

module.exports = { app, startPremiumServer, requireAdmin, adminSessions };
