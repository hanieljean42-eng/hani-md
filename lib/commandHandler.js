/**
 * 📨 HANI-MD - Handler de commandes
 * (extrait de start.js)
 */

const pino = require("pino");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { findCommand, executeCommand, getCommands } = require("./ovlcmd");
const { makeSelfSock, deleteCommandMessage } = require("./selfRedirect");
const {
  config,
  MAIN_PLAN_CONFIG,
  FREE_COMMANDS,
  getMainBotUsage,
  incrementMainBotUsage,
  protectionState,
  deletedMessages,
  getMessageText,
  viewOnceMessages,
  saveViewOnceMessages,
} = require("./state");

// Réponses basiques et lisibles (bypass du code obfusqué)
async function handleCommand(ovl, msg) {
  const from = msg.key.remoteJid;
  const body = getMessageText(msg);
  
  // ═══════════════════════════════════════════════════════════
  // 🔥 COMMANDE SPÉCIALE "C'EST QUEL WÉ ?" (sans préfixe)
  // ═══════════════════════════════════════════════════════════
  const bodyLower = (body || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (bodyLower.includes("c'est quel we") || 
      bodyLower.includes("cest quel we") || 
      bodyLower.includes("c est quel we") ||
      bodyLower.includes("quel we") ||
      bodyLower === "we" ||
      bodyLower === "wé") {
    // Traiter comme une commande vue unique
    const botNumber = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const send = (text) => ovl.sendMessage(botNumber, { text });
    
    // Récupérer le message cité
    const msgType = Object.keys(msg.message || {})[0];
    const contextInfo = msg.message?.[msgType]?.contextInfo || 
                        msg.message?.extendedTextMessage?.contextInfo;
    
    if (!contextInfo?.stanzaId) {
      return send("❓ *C'est quel wé ?*\n\n👉 Réponds à une photo/vidéo vue unique avec cette phrase pour la récupérer!\n\n💡 Utilise aussi: .vv, .wé, .listvv");
    }
    
    // Chercher dans le cache des vues uniques
    const quotedId = contextInfo.stanzaId;
    let storedViewOnce = viewOnceMessages.get(quotedId);
    
    if (!storedViewOnce) {
      for (const [id, data] of viewOnceMessages) {
        if (contextInfo.participant === data.message?.key?.participant ||
            contextInfo.participant === data.sender) {
          storedViewOnce = data;
          break;
        }
      }
    }
    
    if (!storedViewOnce) {
      return send("❌ *Wé introuvable!*\n\nCette vue unique n'a pas été interceptée.\n\n💡 Les vues uniques doivent être reçues AVANT d'être ouvertes pour être sauvegardées.\n\n📋 Utilise `.listvv` pour voir les vues uniques disponibles.");
    }
    
    try {
      const originalMsg = storedViewOnce.message;
      const viewOnceContent = originalMsg.message?.viewOnceMessage || 
                              originalMsg.message?.viewOnceMessageV2 || 
                              originalMsg.message?.viewOnceMessageV2Extension;
      
      if (!viewOnceContent) {
        return send("❌ Contenu vue unique non disponible.");
      }
      
      const mediaMsg = viewOnceContent.message;
      const mediaType = Object.keys(mediaMsg || {})[0];
      const media = mediaMsg?.[mediaType];
      
      if (!media) {
        return send("❌ Média non trouvé dans la vue unique.");
      }
      
      const buffer = await downloadMediaMessage(originalMsg, "buffer", {});
      const caption = media.caption || "";
      const senderName = storedViewOnce.senderName || "Inconnu";
      
      const finalCaption = `👁️ *VUE UNIQUE RÉCUPÉRÉE*\n\n📤 De: ${senderName}\n📝 Légende: ${caption || "(aucune)"}\n\n✅ Wé récupéré avec succès!`;
      
      if (mediaType === "imageMessage") {
        await ovl.sendMessage(botNumber, { image: buffer, caption: finalCaption });
      } else if (mediaType === "videoMessage") {
        await ovl.sendMessage(botNumber, { video: buffer, caption: finalCaption });
      } else if (mediaType === "audioMessage") {
        await ovl.sendMessage(botNumber, { audio: buffer, mimetype: "audio/mp4", ptt: true });
        await send(finalCaption);
      }
      
      console.log(`[WÉ] ✅ Vue unique récupérée pour ${senderName}`);
      return;
    } catch (e) {
      console.error("[WÉ] Erreur:", e);
      return send(`❌ Erreur: ${e.message}`);
    }
  }
  
  if (!body || !body.startsWith(config.PREFIXE)) return;

  const [cmd, ...rest] = body.slice(config.PREFIXE.length).trim().split(/\s+/);
  const command = (cmd || "").toLowerCase();
  const args = rest; // Garder comme tableau pour accès par index
  const argsText = rest.join(" "); // Version texte pour les commandes qui en ont besoin

  // Numéro du bot (pour envoyer en privé)
  const botNumber = ovl.user?.id?.split(":")[0] + "@s.whatsapp.net";
  
  // ═══════════════════════════════════════════════════════════
  // 🗑️ SUPPRIMER AUTOMATIQUEMENT LE MESSAGE DE COMMANDE
  // ═══════════════════════════════════════════════════════════
  const isOwnChat = from === botNumber;
  
  // Supprimer le message de commande dans le chat d'origine (hors self-chat)
  // ⚡ Non bloquant : la commande s'exécute immédiatement sans attendre la suppression
  if (!isOwnChat) {
    deleteCommandMessage(ovl, msg)
      .then(() => console.log(`🗑️ Commande .${command} supprimée du chat ${from}`))
      .catch(() => {});
  }
  
  // ═══════════════════════════════════════════════════════════
  // 📩 RÉPONSE : toujours dans la discussion "avec soi-même"
  // ═══════════════════════════════════════════════════════════
  const sendPrivate = (text) => ovl.sendMessage(botNumber, { text: String(text) });

  const toggle = (key) => {
    protectionState[key] = !protectionState[key];
    return protectionState[key];
  };

  // Toutes les réponses sont envoyées dans le chat "avec soi-même"
  const send = sendPrivate;

  // Charger le système de menu stylisé
  let MenuSystem, AccessControl;
  try {
    MenuSystem = require('./MenuSystem');
    AccessControl = require('./AccessControl');
  } catch (e) {
    console.log('[START] Modules de menu non disponibles, utilisation du menu basique');
  }

  // Fonction pour obtenir les infos utilisateur
  const getUserInfo = async (jid) => {
    const phone = jid.replace('@s.whatsapp.net', '').replace('@lid', '');
    const ownerNum = (process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, '');
    const isOwner = AccessControl ? AccessControl.isOwner(jid) : (
      phone === ownerNum || phone.includes(ownerNum) || ownerNum.includes(phone)
    );
    
    let plan = 'FREE';
    let dailyLimit = 30;
    let commandsToday = 0;
    
    try {
      const premiumDB = require('../DataBase/premium');
      // Normaliser le JID: retirer le suffixe device (:0, :1…) pour multi-device
      const normalizedJid = jid.replace(/:\d+@/, '@');
      const status = await premiumDB.getPremiumStatus(normalizedJid);
      if (status && status.plan) {
        plan = status.plan;
        dailyLimit = status.dailyLimit || 30;
        commandsToday = status.commandsToday || 0;
      }
    } catch (e) {}
    
    if (isOwner) {
      plan = 'OWNER';
      dailyLimit = -1;
    }
    
    return {
      name: msg.pushName || 'Utilisateur',
      phone: phone,
      plan: plan,
      isOwner: isOwner,
      isPremium: ['BRONZE', 'ARGENT', 'OR', 'DIAMANT', 'LIFETIME', 'OWNER'].includes(plan),
      commandsToday: commandsToday,
      dailyLimit: dailyLimit
    };
  };

  switch (command) {
    case "ping":
      return send("🏓 Pong! Le bot est en ligne.");
    case "menu":
    case "help":
    case "aide": {
      try {
        const isFromMe = msg.key.fromMe === true;
        const botJid = ovl.user?.id?.split(':')[0] + '@s.whatsapp.net';
        const senderForMenu = isFromMe ? botJid : (msg.key.participant || from);
        const userInfo = await getUserInfo(senderForMenu);
        const isOwnerMenu = userInfo.isOwner;
        const category = args[0] ? args.join(' ').toLowerCase().trim() : null;

        // ── Construire la map dynamique depuis toutes les commandes réelles ──
        const allCmds = getCommands();
        const dynCats = {};
        for (const c of allCmds) {
          const catRaw = c.category || 'Divers';
          const catKey = catRaw.toLowerCase().replace(/[^\w\séàâîôùèë]/g, '').trim();
          if (!dynCats[catKey]) dynCats[catKey] = { label: catRaw, cmds: [] };
          dynCats[catKey].cmds.push(c);
        }

        // Catégories owner-only à cacher pour non-owner
        const ownerOnlyCats = ['owner', 'paiements', 'espionnage', 'modration', 'modération'];

        if (category) {
          // ── SOUS-MENU : trouver la catégorie (match souple) ──
          const matchKey = Object.keys(dynCats).find(k => {
            const kClean = k.replace(/[^\w]/g,'');
            const catClean = category.replace(/[^\w]/g,'');
            return kClean.includes(catClean) || catClean.includes(kClean);
          }) || (MenuSystem?.CATEGORIES[category] ? category : null);

          if (matchKey && dynCats[matchKey]) {
            const cat = dynCats[matchKey];
            const visibleCmds = cat.cmds.filter(c => isOwnerMenu || !ownerOnlyCats.some(o => matchKey.includes(o)));
            const uptime = process.uptime();
            const uptimeStr = `${Math.floor(uptime/3600)}h${Math.floor((uptime%3600)/60)}m`;
            let sub = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
            sub += `┃  ${cat.label.substring(0,28).padEnd(28)} ┃\n`;
            sub += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
            sub += `📊 *${cat.cmds.length} commandes* dans cette catégorie\n`;
            sub += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            for (const c of cat.cmds) {
              const cmdName = c.name || c.nom_cmd || '?';
              const cmdDesc = c.description || c.desc || 'Commande disponible';
              const cmdAlias = c.aliases || c.alias || [];
              sub += `┌ *.${cmdName}*\n`;
              if (cmdAlias.length) sub += `│  ↪ ${cmdAlias.slice(0,3).map(a=>'.'+a).join(' | ')}\n`;
              sub += `└  ${cmdDesc}\n\n`;
            }
            sub += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            sub += `💡 *.menu* → retour au menu principal`;
            return send(sub);
          } else if (MenuSystem?.CATEGORIES[category]) {
            return send(MenuSystem.generateCategoryMenu(category, userInfo));
          } else {
            const catList = Object.keys(dynCats)
              .filter(k => isOwnerMenu || !ownerOnlyCats.some(o => k.includes(o)))
              .map(k => `• .menu ${k}`)
              .join('\n');
            return send(`❌ Catégorie *${category}* introuvable.\n\nCatégories disponibles:\n${catList}`);
          }
        }

        // ── MENU PRINCIPAL DYNAMIQUE ──
        const botUptime = (() => {
          const s = process.uptime();
          return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
        })();
        const ram = (process.memoryUsage().heapUsed/1024/1024).toFixed(1);
        const now = new Date().toLocaleString('fr-FR', {timeZone:'Africa/Abidjan'});

        let menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
        menu += `┃   🤖 *HANI-MD PREMIUM V2.6.0*  ┃\n`;
        menu += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
        menu += `╭──「 👤 *PROFIL* 」──╮\n`;
        menu += `│ Nom: *${(userInfo.name||'Utilisateur').substring(0,20)}*\n`;
        menu += `│ Plan: *${userInfo.plan || 'FREE'}*${isOwnerMenu?' 🔱':''}\n`;
        menu += `│ Cmds: ${userInfo.dailyLimit===-1?'∞ Illimité':`${userInfo.commandsToday||0}/${userInfo.dailyLimit}`}\n`;
        menu += `╰────────────────────╯\n\n`;
        menu += `╭──「 ⚡ *BOT STATUS* 」──╮\n`;
        menu += `│ ⏱️ Uptime: ${botUptime}\n`;
        menu += `│ 💾 RAM: ${ram}MB\n`;
        menu += `│ 🕐 ${now}\n`;
        menu += `╰──────────────────────╯\n\n`;
        menu += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        menu += `       📋 *TOUTES LES CATÉGORIES*\n`;
        menu += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Trier par nombre de cmds décroissant
        const sortedCats = Object.entries(dynCats)
          .filter(([k]) => isOwnerMenu || !ownerOnlyCats.some(o => k.includes(o)))
          .sort((a,b) => b[1].cmds.length - a[1].cmds.length);

        for (const [key, cat] of sortedCats) {
          menu += `│ 📁 *.menu ${key}*\n`;
          menu += `│    ↳ ${cat.cmds.length} commandes\n│\n`;
        }

        menu += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        menu += `📊 Total: *${allCmds.length} commandes* disponibles\n`;
        menu += `💡 *.menu <catégorie>* → voir les commandes\n`;
        menu += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        menu += `  🌐 Support: wa.me/22550252467`;

        return send(menu);
      } catch (menuErr) {
        console.log('[MENU] Erreur:', menuErr.message);
        return send('❌ Erreur menu. Utilise `.ping` pour vérifier que le bot fonctionne.');
      }
    }
    case "info": {
      const infoText = `
🤖 OVL-MD-V2
• Numéro : ${ovl.user?.id?.split(":")[0] || "inconnu"}
• Owner  : ${config.NOM_OWNER}
• Mode   : ${config.MODE}
• Préfixe: ${config.PREFIXE}
• Antidelete: ${protectionState.antidelete ? "✅ Activé" : "❌ Désactivé"}
`;
      return send(infoText);
    }

    case "premium":
    case "subscribe":
    case "plans":
    case "offres":
    case "myplan": {
      const senderForPlan = msg.key.fromMe ? botNumber : (msg.key.participant || from);
      const userPlanInfo = await getUserInfo(senderForPlan);
      const siteUrl = process.env.SITE_URL || 'https://hani-tp3e.onrender.com';
      
      let premText = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
      premText += `┃   💎 *HANI-MD PREMIUM*      ┃\n`;
      premText += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
      premText += `👤 *Votre plan actuel:* ${userPlanInfo.plan}\n`;
      premText += `📊 *Commandes aujourd'hui:* ${userPlanInfo.commandsToday || 0}/${userPlanInfo.dailyLimit === -1 ? '∞' : userPlanInfo.dailyLimit}\n\n`;
      premText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      premText += `        📋 *NOS OFFRES*\n`;
      premText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      premText += `🆓 *GRATUIT* — 0 FCFA\n`;
      premText += `   30 cmd/jour, commandes de base\n\n`;
      premText += `🥉 *BRONZE* — 500 FCFA/mois\n`;
      premText += `   50 cmd/jour + téléchargements\n\n`;
      premText += `🥈 *ARGENT* — 1 000 FCFA/mois\n`;
      premText += `   200 cmd/jour + IA + groupes\n\n`;
      premText += `🥇 *OR* — 2 000 FCFA/mois\n`;
      premText += `   ILLIMITÉ — toutes les fonctions\n\n`;
      premText += `💎 *DIAMANT* — 5 000 FCFA/mois\n`;
      premText += `   ILLIMITÉ + API + support VIP\n\n`;
      premText += `👑 *LIFETIME* — 15 000 FCFA\n`;
      premText += `   ACCÈS À VIE — paiement unique\n\n`;
      premText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      premText += `💳 *Pour s'abonner:*\n`;
      premText += `🌐 ${siteUrl}/subscribe\n\n`;
      premText += `📱 *Ou contactez:*\n`;
      premText += `wa.me/22550252467\n`;
      premText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      return send(premText);
    }
    
    // === COMMANDES MIGRÉES VERS OVLCMD (cmd/VueUnique.js + cmd/Protection.js) ===
    // deleted, cleardeleted, vv, listvv, lastvv, antilink, antispam, antibot, anticall, antitag, antidelete
    // → Ces commandes sont maintenant dans le système OVLCMD et apparaissent dans .menu
    case "deleted_DISABLED": {
      if (deletedMessages.length === 0) {
        return send("📭 *Aucun message supprimé enregistré.*\n\n💡 L'anti-delete capture automatiquement les messages supprimés et les sauvegarde sur disque.");
      }
      
      // Pagination : .deleted [nombre] ou .deleted all
      const param = (args[0] || '').toLowerCase();
      let count = 15;
      if (param === 'all') count = deletedMessages.length;
      else if (!isNaN(parseInt(param))) count = Math.min(parseInt(param), deletedMessages.length);

      const recent = deletedMessages.slice(-count).reverse(); // Plus récents en premier
      let list = `🗑️ *MESSAGES SUPPRIMÉS INTERCEPTÉS*\n`;
      list += `📊 Total enregistré: *${deletedMessages.length}* | Affichage: *${recent.length}*\n`;
      list += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      recent.forEach((del, i) => {
        list += `*${i + 1}.* 👤 ${del.sender || 'Inconnu'}\n`;
        if (del.text) list += `   💬 "${del.text.substring(0, 120)}${del.text.length > 120 ? '...' : ''}"\n`;
        else list += `   📎 [${del.type || 'media'}]\n`;
        list += `   🕐 ${del.date}\n\n`;
      });

      list += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      list += `💡 *.deleted all* → tout voir\n`;
      list += `💡 *.deleted 30* → voir les 30 derniers\n`;
      list += `💡 *.cleardeleted* → vider l'historique`;
      return send(list);
    }
    
    // === COMMANDES VUE UNIQUE (DISABLED - gérées par cmd/VueUnique.js) ===
    case "vv_DISABLED": {
      // Récupérer les informations du message cité de plusieurs façons
      const msgType = Object.keys(msg.message || {})[0];
      const contextInfo = msg.message?.[msgType]?.contextInfo || 
                          msg.message?.extendedTextMessage?.contextInfo ||
                          msg.message?.imageMessage?.contextInfo ||
                          msg.message?.videoMessage?.contextInfo;
      
      if (!contextInfo?.stanzaId) {
        return send("❌ Réponds à un message à vue unique pour le récupérer.\n\n💡 Utilise `.listvv` pour voir les vues uniques interceptées.");
      }
      
      const quotedId = contextInfo.stanzaId;
      const quotedMsg = contextInfo.quotedMessage;
      
      console.log(`[VV] ID message cité: ${quotedId}`);
      console.log(`[VV] Type quotedMsg: ${quotedMsg ? Object.keys(quotedMsg).join(', ') : 'null'}`);
      
      // Méthode 1: Chercher dans les messages à vue unique interceptés
      let storedViewOnce = viewOnceMessages.get(quotedId);
      
      // Méthode 2: Chercher par sender + timestamp approximatif
      if (!storedViewOnce) {
        for (const [id, data] of viewOnceMessages) {
          if (contextInfo.participant === data.message?.key?.participant ||
              contextInfo.participant === data.sender) {
            storedViewOnce = data;
            break;
          }
        }
      }
      
      let viewOnceContent = null;
      let originalMsg = null;
      
      // Essayer d'obtenir le contenu à vue unique
      if (storedViewOnce) {
        // Utiliser le message stocké
        console.log(`[VV] ✅ Message trouvé dans le cache: ${storedViewOnce.type}`);
        originalMsg = storedViewOnce.message;
        viewOnceContent = originalMsg.message?.viewOnceMessage || 
                          originalMsg.message?.viewOnceMessageV2 || 
                          originalMsg.message?.viewOnceMessageV2Extension;
      } else if (quotedMsg) {
        // Essayer depuis le quotedMessage directement
        viewOnceContent = quotedMsg.viewOnceMessage || 
                          quotedMsg.viewOnceMessageV2 || 
                          quotedMsg.viewOnceMessageV2Extension;
        
        // Parfois le média est directement dans quotedMessage
        if (!viewOnceContent) {
          const quotedType = Object.keys(quotedMsg)[0];
          if (quotedType === "imageMessage" || quotedType === "videoMessage" || quotedType === "audioMessage") {
            // C'est peut-être une vue unique dont le wrapper a été retiré
            viewOnceContent = { message: quotedMsg };
            console.log(`[VV] Média direct trouvé: ${quotedType}`);
          }
        }
      }
      
      if (!viewOnceContent) {
        console.log(`[VV] ❌ Pas de vue unique trouvée. QuotedMsg keys: ${quotedMsg ? Object.keys(quotedMsg).join(', ') : 'null'}`);
        return send("❌ Ce message n'est pas un message à vue unique.\n\n💡 Astuce: Les vues uniques doivent être interceptées AVANT d'être ouvertes. Utilise `.listvv` pour voir celles déjà interceptées.");
      }
      
      try {
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0];
        const media = mediaMsg?.[mediaType];
        
        if (!mediaType || !media) {
          return send("❌ Impossible de lire le contenu du média.");
        }
        
        console.log(`[VV] Téléchargement du média: ${mediaType}`);
        
        // Télécharger le média - utiliser le bon message original
        const downloadMsg = originalMsg || { message: mediaMsg, key: { ...msg.key, id: quotedId } };
        const stream = await downloadMediaMessage(
          downloadMsg,
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: ovl.updateMediaMessage }
        );
        
        // Destination : privé si pas dans son propre chat
        const dest = isOwnChat ? from : botNumber;
        
        // Renvoyer le média sans vue unique (en privé)
        if (mediaType === "imageMessage") {
          await ovl.sendMessage(dest, { 
            image: stream, 
            caption: "👁️ Vue unique récupérée :\n" + (media.caption || "") 
          });
        } else if (mediaType === "videoMessage") {
          await ovl.sendMessage(dest, { 
            video: stream, 
            caption: "👁️ Vue unique récupérée :\n" + (media.caption || "") 
          });
        } else if (mediaType === "audioMessage") {
          await ovl.sendMessage(dest, { 
            audio: stream,
            mimetype: "audio/mp4"
          });
        } else {
          return send("❌ Type de média non supporté: " + mediaType);
        }
        
        console.log(`👁️ Vue unique récupérée pour ${from} (envoyée en privé)`);
        
        // Supprimer du cache après récupération et sauvegarder
        if (storedViewOnce) {
          viewOnceMessages.delete(quotedId);
          saveViewOnceMessages(viewOnceMessages);
        }
        
      } catch (e) {
        console.log("⚠️ Erreur viewonce:", e.message, e.stack);
        return send("❌ Impossible de récupérer ce média.\n\nErreur: " + e.message);
      }
      return;
    }
    
    case "listvv_DISABLED": {
      console.log(`[LISTVV] Nombre de vues uniques en cache: ${viewOnceMessages.size}`);
      
      if (viewOnceMessages.size === 0) {
        return send("📭 Aucun message à vue unique intercepté récemment.\n\n💡 Les vues uniques sont automatiquement interceptées quand elles arrivent. Attends qu'une vue unique soit envoyée.");
      }
      
      let list = "👁️ *Messages à vue unique interceptés :*\n\n";
      let i = 1;
      for (const [id, data] of viewOnceMessages) {
        const senderName = data.pushName || data.sender?.split('@')[0] || 'Inconnu';
        list += `*${i}.* ${senderName}\n`;
        list += `   📁 Type: ${data.type}\n`;
        list += `   🕐 Date: ${data.date}\n`;
        list += `   🆔 ID: ${id.substring(0, 10)}...\n\n`;
        i++;
      }
      list += `\n💡 *Pour récupérer:* Réponds au message original avec .vv`;
      return send(list);
    }
    
    // Commande pour récupérer la dernière vue unique sans répondre
    case "lastvv_DISABLED": {
      if (viewOnceMessages.size === 0) {
        return send("📭 Aucun message à vue unique intercepté.");
      }
      
      // Obtenir le dernier message
      const lastEntry = Array.from(viewOnceMessages.entries()).pop();
      if (!lastEntry) {
        return send("❌ Erreur lors de la récupération.");
      }
      
      const [lastId, lastData] = lastEntry;
      
      try {
        const viewOnceContent = lastData.message.message?.viewOnceMessage || 
                                lastData.message.message?.viewOnceMessageV2 || 
                                lastData.message.message?.viewOnceMessageV2Extension;
        
        if (!viewOnceContent) {
          return send("❌ Le contenu n'est plus disponible.");
        }
        
        const mediaMsg = viewOnceContent.message;
        const mediaType = Object.keys(mediaMsg || {})[0];
        const media = mediaMsg?.[mediaType];
        
        console.log(`[LASTVV] Téléchargement: ${mediaType}`);
        
        const stream = await downloadMediaMessage(
          lastData.message,
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: ovl.updateMediaMessage }
        );
        
        const dest = isOwnChat ? from : botNumber;
        const caption = `👁️ Dernière vue unique (de ${lastData.pushName || 'Inconnu'}):\n${media?.caption || ''}`;
        
        if (mediaType === "imageMessage") {
          await ovl.sendMessage(dest, { image: stream, caption });
        } else if (mediaType === "videoMessage") {
          await ovl.sendMessage(dest, { video: stream, caption });
        } else if (mediaType === "audioMessage") {
          await ovl.sendMessage(dest, { audio: stream, mimetype: "audio/mp4" });
        }
        
        console.log(`👁️ Dernière vue unique récupérée`);
        viewOnceMessages.delete(lastId);
        saveViewOnceMessages(viewOnceMessages); // Sauvegarder après suppression
        
      } catch (e) {
        console.log("⚠️ Erreur lastvv:", e.message);
        return send("❌ Erreur: " + e.message);
      }
      return;
    }
    
    // antilink, antispam, antibot, anticall, antitag, antidelete → cmd/Protection.js
    default: {
      // ═══════════════════════════════════════════════════════════
      // 🔄 DÉLÉGUER AU SYSTÈME DE COMMANDES PRINCIPAL (OVLCMD)
      // ═══════════════════════════════════════════════════════════
      
      // Rechercher si la commande existe dans le système principal
      const cmdData = findCommand(command);
      
      if (cmdData) {
        try {
          // Préparer les options pour le handler de commande
          const isGroup = from.endsWith("@g.us");
          const sender = msg.key.participant || from;
          const senderNumber = sender.replace("@s.whatsapp.net", "").replace("@lid", "");
          const ownerNumber = (config.NUMERO_OWNER || config.OWNER_NUMBER || process.env.NUMERO_OWNER || process.env.OWNER_NUMBER || '22550252467').replace(/[^0-9]/g, "");
          const senderClean = senderNumber.split(':')[0]; // retirer le :0 éventuel
          // fromMe=true : seul l'owner peut envoyer des messages depuis ce bot
          const isOwner = msg.key.fromMe === true || (ownerNumber.length > 5 && (
                           senderClean === ownerNumber ||
                           senderNumber === ownerNumber ||
                           senderClean.includes(ownerNumber) ||
                           ownerNumber.includes(senderClean)
                         ));
          
          // Fonction répondre pour les commandes - envoie dans la discussion "avec soi-même"
          const repondre = async (text, opts = {}) => {
            const msgContent = { text: String(text) };
            if (opts?.mentions) msgContent.mentions = opts.mentions;
            await ovl.sendMessage(botNumber, msgContent);
          };
          
          // Préparer le message structuré pour les commandes
          const ms = msg;
          const arg = rest;
          const texte = argsText;
          
          // Déterminer les permissions de groupe
          let isAdmin = false;
          let isBotAdmin = false;
          let groupName = null;
          if (isGroup) {
            try {
              const groupMeta = await ovl.groupMetadata(from);
              const botJid = ovl.user?.id?.split(':')[0] + '@s.whatsapp.net';
              const admins = groupMeta.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
              isAdmin = admins.includes(sender);
              isBotAdmin = admins.includes(botJid);
              groupName = groupMeta.subject;
            } catch (e) {}
          }

          // Options passées au handler
          const options = {
            repondre,
            arg,
            args: arg,
            argsText: texte,
            texte,
            ms,
            superUser: isOwner,
            auteurMessage: sender,
            isGroup,
            verif_Groupe: isGroup,
            admin_Groupe: isBotAdmin,
            verif_Ovl_Admin: isBotAdmin,
            verif_Admin: isAdmin,
            auteur_Msg: sender,
            auteurMsgRepondu: msg.message?.extendedTextMessage?.contextInfo?.participant,
            nomAuteurMessage: msg.pushName || "Utilisateur",
            msgRepondu: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage,
            idBot: botNumber,
            preniumUsers: [],
            superUsers: [config.NUMERO_OWNER],
            dev: [],
            prefixe: config.PREFIXE,
            from,
            nomGroupe: groupName,
            destPrivate: botNumber,
          };
          
          // ── Vérification plan (si pas owner et commande non gratuite) ──
          if (!isOwner && !FREE_COMMANDS.has(command.toLowerCase())) {
            const userInfo = await getUserInfo(sender);
            const planKey = (userInfo.plan || 'FREE').toUpperCase();
            const planCfg = MAIN_PLAN_CONFIG[planKey] || MAIN_PLAN_CONFIG.FREE;
            const siteUrl = process.env.SITE_URL || 'https://hani-md-1.onrender.com';

            // Vérifier commande explicitement bloquée
            if (planCfg.blockedCommands.includes(command.toLowerCase())) {
              return repondre(`🔒 *Commande réservée*\n\n${planCfg.upgradeMsg}\n💎 Abonnez-vous ici : ${siteUrl}/subscribe`);
            }

            // Vérifier catégorie autorisée
            if (planCfg.allowedCategories && cmdData.command.category) {
              if (!planCfg.allowedCategories.includes(cmdData.command.category)) {
                return repondre(`🔒 *Catégorie "${cmdData.command.category}" non incluse dans votre plan ${planKey}*\n\n${planCfg.upgradeMsg}\n💎 Abonnez-vous : ${siteUrl}/subscribe`);
              }
            }

            // Vérifier limite journalière
            if (planCfg.dailyLimit > 0) {
              const usedToday = getMainBotUsage(senderClean);
              if (usedToday >= planCfg.dailyLimit) {
                return repondre(`⏰ *Limite journalière atteinte* (${usedToday}/${planCfg.dailyLimit} commandes)\n\n💎 Passez à un plan supérieur pour plus de commandes !\n🌐 ${siteUrl}/subscribe`);
              }
            }

            // Incrémenter le compteur
            incrementMainBotUsage(senderClean);
          }
          // ── Fin vérification plan ──

          // Exécuter la commande (socket redirigé : réponses → discussion avec soi-même)
          await executeCommand(command, makeSelfSock(ovl, from), msg, options);
          return;
        } catch (e) {
          console.log(`[CMD] ⚠️ Erreur exécution ${command}:`, e.message);
          return sendPrivate(`❌ Erreur lors de l'exécution de la commande: ${e.message}`);
        }
      }
      
      // Si la commande n'existe vraiment pas, ne pas répondre
      // (pour ne pas spammer à chaque message)
      return;
    }
  }
}

module.exports = { handleCommand };
