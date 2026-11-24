/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║   🎛️ HANI-MD - PANNEAU DE CONTRÔLE + BIENVENUE V1.0      ║
 * ║   .panel  → centre de contrôle owner (état + actions)     ║
 * ║   .start  → accueil guidé pour tout le monde              ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
const { getSelfJid } = require('../lib/selfRedirect');
const config = require('../set');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function ownerOnly(ovl, msg, repondre, superUser) {
  const ownerNum = (config.NUMERO_OWNER || config.OWNER_NUMBER || '').replace(/\D/g, '');
  const sender = (msg.key.participant || msg.key.remoteJid || '').replace(/\D/g, '').split('@')[0];
  const isOwner = msg.key.fromMe === true || superUser === true || (ownerNum && sender.endsWith(ownerNum));
  if (!isOwner) {
    repondre(`🔒 Commande réservée au propriétaire.`);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════
// 🎛️ .panel — CENTRE DE CONTRÔLE OWNER
// ═══════════════════════════════════════════════════════════
ovlcmd({
  nom_cmd: "panel",
  classe: "Système",
  react: "🎛️",
  desc: "Panneau de contrôle owner: état, protections, actions rapides",
  alias: ["control", "adminpanel", "tableau"],
  onlyOwner: true,
}, async (ovl, msg, { repondre, superUser, arg }) => {
  try {
    if (!ownerOnly(ovl, msg, repondre, superUser)) return;
    const prefix = config.PREFIXE || '.';

    const sessionBackup = require('../lib/sessionBackup');
    const { S, protectionState, deletedMessages, viewOnceMessages } = require('../lib/state');
    const vault = require('../lib/vault');
    const { getCommands } = require('../lib/ovlcmd');

    const up = Math.floor(process.uptime());
    const h = Math.floor(up / 3600), mn = Math.floor((up % 3600) / 60);
    const mem = Math.round(process.memoryUsage().rss / 1048576);
    const totalCmds = getCommands().length;

    const prot = (k, name) => `${protectionState[k] ? '🟢' : '🔴'} ${name}`;
    const protections = [
      prot('antilink', 'antilink'), prot('antispam', 'antispam'),
      prot('antibot', 'antibot'), prot('anticall', 'anticall'),
      prot('antitag', 'antitag'), prot('antidelete', 'anti-delete'),
      prot('ghostMode', 'fantôme'),
    ].join('  ');

    // ── Sous-commandes du panneau ──
    const sub = (arg && arg[0] || '').toLowerCase();

    if (sub === 'restart') {
      await repondre(`🔄 Redémarrage du bot dans 3s...`);
      setTimeout(() => process.exit(0), 3000);
      return;
    }
    if (sub === 'backup') {
      const ok = await sessionBackup.pushBundle(require('../DataBase/firebase_db'), require('../lib/state').SESSION_FOLDER);
      return repondre(ok ? '☁️ Session sauvegardée sur Firebase.' : '⚠️ Backup impossible (Firebase hors-ligne).');
    }
    if (sub === 'vault') {
      const items = vault.list();
      const bytes = items.reduce((a, i) => a + (i.size || 0), 0);
      return repondre(`🗄️ *Coffre vues uniques*\n📦 ${items.length} média(s) · ${(bytes / 1048576).toFixed(1)} Mo\n🔗 https://hani-tp3e.onrender.com/vault`);
    }

    // ── Panneau principal ──
    const panel =
`╭──「 🎛️ *PANEL OWNER* 」──╮
│
│ 📊 *ÉTAT*
│ 🟢 ${S.connectionStatus || 'connecté'} · ⏱️ ${h}h${mn}m · 💾 ${mem}Mo
│ ☁️ Backup: ${sessionBackup.getLastBackupAt() ? 'OK' : 'en attente'}
│ 📱 ${getSelfJid(ovl)}
│
│ 🛡️ *PROTECTIONS*
│ ${protections}
│
│ 📦 *COFFRE*
│ 👁️ ${viewOnceMessages.size} vues uniques · 🗑️ ${deletedMessages.length} supprimés
│
│ ⚡ *ACTIONS*
│ ${prefix}panel restart — redémarrer
│ ${prefix}panel backup — forcer backup Firebase
│ ${prefix}panel vault — état du coffre
│ ${prefix}protections — gérer les protections
│ ${prefix}broadcast <msg> — diffusion
│ ${prefix}restart — redémarrage direct
│ ${prefix}stats — statistiques
│ 🔗 Coffre web: /vault (mdp admin)
│
╰──────────────────────╯`;

    await repondre(panel);
  } catch (e) {
    console.error('[PANEL]', e);
    repondre(`❌ Erreur panel: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 👋 .start — BIENVENUE GUIDÉE (tous les utilisateurs)
// ═══════════════════════════════════════════════════════════
ovlcmd({
  nom_cmd: "start",
  classe: "Système",
  react: "👋",
  desc: "Accueil guidé: les commandes essentielles pour bien démarrer",
  alias: ["commencer", "bonjour", "bienvenue", "debuter"],
}, async (ovl, msg, { repondre }) => {
  try {
    const prefix = config.PREFIXE || '.';
    await repondre(
`╭──「 👋 *BIENVENUE SUR HANI-MD* 」──╮
│
│ 🤖 Bot WhatsApp le plus complet
│    de Côte d'Ivoire — ${getCommands().length} commandes
│
│ 📖 *POUR COMMENCER:*
│ ${prefix}menu → toutes les fonctionnalités
│ ${prefix}menu <groupe> → cmds d'une catégorie
│ ${prefix}aide <commande> → aide détaillée
│ ${prefix}ping → vérifier que tout marche
│
│ 👁️ *VUES UNIQUES:*
│ Le bot t'alerte quand tu en reçois une.
│ Réponds-y avec un vocal/sticker → récupération auto.
│
│ 💎 *PREMIUM:*
│ ${prefix}tarifs → débloquer plus de commandes
│
│ 🛟 Support: wa.me/22550252467
│
╰───────────────────────────────╯`);
  } catch (e) {
    console.error('[START]', e);
  }
});

console.log('[CMD] ✅ Panel owner + welcome chargés');
