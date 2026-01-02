/**
 * ═══════════════════════════════════════════════════════════
 * 📞 HANI-MD - Gestionnaire d'Appels
 * ═══════════════════════════════════════════════════════════
 * Gère les appels entrants (rejet automatique, etc.)
 * Version désobfusquée et optimisée
 */

const config = require("../set");

// Configuration anti-appel
let antiCallEnabled = false;
let callHistory = [];
const MAX_CALL_HISTORY = 50;

/**
 * Gestionnaire des appels entrants
 * @param {Object} ovl - Instance du bot
 * @param {Array} calls - Liste des appels
 */
async function handleCall(ovl, calls) {
  try {
    if (!calls || !Array.isArray(calls) || calls.length === 0) return;
    
    for (const call of calls) {
      const { from, id, status, isVideo, isGroup } = call;
      
      // Ignorer si pas un appel entrant actif
      if (status !== "offer") continue;
      
      const callerNumber = from?.split("@")[0] || "Inconnu";
      const callType = isVideo ? "📹 Vidéo" : "📞 Audio";
      const callTime = new Date().toLocaleString("fr-FR");
      
      console.log(`[APPEL] ${callType} de ${callerNumber} à ${callTime}`);
      
      // Stocker dans l'historique
      callHistory.unshift({
        from: callerNumber,
        jid: from,
        type: isVideo ? "video" : "audio",
        timestamp: Date.now(),
        timeStr: callTime,
        status: antiCallEnabled ? "rejected" : "received"
      });
      
      // Limiter l'historique
      if (callHistory.length > MAX_CALL_HISTORY) {
        callHistory = callHistory.slice(0, MAX_CALL_HISTORY);
      }
      
      // Rejeter l'appel si anti-call activé
      if (antiCallEnabled) {
        try {
          await ovl.rejectCall(id, from);
          console.log(`[ANTI-CALL] Appel rejeté de ${callerNumber}`);
          
          // Envoyer une notification à l'owner
          const botNumber = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
          const notification = `📵 *APPEL REJETÉ*\n\n📱 De: +${callerNumber}\n${callType}\n🕐 ${callTime}\n\n_Anti-appel activé_`;
          
          try {
            await ovl.sendMessage(botNumber, { text: notification });
          } catch (e) {
            // Ignorer les erreurs de notification
          }
          
          // Optionnel: Envoyer un message au caller
          try {
            await ovl.sendMessage(from, {
              text: `❌ *Appels non acceptés*\n\nMerci de m'envoyer un message texte à la place.`
            });
          } catch (e) {
            // Ignorer
          }
          
        } catch (e) {
          console.error(`[ANTI-CALL] Erreur rejet: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error("[CALL] Erreur:", error.message);
  }
}

/**
 * Active/désactive l'anti-appel
 * @param {boolean} enabled - État souhaité
 */
function setAntiCall(enabled) {
  antiCallEnabled = enabled;
  console.log(`[ANTI-CALL] ${enabled ? "Activé" : "Désactivé"}`);
}

/**
 * Récupère l'état de l'anti-appel
 * @returns {boolean} État actuel
 */
function getAntiCallStatus() {
  return antiCallEnabled;
}

/**
 * Récupère l'historique des appels
 * @returns {Array} Historique des appels
 */
function getCallHistory() {
  return callHistory;
}

/**
 * Efface l'historique des appels
 */
function clearCallHistory() {
  callHistory = [];
}

module.exports = handleCall;
module.exports.setAntiCall = setAntiCall;
module.exports.getAntiCallStatus = getAntiCallStatus;
module.exports.getCallHistory = getCallHistory;
module.exports.clearCallHistory = clearCallHistory;
