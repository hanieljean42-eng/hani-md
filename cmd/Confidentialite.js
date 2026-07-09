/**
 * ═══════════════════════════════════════════════════════════
 * 🔒 HANI-MD - Confidentialité et Sécurité
 * ═══════════════════════════════════════════════════════════
 * Paramètres de confidentialité, blocage, vie privée
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");

// ═══════════════════════════════════════════════════════════
// 🚫 BLOQUER UN UTILISATEUR
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "block",
    classe: "Confidentialité",
    react: "🚫",
    desc: "Bloquer un utilisateur",
    alias: ["bloquer", "blockuser"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un utilisateur");
      }

      await ovl.updateBlockStatus(targetJid, "block");
      repondre(`🚫 @${targetJid.split("@")[0]} a été bloqué`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[BLOCK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✅ DÉBLOQUER UN UTILISATEUR
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "unblock",
    classe: "Confidentialité",
    react: "✅",
    desc: "Débloquer un utilisateur",
    alias: ["debloquer", "unblockuser"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let targetJid;
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
      
      if (quotedMessage?.participant) {
        targetJid = quotedMessage.participant;
      } else if (arg[0]) {
        const number = arg[0].replace(/[^0-9]/g, "");
        targetJid = number + "@s.whatsapp.net";
      } else {
        return repondre("❌ Mentionnez ou répondez à un utilisateur");
      }

      await ovl.updateBlockStatus(targetJid, "unblock");
      repondre(`✅ @${targetJid.split("@")[0]} a été débloqué`, { mentions: [targetJid] });

    } catch (error) {
      console.error("[UNBLOCK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📋 LISTE DES BLOQUÉS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "blocklist",
    classe: "Confidentialité",
    react: "📋",
    desc: "Liste des utilisateurs bloqués",
    alias: ["blocked", "listebloques"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const blockedUsers = await ovl.fetchBlocklist();

      if (!blockedUsers || blockedUsers.length === 0) {
        return repondre("📋 *Liste des bloqués*\n\nAucun utilisateur bloqué.");
      }

      let list = `📋 *Utilisateurs bloqués* (${blockedUsers.length})\n\n`;
      
      blockedUsers.forEach((user, i) => {
        list += `${i + 1}. @${user.split("@")[0]}\n`;
      });

      repondre(list, { mentions: blockedUsers });

    } catch (error) {
      console.error("[BLOCKLIST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👁️ PARAMÈTRES VU EN LIGNE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "lastseen",
    classe: "Confidentialité",
    react: "👁️",
    desc: "Info sur 'vu récemment' (non modifiable via bot)",
    alias: ["vurecemment", "online"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      repondre(`👁️ *Paramètre "Vu récemment"*\n\n⚠️ Ce paramètre ne peut être modifié que dans:\n📱 WhatsApp > Paramètres > Confidentialité > Vu à\n\n💡 Le bot ne peut pas changer ce réglage WhatsApp.`);

    } catch (error) {
      console.error("[LASTSEEN]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📝 PARAMÈTRES "EN TRAIN D'ÉCRIRE"
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "typing",
    classe: "Confidentialité",
    react: "📝",
    desc: "Activer/désactiver 'en train d'écrire'",
    alias: ["ecriture", "composing"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const action = arg[0]?.toLowerCase();
      
      if (action === "on" || action === "1") {
        process.env.SHOW_TYPING = "true";
        repondre("📝 *Indicateur d'écriture activé!*\n\nLes utilisateurs verront quand le bot écrit.");
      } else if (action === "off" || action === "0") {
        process.env.SHOW_TYPING = "false";
        repondre("📝 *Indicateur d'écriture désactivé!*");
      } else {
        repondre("❌ Utilisation: .typing on/off");
      }

    } catch (error) {
      console.error("[TYPING]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ✅ PARAMÈTRES ACCUSÉS DE LECTURE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "readreceipts",
    classe: "Confidentialité",
    react: "✅",
    desc: "Activer/désactiver les accusés de lecture",
    alias: ["bleutick", "lu"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const action = arg[0]?.toLowerCase();
      
      if (action === "on" || action === "1") {
        process.env.READ_RECEIPTS = "true";
        repondre("✅ *Accusés de lecture activés!*\n\nLes messages seront marqués comme lus.");
      } else if (action === "off" || action === "0") {
        process.env.READ_RECEIPTS = "false";
        repondre("✅ *Accusés de lecture désactivés!*");
      } else {
        repondre("❌ Utilisation: .readreceipts on/off");
      }

    } catch (error) {
      console.error("[READRECEIPTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📊 ÉTAT DE CONFIDENTIALITÉ
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "privacy",
    classe: "Confidentialité",
    react: "🔒",
    desc: "Afficher les paramètres de confidentialité",
    alias: ["confidentialite", "privacysettings"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const typing = process.env.SHOW_TYPING === "true" ? "✅ Activé" : "❌ Désactivé";
      const readReceipts = process.env.READ_RECEIPTS === "true" ? "✅ Activé" : "❌ Désactivé";
      const autoView = process.env.AUTO_VIEW_STATUS === "true" ? "✅ Activé" : "❌ Désactivé";
      const autoReact = process.env.AUTO_REACT_STATUS === "true" ? "✅ Activé" : "❌ Désactivé";

      let status = `🔒 *PARAMÈTRES DE CONFIDENTIALITÉ*\n\n`;
      status += `📝 Indicateur d'écriture: ${typing}\n`;
      status += `✅ Accusés de lecture: ${readReceipts}\n`;
      status += `👁️ Auto-vue statuts: ${autoView}\n`;
      status += `❤️ Auto-réaction statuts: ${autoReact}\n\n`;
      status += `💡 *Commandes:*\n`;
      status += `• .typing on/off\n`;
      status += `• .readreceipts on/off\n`;
      status += `• .autoview on/off\n`;
      status += `• .autoreact on/off\n`;
      status += `• .block / .unblock\n`;

      repondre(status);

    } catch (error) {
      console.error("[PRIVACY]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🛡️ ANTI-APPEL
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "anticall",
    classe: "Confidentialité",
    react: "📞",
    desc: "Activer/désactiver l'anti-appel",
    alias: ["noapel", "blockappel"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const action = arg[0]?.toLowerCase();
      
      if (action === "on" || action === "1") {
        process.env.ANTI_CALL = "true";
        repondre("📞 *Anti-appel activé!*\n\nLes appels seront automatiquement rejetés.");
      } else if (action === "off" || action === "0") {
        process.env.ANTI_CALL = "false";
        repondre("📞 *Anti-appel désactivé!*");
      } else {
        repondre("❌ Utilisation: .anticall on/off");
      }

    } catch (error) {
      console.error("[ANTICALL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👻 MODE FANTÔME (INVISIBLE)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "ghost",
    classe: "Confidentialité",
    react: "👻",
    desc: "Activer/désactiver le mode invisible (apparaître hors ligne)",
    alias: ["invisible", "ghostmode", "fantome", "offline"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const action = arg[0]?.toLowerCase();

      if (action === "on" || action === "1") {
        process.env.GHOST_MODE = "true";
        // Apparaître hors ligne immédiatement
        try {
          await ovl.sendPresenceUpdate("unavailable");
          if (typeof ovl.updateLastSeenPrivacy === 'function') {
            await ovl.updateLastSeenPrivacy("none");
          }
          if (typeof ovl.updateOnlinePrivacy === 'function') {
            await ovl.updateOnlinePrivacy("match_last_seen");
          }
        } catch(e) {}
        repondre(
          `👻 *Mode Fantôme ACTIVÉ*\n\n` +
          `✅ Le bot apparaît maintenant *hors ligne*\n` +
          `✅ "Vu récemment" masqué pour tout le monde\n` +
          `✅ Statut "en ligne" masqué\n\n` +
          `💡 Les gens ne sauront plus que le bot tourne 24h/24\n` +
          `🔄 Actif aussi pour tous les bots clients\n\n` +
          `Pour désactiver: *.ghost off*`
        );

      } else if (action === "off" || action === "0") {
        process.env.GHOST_MODE = "false";
        // Restaurer une présence WhatsApp naturelle :
        // en ligne quand actif, "vu à" (dernière connexion) quand hors ligne.
        try {
          await ovl.sendPresenceUpdate("available");
          if (typeof ovl.updateLastSeenPrivacy === 'function') {
            await ovl.updateLastSeenPrivacy("all");
          }
          // IMPORTANT : réactiver aussi la visibilité "en ligne", sinon elle
          // reste sur "match_last_seen" et personne ne voit la présence.
          if (typeof ovl.updateOnlinePrivacy === 'function') {
            await ovl.updateOnlinePrivacy("all");
          }
        } catch(e) {}
        repondre(
          `👁️ *Mode Fantôme DÉSACTIVÉ*\n\n` +
          `✅ Présence WhatsApp *naturelle* rétablie\n` +
          `🟢 En ligne quand tu es actif\n` +
          `🕐 "Vu à" (dernière connexion) quand tu te déconnectes\n\n` +
          `Pour réactiver l'invisibilité: *.ghost on*`
        );

      } else {
        const etat = process.env.GHOST_MODE !== "false" ? "✅ ACTIVÉ" : "❌ DÉSACTIVÉ";
        repondre(
          `👻 *Mode Fantôme*\n\n` +
          `État actuel: ${etat}\n\n` +
          `📖 *Ce que fait ce mode:*\n` +
          `• Cache le statut "en ligne" du bot\n` +
          `• Cache "vu récemment" de tout le monde\n` +
          `• Après chaque message traité, le bot revient "hors ligne"\n` +
          `• Personne ne sait que le bot tourne en permanence\n\n` +
          `📌 *Commandes:*\n` +
          `• *.ghost on* — activer l'invisibilité\n` +
          `• *.ghost off* — désactiver\n` +
          `• *.invisible on/off* — même chose`
        );
      }

    } catch (error) {
      console.error("[GHOST]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 👁️ SURVEILLANCE PRÉSENCE — voir même les contacts bloqués
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "viewblocked",
    classe: "Confidentialité",
    react: "🔍",
    desc: "Surveiller la présence/statuts d'un contact (même bloqué)",
    alias: ["spybloque", "voirbloque", "presencespy", "tracksomeone"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Cette commande est réservée au propriétaire.");

    // Récupérer la cible
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let target;
    if (mentioned && mentioned.length > 0) {
      target = mentioned[0];
    } else if (arg[0]) {
      const num = arg[0].replace(/[^0-9]/g, '');
      if (!num) return repondre("❌ Numéro invalide. Ex: .viewblocked 22612345678");
      target = num + '@s.whatsapp.net';
    } else {
      return repondre(
        `👁️ *Surveillance Présence*\n\n` +
        `📌 *Usage:*\n` +
        `• *.viewblocked 22612345678* — surveiller un numéro\n` +
        `• *.viewblocked @mention* — mentionner quelqu'un\n` +
        `• *.unviewblocked numéro* — arrêter la surveillance\n` +
        `• *.presencelist* — voir toutes les cibles actives\n\n` +
        `📡 *Ce que tu recevras:*\n` +
        `🟢 Quand il se connecte\n` +
        `🔴 Quand il se déconnecte\n` +
        `✅ Quand il lit un de tes messages\n` +
        `📊 Quand il regarde ton statut`
      );
    }

    const num = target.split('@')[0];

    try {
      // Souscrire à la présence (fonctionne même si bloqué dans certains cas)
      await ovl.presenceSubscribe(target);

      // Récupérer le statut "À propos" actuel
      let statusText = "Non disponible";
      try {
        const s = await ovl.fetchStatus(target);
        if (s?.status) statusText = s.status;
      } catch (_) {}

      // Récupérer la dernière connexion connue
      let lastSeenStr = "Masqué";
      try {
        const pres = await ovl.fetchPresenceUpdates(target);
        if (pres?.lastSeen) {
          lastSeenStr = new Date(pres.lastSeen * 1000).toLocaleString('fr-FR');
        }
      } catch (_) {}

      // Ajouter au Map global
      global.presenceSpyList.set(target, {
        addedAt: Date.now(),
        isOnline: false,
        lastSeen: null,
        lastReceipt: null
      });

      await repondre(
        `👁️ *SURVEILLANCE ACTIVÉE*\n\n` +
        `👤 Cible: *+${num}*\n` +
        `📝 Bio/Statut: _${statusText}_\n` +
        `🕐 Dernière vue connue: ${lastSeenStr}\n\n` +
        `📡 *Tu seras notifié quand il/elle:*\n` +
        `🟢 Se connecte sur WhatsApp\n` +
        `🔴 Se déconnecte\n` +
        `✅ Lit un de tes messages\n` +
        `📊 Regarde ton statut\n\n` +
        `⚠️ _Fonctionne même si ce contact t'a bloqué_\n\n` +
        `🛑 Pour arrêter: *.unviewblocked ${num}*`,
        { mentions: [target] }
      );

    } catch (e) {
      repondre(`❌ Erreur: ${e.message}`);
    }
  }
);

// ─── Arrêter la surveillance d'un contact ───────────────────

ovlcmd(
  {
    nom_cmd: "unviewblocked",
    classe: "Confidentialité",
    react: "🛑",
    desc: "Arrêter la surveillance d'un contact",
    alias: ["stopviewblocked", "unspybloque", "stoptrack"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Cette commande est réservée au propriétaire.");

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let target;
    if (mentioned && mentioned.length > 0) {
      target = mentioned[0];
    } else if (arg[0]) {
      target = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
      return repondre("❌ Usage: .unviewblocked numéro");
    }

    if (global.presenceSpyList.has(target)) {
      global.presenceSpyList.delete(target);
      repondre(`✅ Surveillance arrêtée pour *+${target.split('@')[0]}*`, { mentions: [target] });
    } else {
      repondre(`⚠️ *+${target.split('@')[0]}* n'est pas sous surveillance.`);
    }
  }
);

// ─── Liste de toutes les cibles actives ────────────────────

ovlcmd(
  {
    nom_cmd: "presencelist",
    classe: "Confidentialité",
    react: "📋",
    desc: "Voir la liste de tous les contacts sous surveillance",
    alias: ["viewblockedlist", "spylist2", "tracklist"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    if (!superUser) return repondre("❌ Cette commande est réservée au propriétaire.");

    if (global.presenceSpyList.size === 0) {
      return repondre(
        `📋 *Aucun contact sous surveillance*\n\n` +
        `💡 Utilise *.viewblocked numéro* pour commencer.`
      );
    }

    let txt = `👁️ *CONTACTS SOUS SURVEILLANCE* (${global.presenceSpyList.size})\n\n`;
    const mentions = [];

    for (const [jid, info] of global.presenceSpyList) {
      const num = jid.split('@')[0];
      const depuis = new Date(info.addedAt || Date.now()).toLocaleString('fr-FR');
      const etat = info.isOnline ? '🟢 En ligne' : '🔴 Hors ligne';
      const lu = info.lastReceipt
        ? new Date(info.lastReceipt * 1000).toLocaleString('fr-FR')
        : 'Jamais';

      txt += `👤 *+${num}*\n`;
      txt += `   └ État: ${etat}\n`;
      txt += `   └ Dernier lu: ${lu}\n`;
      txt += `   └ Surveillé depuis: ${depuis}\n\n`;
      mentions.push(jid);
    }

    txt += `🛑 Pour arrêter: *.unviewblocked numéro*`;
    repondre(txt, { mentions });
  }
);

// ═══════════════════════════════════════════════════════════
// 🕵️ AUTO-SURVEILLANCE — traquer ceux qui t'espionnent en cachette
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "autospy",
    classe: "Confidentialité",
    react: "🕵️",
    desc: "Surveiller automatiquement ceux qui regardent ton statut en cachette",
    alias: ["autosurveillance", "spymode", "traqueur", "detectespion"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    if (!superUser) return repondre("❌ Cette commande est réservée au propriétaire.");

    const action = arg[0]?.toLowerCase();

    if (action === "on" || action === "1") {
      global.autoSpyEnabled = true;
      await repondre(
        `🕵️ *MODE AUTO-SURVEILLANCE ACTIVÉ*\n\n` +
        `✅ Désormais, *toute personne* qui regarde ton statut sera:\n\n` +
        `📍 *Détectée automatiquement*\n` +
        `📡 *Ajoutée à la surveillance*\n` +
        `🔔 *Notifiée à toi en temps réel*\n\n` +
        `📋 *Ce que tu recevras sur chaque espion:*\n` +
        `• 🕵️ Son numéro + sa bio\n` +
        `• 🟢 Quand il se connecte/déconnecte\n` +
        `• ✏️ Quand il écrit un message\n` +
        `• ✅ Quand il lit tes messages\n` +
        `• 📊 Chaque fois qu'il voit ton statut\n` +
        `• 🖼️ Quand il change sa photo\n\n` +
        `_Ils t'espionnent en cachette — maintenant c'est toi qui les surveilles_\n\n` +
        `🛑 Pour désactiver: *.autospy off*\n` +
        `📋 Voir les cibles: *.presencelist*`
      );

    } else if (action === "off" || action === "0") {
      global.autoSpyEnabled = false;
      await repondre(
        `🛑 *MODE AUTO-SURVEILLANCE DÉSACTIVÉ*\n\n` +
        `❌ Les nouveaux viewers de statut ne seront plus ajoutés automatiquement.\n\n` +
        `📋 Cibles déjà en surveillance: ${global.presenceSpyList.size}\n` +
        `💡 Utilise *.autospy on* pour réactiver.`
      );

    } else if (action === "clear" || action === "reset") {
      const nb = global.presenceSpyList.size;
      global.presenceSpyList.clear();
      await repondre(
        `🗑️ *LISTE VIDÉE*\n\n` +
        `✅ ${nb} contact(s) supprimé(s) de la surveillance.\n` +
        `Mode auto-spy: ${global.autoSpyEnabled ? '✅ Actif' : '❌ Inactif'}`
      );

    } else {
      const etat = global.autoSpyEnabled ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ';
      const cibles = global.presenceSpyList.size;
      let listeTxt = '';
      if (cibles > 0) {
        let i = 1;
        for (const [jid, info] of global.presenceSpyList) {
          const num = jid.split('@')[0];
          const auto = info.autoAdded ? ' _(auto)_' : '';
          const etatContact = info.isOnline ? '🟢' : '🔴';
          listeTxt += `${i}. ${etatContact} *+${num}*${auto}\n`;
          i++;
          if (i > 10) { listeTxt += `_...et ${cibles - 10} autres_`; break; }
        }
      }

      await repondre(
        `🕵️ *MODE AUTO-SURVEILLANCE*\n\n` +
        `État: *${etat}*\n` +
        `Cibles actives: *${cibles}*\n\n` +
        (listeTxt ? `👁️ *Sous surveillance:*\n${listeTxt}\n` : '') +
        `📌 *Commandes:*\n` +
        `• *.autospy on* — activer (traquer les viewers de statut)\n` +
        `• *.autospy off* — désactiver\n` +
        `• *.autospy clear* — vider la liste\n` +
        `• *.presencelist* — liste complète\n` +
        `• *.viewblocked numéro* — ajouter manuellement\n\n` +
        `💡 _Dès que quelqu'un regarde ton statut, il devient automatiquement une cible_`
      );
    }
  }
);

console.log("[CMD] ✅ Confidentialite.js chargé - Commandes: block, unblock, blocklist, lastseen, typing, readreceipts, privacy, anticall, ghost, viewblocked, unviewblocked, presencelist, autospy");
