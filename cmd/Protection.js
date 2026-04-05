/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ HANI-MD - Protections du Bot
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require('../lib/ovlcmd');

const PROTECTION_INFO = {
  antilink:   { emoji: '🔗', desc: 'Supprimer automatiquement les liens dans les groupes' },
  antispam:   { emoji: '📵', desc: 'Bloquer les messages en spam' },
  antibot:    { emoji: '🤖', desc: 'Bloquer les messages des autres bots' },
  anticall:   { emoji: '📵', desc: 'Rejeter automatiquement les appels entrants' },
  antitag:    { emoji: '🏷️', desc: 'Bloquer le tag en masse (@everyone)' },
  antidelete: { emoji: '🗑️', desc: 'Intercepter et sauvegarder les messages supprimés' },
};

for (const [prot, info] of Object.entries(PROTECTION_INFO)) {
  ovlcmd(
    {
      nom_cmd: prot,
      classe: 'Owner',
      react: info.emoji,
      desc: info.desc,
      alias: [],
      superUser: true
    },
    async (ovl, msg, { repondre, arg }) => {
      const ps = global._botProtectionState;
      if (!ps) return repondre('❌ Système de protection non initialisé.');

      const param = (arg[0] || '').toLowerCase();
      if (param === 'on') ps[prot] = true;
      else if (param === 'off') ps[prot] = false;
      else ps[prot] = !ps[prot];

      repondre(`🛡️ *${prot}* ${ps[prot] ? '✅ activé' : '❌ désactivé'}.`);
    }
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 PROTECTIONS — Voir l'état de toutes les protections
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: 'protections',
    classe: 'Owner',
    react: '🛡️',
    desc: 'Voir l\'état de toutes les protections',
    alias: ['protection', 'shields'],
    superUser: true
  },
  async (ovl, msg, { repondre }) => {
    const ps = global._botProtectionState;
    if (!ps) return repondre('❌ Système de protection non initialisé.');

    let text = '🛡️ *ÉTAT DES PROTECTIONS*\n\n';
    for (const [prot, info] of Object.entries(PROTECTION_INFO)) {
      const state = ps[prot];
      text += `${info.emoji} *${prot}*: ${state ? '✅ Activé' : '❌ Désactivé'}\n`;
      text += `   _${info.desc}_\n\n`;
    }
    text += `\n💡 Utilise \`.antilink on/off\`, \`.antispam on/off\`, etc. pour modifier.`;
    repondre(text);
  }
);
