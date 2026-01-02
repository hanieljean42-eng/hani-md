/**
 * ═══════════════════════════════════════════════════════════
 * 🔌 HANI-MD - Gestionnaire de Connexion
 * ═══════════════════════════════════════════════════════════
 * Gère les événements de connexion/déconnexion
 * Version désobfusquée et optimisée
 */

const { DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const config = require("../set");

// Compteur de tentatives de reconnexion
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000; // 3 secondes

/**
 * Gestionnaire des mises à jour de connexion
 * @param {Object} update - Mise à jour de connexion
 * @param {Object} ovl - Instance du bot
 * @param {Function} startBot - Fonction pour redémarrer le bot
 * @param {Function} onConnected - Callback après connexion réussie
 */
async function handleConnectionUpdate(update, ovl, startBot, onConnected = null) {
  const { connection, lastDisconnect, qr } = update;
  
  try {
    // Affichage du QR Code
    if (qr) {
      console.log("[QR] Nouveau QR code généré, scannez-le avec WhatsApp");
      reconnectAttempts = 0; // Reset sur nouveau QR
    }
    
    // Connexion établie
    if (connection === "open") {
      console.log("[OK] Connexion établie avec succès!");
      reconnectAttempts = 0;
      
      const botNumber = ovl.user?.id?.split(":")[0];
      const botName = ovl.user?.name || "HANI-MD";
      
      console.log(`[BOT] Connecté en tant que: ${botName} (+${botNumber})`);
      
      // Exécuter le callback si fourni
      if (onConnected && typeof onConnected === "function") {
        try {
          await onConnected();
        } catch (e) {
          console.error("[CALLBACK] Erreur:", e.message);
        }
      }
      
      // Envoyer notification de connexion
      try {
        const selfJid = botNumber + "@s.whatsapp.net";
        await ovl.sendMessage(selfJid, {
          text: `✅ *HANI-MD CONNECTÉ*\n\n🤖 Bot: ${botName}\n📱 Numéro: +${botNumber}\n🕐 ${new Date().toLocaleString("fr-FR")}\n\n📝 Tape *.menu* pour les commandes`
        });
      } catch (e) {
        // Ignorer les erreurs de notification
      }
    }
    
    // Connexion en cours
    if (connection === "connecting") {
      console.log("[...] Connexion en cours...");
    }
    
    // Déconnexion
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.message || "Raison inconnue";
      
      console.log(`[!] Déconnecté: ${reason} (code: ${statusCode})`);
      
      // Déterminer si on doit reconnecter
      const shouldReconnect = determineReconnection(statusCode);
      
      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.min(reconnectAttempts, 5);
        
        console.log(`[RECONNECT] Tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${delay/1000}s...`);
        
        setTimeout(() => {
          if (startBot && typeof startBot === "function") {
            startBot();
          }
        }, delay);
      } else if (!shouldReconnect) {
        console.log("[!] Session expirée ou déconnexion permanente");
        console.log("[!] Supprimez le dossier session et relancez le bot");
        
        // Si logged out, nettoyer la session
        if (statusCode === DisconnectReason.loggedOut) {
          const fs = require("fs");
          const sessionPath = "./session_principale";
          if (fs.existsSync(sessionPath)) {
            console.log("[CLEAN] Nettoyage de la session...");
            // Ne pas supprimer automatiquement, laisser l'utilisateur décider
          }
        }
      } else {
        console.log(`[!] Nombre max de tentatives atteint (${MAX_RECONNECT_ATTEMPTS})`);
        console.log("[!] Redémarrez le bot manuellement");
      }
    }
    
  } catch (error) {
    console.error("[CONNECTION] Erreur:", error.message);
  }
}

/**
 * Détermine si on doit tenter une reconnexion
 * @param {number} statusCode - Code de statut de déconnexion
 * @returns {boolean} True si reconnexion conseillée
 */
function determineReconnection(statusCode) {
  // Cas où on ne doit PAS reconnecter
  const noReconnectCodes = [
    DisconnectReason.loggedOut,        // Déconnecté manuellement
    DisconnectReason.badSession,       // Session corrompue
    DisconnectReason.multideviceMismatch // Problème multi-device
  ];
  
  if (noReconnectCodes.includes(statusCode)) {
    return false;
  }
  
  // Cas où on DOIT reconnecter
  const reconnectCodes = [
    DisconnectReason.connectionClosed,  // Connexion fermée
    DisconnectReason.connectionLost,    // Connexion perdue
    DisconnectReason.connectionReplaced, // Connexion remplacée
    DisconnectReason.timedOut,          // Timeout
    DisconnectReason.restartRequired    // Redémarrage requis
  ];
  
  if (reconnectCodes.includes(statusCode)) {
    return true;
  }
  
  // Par défaut, essayer de reconnecter
  return true;
}

/**
 * Réinitialise le compteur de tentatives
 */
function resetReconnectAttempts() {
  reconnectAttempts = 0;
}

/**
 * Récupère le nombre de tentatives actuelles
 * @returns {number} Nombre de tentatives
 */
function getReconnectAttempts() {
  return reconnectAttempts;
}

module.exports = handleConnectionUpdate;
module.exports.resetReconnectAttempts = resetReconnectAttempts;
module.exports.getReconnectAttempts = getReconnectAttempts;
