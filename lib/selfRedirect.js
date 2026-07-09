/**
 * ═══════════════════════════════════════════════════════════
 * 🔁 HANI-MD - Redirection des réponses vers "soi-même"
 * ═══════════════════════════════════════════════════════════
 * Toutes les réponses des commandes doivent être envoyées dans
 * la discussion "avec soi-même" (le chat du numéro connecté),
 * jamais dans le chat d'origine où la commande a été tapée.
 *
 * Ce module fournit :
 *  - getSelfJid(sock)          → le JID "message yourself" du bot
 *  - makeSelfSock(sock, from)  → un proxy du socket qui redirige
 *                                automatiquement les envois destinés
 *                                au chat d'origine vers le self-chat
 *  - deleteCommandMessage()    → supprime le message de commande
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Retourne le JID "discussion avec soi-même" du compte connecté.
 * @param {Object} sock - Socket Baileys
 * @returns {string} JID normalisé (ex: 22550252467@s.whatsapp.net)
 */
function getSelfJid(sock) {
  const raw = sock?.user?.id || '';
  const number = raw.split(':')[0].split('@')[0];
  return `${number}@s.whatsapp.net`;
}

/**
 * Crée un proxy du socket qui redirige tout envoi destiné au chat
 * d'origine (`from`) vers la discussion avec soi-même (`selfJid`).
 *
 * Les envois de contrôle (react / delete) et les envois vers d'autres
 * JID (groupes ciblés, notifications owner, etc.) ne sont PAS redirigés.
 *
 * @param {Object} sock - Socket Baileys réel
 * @param {string} from - JID du chat d'origine de la commande
 * @returns {Object} Proxy du socket
 */
function makeSelfSock(sock, from) {
  const selfJid = getSelfJid(sock);

  return new Proxy(sock, {
    get(target, prop, receiver) {
      if (prop === 'sendMessage') {
        return (jid, content, opts) => {
          const isControl = content && (content.delete || content.react);
          // Rediriger uniquement les vraies réponses adressées au chat d'origine
          if (!isControl && jid === from && from !== selfJid) {
            const cleanOpts = { ...(opts || {}) };
            // Le message cité vit dans un autre chat → inutile de le citer
            delete cleanOpts.quoted;
            return target.sendMessage(selfJid, content, cleanOpts);
          }
          return target.sendMessage(jid, content, opts);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

/**
 * Supprime le message de commande dans le chat d'origine.
 * (Fonctionne pour les messages envoyés par le compte connecté ou
 *  lorsque le bot est admin d'un groupe.)
 * @param {Object} sock - Socket Baileys
 * @param {Object} msg  - Message de commande
 */
async function deleteCommandMessage(sock, msg) {
  try {
    const from = msg?.key?.remoteJid;
    if (!from) return;
    const selfJid = getSelfJid(sock);
    // Pas besoin de supprimer dans son propre chat
    if (from === selfJid) return;
    await sock.sendMessage(from, { delete: msg.key });
  } catch (e) {
    // Suppression impossible (droits insuffisants) → on ignore
  }
}

module.exports = { getSelfJid, makeSelfSock, deleteCommandMessage };
