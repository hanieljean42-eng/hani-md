/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║     🔒 HANI-MD ADMIN AUTH - VERSION SÉCURISÉE            ║
 * ║   Utilise lib/security/SecureAuth.js pour l'authentification
 * ╚═══════════════════════════════════════════════════════════╝
 */

const crypto = require('crypto');
const { SecureAuthManager } = require('./security/SecureAuth');

// Instance unique du gestionnaire d'authentification
const authManager = new SecureAuthManager();

// Rate limiting simple
const rateLimiter = {
  attempts: new Map(),
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  
  check(ip) {
    const now = Date.now();
    const record = this.attempts.get(ip);
    
    if (!record || now - record.firstAttempt > this.windowMs) {
      this.attempts.set(ip, { count: 1, firstAttempt: now });
      return true;
    }
    
    if (record.count >= this.maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  },
  
  reset(ip) {
    this.attempts.delete(ip);
  }
};

/**
 * Middleware sécurisé pour protéger l'accès admin
 * Utilise variables d'environnement au lieu de code hardcodé
 */
async function adminAuth(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  // Vérifier le rate limiting
  if (!rateLimiter.check(ip)) {
    console.log(`[SECURITY] ⚠️ Rate limit atteint pour IP: ${ip}`);
    return res.status(429).json({ 
      error: 'Trop de tentatives. Réessayez dans 15 minutes.',
      retryAfter: 900 
    });
  }
  
  // Récupérer les credentials
  const code = req.query.code || req.body?.code;
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  
  // Vérifier si une session valide existe
  if (sessionId) {
    const sessionResult = await authManager.verifySession(sessionId);
    if (sessionResult.valid) {
      rateLimiter.reset(ip);
      return next();
    }
  }
  
  // Vérifier le code d'accès via variable d'environnement
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_CODE;
  
  if (!adminPassword) {
    console.error('[SECURITY] ❌ ADMIN_PASSWORD non défini dans .env');
    return res.status(500).json({ 
      error: 'Configuration serveur incorrecte. Définissez ADMIN_PASSWORD dans .env' 
    });
  }
  
  if (!code) {
    return res.status(401).json({ error: 'Code d\'authentification requis' });
  }
  
  // Comparaison sécurisée (timing-safe)
  const codeBuffer = Buffer.from(String(code));
  const adminBuffer = Buffer.from(String(adminPassword));
  
  if (codeBuffer.length !== adminBuffer.length) {
    console.log(`[SECURITY] ❌ Tentative échouée depuis IP: ${ip}`);
    return res.status(403).json({ error: 'Accès refusé : code incorrect.' });
  }
  
  if (!crypto.timingSafeEqual(codeBuffer, adminBuffer)) {
    console.log(`[SECURITY] ❌ Tentative échouée depuis IP: ${ip}`);
    return res.status(403).json({ error: 'Accès refusé : code incorrect.' });
  }
  
  // Authentification réussie
  rateLimiter.reset(ip);
  console.log(`[SECURITY] ✅ Authentification admin réussie depuis IP: ${ip}`);
  
  // Créer une nouvelle session
  const newSession = await authManager.createSession('admin');
  if (newSession) {
    res.cookie('sessionId', newSession.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 4 * 60 * 60 * 1000 // 4 heures
    });
  }
  
  next();
}

/**
 * Middleware pour vérifier le 2FA (optionnel)
 */
async function require2FA(req, res, next) {
  const totpCode = req.body?.totp || req.query?.totp;
  const username = 'admin';
  
  if (!totpCode) {
    return res.status(401).json({ error: 'Code 2FA requis' });
  }
  
  const result = await authManager.verify2FA(username, totpCode);
  
  if (!result.valid) {
    return res.status(403).json({ error: 'Code 2FA invalide' });
  }
  
  next();
}

/**
 * Initialiser un utilisateur admin
 */
async function initAdminUser(password) {
  return await authManager.createUser('admin', password);
}

/**
 * Obtenir l'URI QR pour configurer 2FA
 */
async function get2FASetupURI() {
  return await authManager.setup2FA('admin');
}

module.exports = adminAuth;
module.exports.require2FA = require2FA;
module.exports.initAdminUser = initAdminUser;
module.exports.get2FASetupURI = get2FASetupURI;
module.exports.authManager = authManager;
