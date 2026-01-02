/**
 * ═══════════════════════════════════════════════════════════
 * 👥 HANI-MD - Gestionnaire Participants Groupe
 * ═══════════════════════════════════════════════════════════
 * Gère les événements de participants (join, leave, promote, demote)
 * Version désobfusquée et optimisée
 */

const config = require("../set");

// Configuration
let welcomeEnabled = true;
let goodbyeEnabled = true;

// Messages par défaut
const defaultMessages = {
  welcome: "👋 *Bienvenue* @{user} dans le groupe *{group}*!\n\n📋 Lis les règles du groupe.",
  goodbye: "👋 *Au revoir* @{user}!\n\nTu nous manqueras dans *{group}*.",
  promote: "👑 @{user} est maintenant *admin* du groupe!",
  demote: "📉 @{user} n'est plus admin du groupe."
};

// Messages personnalisés par groupe
const customMessages = new Map();

/**
 * Gestionnaire des mises à jour de participants
 * @param {Object} update - Mise à jour des participants
 * @param {Object} ovl - Instance du bot
 */
async function handleGroupParticipantsUpdate(update, ovl) {
  try {
    const { id: groupJid, participants, action, author } = update;
    
    if (!groupJid || !participants || !action) return;
    
    // Récupérer les infos du groupe
    let groupMetadata;
    try {
      groupMetadata = await ovl.groupMetadata(groupJid);
    } catch (e) {
      console.log(`[GROUP] Impossible de récupérer les métadonnées: ${e.message}`);
      return;
    }
    
    const groupName = groupMetadata?.subject || "Groupe";
    const groupDesc = groupMetadata?.desc || "";
    
    // Traiter chaque participant
    for (const participant of participants) {
      const participantNumber = participant.split("@")[0];
      const mentions = [participant];
      
      console.log(`[GROUP] ${action.toUpperCase()}: ${participantNumber} dans ${groupName}`);
      
      switch (action) {
        case "add":
          // Nouveau membre
          if (welcomeEnabled) {
            const welcomeMsg = getCustomMessage(groupJid, "welcome") || defaultMessages.welcome;
            const formattedMsg = formatMessage(welcomeMsg, participantNumber, groupName);
            
            try {
              await ovl.sendMessage(groupJid, {
                text: formattedMsg,
                mentions: mentions
              });
            } catch (e) {
              console.log(`[WELCOME] Erreur envoi: ${e.message}`);
            }
          }
          break;
          
        case "remove":
          // Membre parti/exclu
          if (goodbyeEnabled) {
            const goodbyeMsg = getCustomMessage(groupJid, "goodbye") || defaultMessages.goodbye;
            const formattedMsg = formatMessage(goodbyeMsg, participantNumber, groupName);
            
            try {
              await ovl.sendMessage(groupJid, {
                text: formattedMsg,
                mentions: mentions
              });
            } catch (e) {
              console.log(`[GOODBYE] Erreur envoi: ${e.message}`);
            }
          }
          break;
          
        case "promote":
          // Promu admin
          const promoteMsg = getCustomMessage(groupJid, "promote") || defaultMessages.promote;
          const promotedMsg = formatMessage(promoteMsg, participantNumber, groupName);
          
          try {
            await ovl.sendMessage(groupJid, {
              text: promotedMsg,
              mentions: mentions
            });
          } catch (e) {
            console.log(`[PROMOTE] Erreur envoi: ${e.message}`);
          }
          break;
          
        case "demote":
          // Rétrogradé
          const demoteMsg = getCustomMessage(groupJid, "demote") || defaultMessages.demote;
          const demotedMsg = formatMessage(demoteMsg, participantNumber, groupName);
          
          try {
            await ovl.sendMessage(groupJid, {
              text: demotedMsg,
              mentions: mentions
            });
          } catch (e) {
            console.log(`[DEMOTE] Erreur envoi: ${e.message}`);
          }
          break;
      }
    }
    
  } catch (error) {
    console.error("[GROUP-UPDATE] Erreur:", error.message);
  }
}

/**
 * Formate un message avec les variables
 * @param {string} template - Template du message
 * @param {string} user - Numéro de l'utilisateur
 * @param {string} group - Nom du groupe
 * @returns {string} Message formaté
 */
function formatMessage(template, user, group) {
  return template
    .replace(/{user}/g, user)
    .replace(/@{user}/g, `@${user}`)
    .replace(/{group}/g, group)
    .replace(/{time}/g, new Date().toLocaleTimeString("fr-FR"))
    .replace(/{date}/g, new Date().toLocaleDateString("fr-FR"));
}

/**
 * Récupère un message personnalisé pour un groupe
 * @param {string} groupJid - JID du groupe
 * @param {string} type - Type de message (welcome, goodbye, etc.)
 * @returns {string|null} Message personnalisé ou null
 */
function getCustomMessage(groupJid, type) {
  const groupMessages = customMessages.get(groupJid);
  return groupMessages?.[type] || null;
}

/**
 * Définit un message personnalisé pour un groupe
 * @param {string} groupJid - JID du groupe
 * @param {string} type - Type de message
 * @param {string} message - Message personnalisé
 */
function setCustomMessage(groupJid, type, message) {
  if (!customMessages.has(groupJid)) {
    customMessages.set(groupJid, {});
  }
  customMessages.get(groupJid)[type] = message;
}

/**
 * Active/désactive le message de bienvenue
 * @param {boolean} enabled - État souhaité
 */
function setWelcomeEnabled(enabled) {
  welcomeEnabled = enabled;
}

/**
 * Active/désactive le message d'au revoir
 * @param {boolean} enabled - État souhaité
 */
function setGoodbyeEnabled(enabled) {
  goodbyeEnabled = enabled;
}

/**
 * Récupère l'état des messages
 * @returns {Object} État actuel
 */
function getMessageStatus() {
  return {
    welcome: welcomeEnabled,
    goodbye: goodbyeEnabled
  };
}

module.exports = handleGroupParticipantsUpdate;
module.exports.setCustomMessage = setCustomMessage;
module.exports.setWelcomeEnabled = setWelcomeEnabled;
module.exports.setGoodbyeEnabled = setGoodbyeEnabled;
module.exports.getMessageStatus = getMessageStatus;
