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
        try {
          await ovl.sendPresenceUpdate("available");
          if (typeof ovl.updateLastSeenPrivacy === 'function') {
            await ovl.updateLastSeenPrivacy("all");
          }
        } catch(e) {}
        repondre(
          `👁️ *Mode Fantôme DÉSACTIVÉ*\n\n` +
          `❌ Le bot apparaît maintenant *en ligne*\n` +
          `❌ "Vu récemment" visible\n\n` +
          `Pour réactiver: *.ghost on*`
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

console.log("[CMD] ✅ Confidentialite.js chargé - Commandes: block, unblock, blocklist, lastseen, typing, readreceipts, privacy, anticall, ghost");
