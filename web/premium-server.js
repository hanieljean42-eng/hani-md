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

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hani2025';
const JWT_SECRET = process.env.JWT_SECRET || 'hani-premium-secret-2025';

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
  
  if (password === ADMIN_PASSWORD) {
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
      { id: 'wave', name: 'Wave', number: '+2250150252467', icon: '📱' },
      { id: 'orange', name: 'Orange Money', number: '+2250150252467', icon: '🟠' },
      { id: 'mtn', name: 'MTN Money', number: '+2250150252467', icon: '🟡' }
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
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
    
    res.json({
      success: true,
      message: 'Demande enregistrée ! Effectuez le paiement puis envoyez la capture.',
      requestId: request.id,
      paymentInfo: {
        number: '+2250150252467',
        amount: { BRONZE: 500, ARGENT: 1000, OR: 2000, DIAMANT: 5000, LIFETIME: 15000 }[plan.toUpperCase()]
      }
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
    
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
    
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
// 🚀 EXPORT
// ═══════════════════════════════════════════════════════════

function startPremiumServer(port = 3001) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`[PREMIUM-WEB] 🌐 Dashboard Premium: http://localhost:${port}`);
      console.log(`[PREMIUM-WEB] 👑 Admin Panel: http://localhost:${port}/admin`);
      console.log(`[PREMIUM-WEB] 💳 Page Abonnement: http://localhost:${port}/subscribe`);
      resolve(server);
    }).on('error', reject);
  });
}

module.exports = { app, startPremiumServer };
