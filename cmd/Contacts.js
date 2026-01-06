/**
 * ═══════════════════════════════════════════════════════════
 * 📱 HANI-MD - Gestion des Contacts & Partage
 * ═══════════════════════════════════════════════════════════
 * Outils pour gérer vos contacts, générer des liens de partage
 * QR codes, vCards, et statistiques de contacts
 * Version: 1.0.0
 * ═══════════════════════════════════════════════════════════
 */

const { ovlcmd } = require("../lib/ovlcmd");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// Chemin vers la base de données contacts
const CONTACTS_DB_PATH = path.join(__dirname, "../DataBase/contacts.json");

// ═══════════════════════════════════════════════════════════
// 📊 STATISTIQUES CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "contactstats",
    classe: "Contacts",
    react: "📊",
    desc: "Voir les statistiques de vos contacts",
    alias: ["statcontacts", "mycontacts", "contacts"]
  },
  async (ovl, msg, { repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let contacts = {};
      if (fs.existsSync(CONTACTS_DB_PATH)) {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_DB_PATH, "utf8"));
      }

      const totalContacts = Object.keys(contacts).length;
      const activeContacts = Object.values(contacts).filter(c => c.messageCount > 0).length;
      const blockedContacts = Object.values(contacts).filter(c => c.isBlocked).length;

      // Contacts les plus actifs
      const topContacts = Object.values(contacts)
        .filter(c => c.messageCount > 0)
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);

      // Contacts récents
      const recentContacts = Object.values(contacts)
        .filter(c => c.lastSeen)
        .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
        .slice(0, 5);

      let statsText = `📊 *STATISTIQUES CONTACTS*\n━━━━━━━━━━━━━━━━━\n\n`;
      statsText += `👥 *Total contacts:* ${totalContacts}\n`;
      statsText += `✅ *Contacts actifs:* ${activeContacts}\n`;
      statsText += `🚫 *Contacts bloqués:* ${blockedContacts}\n\n`;

      if (topContacts.length > 0) {
        statsText += `🏆 *TOP 5 PLUS ACTIFS:*\n`;
        topContacts.forEach((c, i) => {
          statsText += `${i + 1}. ${c.name || "Inconnu"} - ${c.messageCount} msgs\n`;
        });
        statsText += `\n`;
      }

      if (recentContacts.length > 0) {
        statsText += `🕐 *CONTACTS RÉCENTS:*\n`;
        recentContacts.forEach((c, i) => {
          statsText += `${i + 1}. ${c.name || "Inconnu"}\n`;
        });
      }

      repondre(statsText);

    } catch (error) {
      console.error("[CONTACTSTATS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔗 GÉNÉRER LIEN WA.ME
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "mylink",
    classe: "Contacts",
    react: "🔗",
    desc: "Générer votre lien WhatsApp personnel",
    alias: ["walink", "sharelink", "monlien"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      // Obtenir le numéro du bot
      const botNumber = ovl.user?.id?.split(":")[0] || ovl.user?.id?.split("@")[0];
      
      if (!botNumber) {
        return repondre("❌ Impossible de récupérer le numéro du bot");
      }

      const customMessage = arg.join(" ") || "Bonjour! Je vous contacte via votre lien WhatsApp.";
      const encodedMessage = encodeURIComponent(customMessage);
      
      const waLink = `https://wa.me/${botNumber}`;
      const waLinkWithMessage = `https://wa.me/${botNumber}?text=${encodedMessage}`;

      let linkText = `🔗 *VOS LIENS WHATSAPP*\n━━━━━━━━━━━━━━━━━\n\n`;
      linkText += `📱 *Lien simple:*\n${waLink}\n\n`;
      linkText += `💬 *Lien avec message:*\n${waLinkWithMessage}\n\n`;
      linkText += `📌 *Conseils:*\n`;
      linkText += `• Partagez ce lien sur vos réseaux sociaux\n`;
      linkText += `• Ajoutez-le dans votre bio Instagram/TikTok\n`;
      linkText += `• Utilisez-le dans vos signatures email\n\n`;
      linkText += `💡 Pour personnaliser: .mylink [votre message]`;

      repondre(linkText);

    } catch (error) {
      console.error("[MYLINK]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📲 GÉNÉRER QR CODE WHATSAPP
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "myqr",
    classe: "Contacts",
    react: "📲",
    desc: "Générer votre QR code WhatsApp",
    alias: ["qrcode", "waqr", "monqr"]
  },
  async (ovl, msg, { arg, repondre, ms }) => {
    try {
      const botNumber = ovl.user?.id?.split(":")[0] || ovl.user?.id?.split("@")[0];
      
      if (!botNumber) {
        return repondre("❌ Impossible de récupérer le numéro du bot");
      }

      const customMessage = arg.join(" ") || "";
      let waLink = `https://wa.me/${botNumber}`;
      
      if (customMessage) {
        waLink += `?text=${encodeURIComponent(customMessage)}`;
      }

      await repondre("📲 Génération du QR code...");

      // Générer le QR code en buffer
      const qrBuffer = await QRCode.toBuffer(waLink, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: '#075E54',
          light: '#FFFFFF'
        }
      });

      await ovl.sendMessage(msg.key.remoteJid, {
        image: qrBuffer,
        caption: `📲 *VOTRE QR CODE WHATSAPP*\n━━━━━━━━━━━━━━━━━\n\n🔗 Lien: ${waLink}\n\n📌 Scannez ce QR code pour me contacter instantanément!\n\n💡 Partagez cette image sur vos réseaux sociaux pour gagner des contacts.`
      }, { quoted: ms });

    } catch (error) {
      console.error("[MYQR]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📇 GÉNÉRER VCARD
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "myvcard",
    classe: "Contacts",
    react: "📇",
    desc: "Générer votre carte de visite (vCard)",
    alias: ["vcard", "mycard", "sharecontact"]
  },
  async (ovl, msg, { arg, repondre, ms }) => {
    try {
      const botNumber = ovl.user?.id?.split(":")[0] || ovl.user?.id?.split("@")[0];
      const botName = arg.join(" ") || ovl.user?.name || "HANI-MD Bot";
      
      if (!botNumber) {
        return repondre("❌ Impossible de récupérer le numéro du bot");
      }

      // Créer la vCard
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${botName}
TEL;type=CELL;type=VOICE;waid=${botNumber}:+${botNumber}
END:VCARD`;

      await ovl.sendMessage(msg.key.remoteJid, {
        contacts: {
          displayName: botName,
          contacts: [{
            vcard: vcard
          }]
        }
      }, { quoted: ms });

      repondre(`📇 *Carte de visite envoyée!*\n\n👤 Nom: ${botName}\n📱 Numéro: +${botNumber}\n\n📌 Partagez cette carte pour que les gens puissent vous ajouter facilement!`);

    } catch (error) {
      console.error("[MYVCARD]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTER CONTACTS
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "exportcontacts",
    classe: "Contacts",
    react: "📤",
    desc: "Exporter la liste de vos contacts",
    alias: ["backupcontacts", "savecontacts"]
  },
  async (ovl, msg, { repondre, superUser, ms }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      let contacts = {};
      if (fs.existsSync(CONTACTS_DB_PATH)) {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_DB_PATH, "utf8"));
      }

      if (Object.keys(contacts).length === 0) {
        return repondre("📭 Aucun contact à exporter.");
      }

      // Créer un fichier CSV
      let csvContent = "Numéro,Nom,Premier contact,Dernier contact,Messages\n";
      
      for (const [number, data] of Object.entries(contacts)) {
        const name = (data.name || "Inconnu").replace(/,/g, ";");
        csvContent += `${number},${name},${data.firstSeen || ""},${data.lastSeen || ""},${data.messageCount || 0}\n`;
      }

      const exportPath = path.join(__dirname, "../DataBase/contacts_export.csv");
      fs.writeFileSync(exportPath, csvContent);

      // Envoyer le fichier
      await ovl.sendMessage(msg.key.remoteJid, {
        document: fs.readFileSync(exportPath),
        mimetype: "text/csv",
        fileName: `contacts_backup_${new Date().toISOString().split('T')[0]}.csv`
      }, { quoted: ms });

      repondre(`📤 *Contacts exportés!*\n\n📊 Total: ${Object.keys(contacts).length} contacts\n📁 Format: CSV`);

    } catch (error) {
      console.error("[EXPORTCONTACTS]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🔍 RECHERCHER UN CONTACT
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "findcontact",
    classe: "Contacts",
    react: "🔍",
    desc: "Rechercher un contact par nom ou numéro",
    alias: ["searchcontact", "chercher"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const query = arg.join(" ").toLowerCase();
      
      if (!query) {
        return repondre("❌ Utilisation: .findcontact [nom ou numéro]");
      }

      let contacts = {};
      if (fs.existsSync(CONTACTS_DB_PATH)) {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_DB_PATH, "utf8"));
      }

      const results = Object.entries(contacts).filter(([number, data]) => {
        const name = (data.name || "").toLowerCase();
        return name.includes(query) || number.includes(query);
      }).slice(0, 10);

      if (results.length === 0) {
        return repondre(`🔍 Aucun contact trouvé pour "${query}"`);
      }

      let resultText = `🔍 *RÉSULTATS DE RECHERCHE*\n━━━━━━━━━━━━━━━━━\n\n`;
      resultText += `📌 Recherche: "${query}"\n📊 Trouvés: ${results.length}\n\n`;

      results.forEach(([number, data], index) => {
        resultText += `${index + 1}. *${data.name || "Inconnu"}*\n`;
        resultText += `   📱 +${number}\n`;
        resultText += `   💬 ${data.messageCount || 0} messages\n`;
        resultText += `   📅 Dernier: ${data.lastSeen || "N/A"}\n\n`;
      });

      repondre(resultText);

    } catch (error) {
      console.error("[FINDCONTACT]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📨 MESSAGE DE MASSE (LÉGAL - CONTACTS EXISTANTS)
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "masspm",
    classe: "Contacts",
    react: "📨",
    desc: "Envoyer un message à tous vos contacts actifs",
    alias: ["massmsg", "bulkmsg", "pmall"]
  },
  async (ovl, msg, { arg, repondre, superUser }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      const message = arg.join(" ");
      
      if (!message) {
        return repondre("❌ Utilisation: .masspm [votre message]\n\n⚠️ Ce message sera envoyé à tous vos contacts actifs.");
      }

      let contacts = {};
      if (fs.existsSync(CONTACTS_DB_PATH)) {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_DB_PATH, "utf8"));
      }

      // Filtrer les contacts actifs (qui ont envoyé au moins 1 message)
      const activeContacts = Object.values(contacts).filter(c => 
        c.messageCount > 0 && 
        !c.isBlocked && 
        c.jid &&
        !c.jid.includes("@g.us") // Pas les groupes
      );

      if (activeContacts.length === 0) {
        return repondre("❌ Aucun contact actif trouvé.");
      }

      await repondre(`📨 *Envoi en cours...*\n\n👥 Destinataires: ${activeContacts.length} contacts\n⏱️ Temps estimé: ~${Math.ceil(activeContacts.length * 2 / 60)} minutes`);

      let sent = 0, failed = 0;

      for (const contact of activeContacts) {
        try {
          await ovl.sendMessage(contact.jid, {
            text: `📨 *MESSAGE PERSONNEL*\n━━━━━━━━━━━━━━━━━\n\n${message}\n\n━━━━━━━━━━━━━━━━━\n🤖 *HANI-MD*`
          });
          sent++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s entre chaque
        } catch (e) {
          failed++;
        }
      }

      repondre(`📨 *Envoi terminé!*\n\n✅ Envoyé: ${sent}\n❌ Échec: ${failed}\n📊 Total contacts: ${activeContacts.length}`);

    } catch (error) {
      console.error("[MASSPM]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 🎯 INVITATION GROUPÉE À UN GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "inviteall",
    classe: "Contacts",
    react: "🎯",
    desc: "Inviter vos contacts dans un groupe",
    alias: ["bulkinvite", "invitercontacts"]
  },
  async (ovl, msg, { repondre, superUser, verif_Groupe, admin_Groupe }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!verif_Groupe) {
        return repondre("❌ Cette commande doit être utilisée dans un groupe");
      }

      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin du groupe pour inviter");
      }

      let contacts = {};
      if (fs.existsSync(CONTACTS_DB_PATH)) {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_DB_PATH, "utf8"));
      }

      // Contacts avec numéros valides (format @s.whatsapp.net)
      const validContacts = Object.values(contacts).filter(c => 
        c.jid && 
        c.jid.includes("@s.whatsapp.net") &&
        !c.isBlocked
      );

      if (validContacts.length === 0) {
        return repondre("❌ Aucun contact valide à inviter.");
      }

      await repondre(`🎯 *Invitation en cours...*\n\n👥 Contacts: ${validContacts.length}\n⏱️ Cela peut prendre du temps...`);

      let added = 0, failed = 0;
      const groupJid = msg.key.remoteJid;

      // Ajouter par lots de 5 pour éviter les limitations
      const batches = [];
      for (let i = 0; i < validContacts.length; i += 5) {
        batches.push(validContacts.slice(i, i + 5));
      }

      for (const batch of batches) {
        const jids = batch.map(c => c.jid);
        try {
          await ovl.groupParticipantsUpdate(groupJid, jids, "add");
          added += jids.length;
        } catch (e) {
          failed += jids.length;
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      repondre(`🎯 *Invitation terminée!*\n\n✅ Ajoutés: ${added}\n❌ Échec: ${failed}\n📊 Total: ${validContacts.length}\n\n⚠️ Certains contacts peuvent avoir bloqué les ajouts de groupe.`);

    } catch (error) {
      console.error("[INVITEALL]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════
// 📢 PARTAGER LIEN DU GROUPE
// ═══════════════════════════════════════════════════════════

ovlcmd(
  {
    nom_cmd: "sharegroup",
    classe: "Contacts",
    react: "📢",
    desc: "Partager le lien du groupe à tous vos contacts",
    alias: ["promotegroup", "partagergroupe"]
  },
  async (ovl, msg, { arg, repondre, superUser, verif_Groupe, admin_Groupe }) => {
    try {
      if (!superUser) {
        return repondre("❌ Cette commande est réservée au propriétaire");
      }

      if (!verif_Groupe) {
        return repondre("❌ Cette commande doit être utilisée dans un groupe");
      }

      if (!admin_Groupe) {
        return repondre("❌ Je dois être admin pour obtenir le lien du groupe");
      }

      const groupJid = msg.key.remoteJid;
      const groupMeta = await ovl.groupMetadata(groupJid);
      const inviteCode = await ovl.groupInviteCode(groupJid);
      const groupLink = `https://chat.whatsapp.com/${inviteCode}`;
      
      const customMessage = arg.join(" ") || "Rejoignez notre groupe WhatsApp!";

      let contacts = {};
      if (fs.existsSync(CONTACTS_DB_PATH)) {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_DB_PATH, "utf8"));
      }

      const activeContacts = Object.values(contacts).filter(c => 
        c.messageCount > 0 && 
        !c.isBlocked && 
        c.jid &&
        c.jid.includes("@s.whatsapp.net")
      );

      if (activeContacts.length === 0) {
        return repondre(`📢 *Lien du groupe:*\n${groupLink}\n\n❌ Aucun contact actif pour le partage automatique.`);
      }

      await repondre(`📢 *Partage du lien en cours...*\n\n👥 Groupe: ${groupMeta.subject}\n🔗 Lien: ${groupLink}\n📤 Envoi à: ${activeContacts.length} contacts`);

      let sent = 0, failed = 0;

      for (const contact of activeContacts) {
        try {
          await ovl.sendMessage(contact.jid, {
            text: `📢 *INVITATION GROUPE*\n━━━━━━━━━━━━━━━━━\n\n👥 *${groupMeta.subject}*\n\n${customMessage}\n\n🔗 *Rejoindre:*\n${groupLink}\n\n━━━━━━━━━━━━━━━━━\n🤖 *HANI-MD*`
          });
          sent++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
          failed++;
        }
      }

      repondre(`📢 *Partage terminé!*\n\n✅ Envoyé: ${sent}\n❌ Échec: ${failed}\n\n🔗 Lien: ${groupLink}`);

    } catch (error) {
      console.error("[SHAREGROUP]", error);
      repondre(`❌ Erreur: ${error.message}`);
    }
  }
);

console.log("[CMD] ✅ Contacts.js chargé - Commandes: contactstats, mylink, myqr, myvcard, exportcontacts, findcontact, masspm, inviteall, sharegroup");
