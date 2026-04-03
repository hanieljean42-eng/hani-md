/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        💎 HANI-MD - COMMANDES PREMIUM V1.0                ║
 * ║     Commandes pour le système d'abonnement                ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { ovlcmd } = require('../lib/ovlcmd');
const premium = require('../DataBase/premium');
const config = require('../set');

// ═══════════════════════════════════════════════════════════
// 👤 COMMANDES UTILISATEURS
// ═══════════════════════════════════════════════════════════

/**
 * .premium - Affiche les plans disponibles
 */
ovlcmd({
  nom_cmd: "premium",
  classe: "💎 Premium",
  react: "💎",
  desc: "Affiche les plans premium disponibles"
}, async (hani, ms, { repondre }) => {
  const plans = premium.PLANS;
  
  let message = `
╔═══════════════════════════════════╗
║     💎 *HANI-MD PREMIUM* 💎       ║
╠═══════════════════════════════════╣
║  Débloquez toutes les            ║
║  fonctionnalités du bot!         ║
╚═══════════════════════════════════╝

`;
  
  for (const [key, plan] of Object.entries(plans)) {
    if (key === 'gratuit') continue;
    
    const duration = plan.duration === -1 ? "À VIE" : `${plan.duration} jours`;
    const limit = plan.dailyLimit === -1 ? "ILLIMITÉ" : `${plan.dailyLimit}/jour`;
    
    message += `${plan.color} *${plan.name}*\n`;
    message += `┃ 💰 Prix: *${plan.price} FCFA*\n`;
    message += `┃ ⏱️ Durée: ${duration}\n`;
    message += `┃ 📊 Commandes: ${limit}\n`;
    message += `┃ ────────────────\n`;
    plan.features.forEach(f => {
      message += `┃ ${f}\n`;
    });
    message += `┗━━━━━━━━━━━━━━━━━━\n\n`;
  }
  
  message += `
📱 *COMMENT SOUSCRIRE ?*

1️⃣ Contactez le propriétaire:
   wa.me/${config.NUMERO_OWNER?.replace(/[^0-9]/g, '') || '22550252467'}

2️⃣ Envoyez le montant via:
   • Orange Money
   • MTN Money  
   • Wave
   • Moov Money

3️⃣ Recevez votre code d'activation

4️⃣ Utilisez: *.upgrade <code>*

━━━━━━━━━━━━━━━━━━━━━
💡 Tapez *.myplan* pour voir votre abonnement actuel
`;
  
  await repondre(message);
});

/**
 * .myplan - Affiche le plan actuel de l'utilisateur
 */
ovlcmd({
  nom_cmd: "myplan",
  classe: "💎 Premium",
  react: "📊",
  desc: "Affiche votre abonnement actuel",
  alias: ["monplan", "plan", "subscription"]
}, async (hani, ms, { repondre, auteurMessage }) => {
  const status = premium.getPremiumStatus(auteurMessage);
  
  let message = `
╔═══════════════════════════════════╗
║     📊 *VOTRE ABONNEMENT*         ║
╚═══════════════════════════════════╝

`;
  
  if (status.expired) {
    message += `⚠️ *ABONNEMENT EXPIRÉ*\n`;
    message += `Ancien plan: ${premium.PLANS[status.expiredPlan]?.name || status.expiredPlan}\n\n`;
    message += `Renouvelez avec *.upgrade <code>*\n`;
  } else {
    message += `${status.planInfo.color} Plan: *${status.planInfo.name}*\n\n`;
    
    if (status.isPremium) {
      if (status.daysLeft === -1) {
        message += `⏱️ Durée: *À VIE* 👑\n`;
      } else {
        message += `⏱️ Expire dans: *${status.daysLeft} jours*\n`;
        message += `📅 Date: ${new Date(status.expiresAt).toLocaleDateString('fr-FR')}\n`;
      }
      
      if (status.badges && status.badges.length > 0) {
        message += `🏆 Badges: ${status.badges.join(' ')}\n`;
      }
    }
    
    message += `\n📊 *Utilisation aujourd'hui:*\n`;
    if (status.dailyLimit === -1) {
      message += `   ${status.dailyUsage} commandes (ILLIMITÉ)\n`;
    } else {
      const percentage = Math.round((status.dailyUsage / status.dailyLimit) * 100);
      const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
      message += `   ${status.dailyUsage}/${status.dailyLimit} [${bar}] ${percentage}%\n`;
    }
    
    message += `\n📈 Total commandes: ${status.totalCommands || 0}\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━━`;
  
  if (!status.isPremium) {
    message += `\n\n💡 Passez à Premium pour plus de fonctionnalités!\nTapez *.premium* pour voir les plans.`;
  }
  
  await repondre(message);
});

/**
 * .upgrade - Active un code premium
 */
ovlcmd({
  nom_cmd: "upgrade",
  classe: "💎 Premium",
  react: "🔑",
  desc: "Active un code premium. Usage: .upgrade CODE",
  alias: ["redeem", "activer", "code"]
}, async (hani, ms, { repondre, arg, auteurMessage }) => {
  if (!arg[0]) {
    return repondre(`
❌ *Code manquant!*

Usage: *.upgrade VOTRE-CODE*

Exemple: *.upgrade HANI-OR-A1B2C3D4*

💡 Pas de code? Tapez *.premium* pour voir comment en obtenir un.
`);
  }
  
  const code = arg[0].toUpperCase();
  const result = premium.redeemCode(code, auteurMessage);
  
  if (!result.success) {
    return repondre(result.error);
  }
  
  const message = `
╔═══════════════════════════════════╗
║     ✅ *ACTIVATION RÉUSSIE!*      ║
╚═══════════════════════════════════╝

🎉 Félicitations!

${result.plan.color} Plan activé: *${result.plan.name}*

⏱️ Expire: ${result.expiresAt === 'À VIE' ? '*À VIE* 👑' : new Date(result.expiresAt).toLocaleDateString('fr-FR')}

📊 Limite quotidienne: ${result.plan.dailyLimit === -1 ? 'ILLIMITÉE' : result.plan.dailyLimit}

━━━━━━━━━━━━━━━━━━━━━

🚀 *Vos nouvelles fonctionnalités:*
${result.plan.features.join('\n')}

━━━━━━━━━━━━━━━━━━━━━
Merci pour votre confiance! 💎
`;
  
  await repondre(message);
});

/**
 * .plans - Comparaison rapide des plans
 */
ovlcmd({
  nom_cmd: "plans",
  classe: "💎 Premium",
  react: "📋",
  desc: "Comparaison rapide des plans"
}, async (hani, ms, { repondre }) => {
  const message = `
╔═══════════════════════════════════════════╗
║       📋 *COMPARAISON DES PLANS*          ║
╚═══════════════════════════════════════════╝

┌─────────┬─────────┬──────────┬─────────┐
│  Plan   │  Prix   │ Cmd/jour │  Durée  │
├─────────┼─────────┼──────────┼─────────┤
│ 🆓 Free │   0     │    20    │    -    │
│ 🥉 Bronze│  500   │   100    │ 30j     │
│ 🥈 Argent│ 1000   │   500    │ 30j     │
│ 🥇 Or    │ 2000   │   ∞      │ 30j     │
│ 💎 Diamant│ 5000  │   ∞      │ 30j     │
│ 👑 Lifetime│15000 │   ∞      │ À VIE   │
└─────────┴─────────┴──────────┴─────────┘

*Légende:*
✅ ∞ = Illimité
💰 Prix en FCFA

━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Détails: *.premium*
🔑 Activer: *.upgrade <code>*
`;
  
  await repondre(message);
});

// ═══════════════════════════════════════════════════════════
// 👑 COMMANDES OWNER (Gestion)
// ═══════════════════════════════════════════════════════════

/**
 * .gencode - Génère un code d'activation
 */
ovlcmd({
  nom_cmd: "gencode",
  classe: "💎 Premium",
  react: "🔐",
  desc: "Génère un code premium. Usage: .gencode plan [jours]",
  alias: ["createcode", "newcode"]
}, async (hani, ms, { repondre, arg, superUser, auteurMessage }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (!arg[0]) {
    return repondre(`
❌ *Usage:* .gencode <plan> [jours]

*Plans disponibles:*
• bronze (500 FCFA)
• argent (1000 FCFA)
• or (2000 FCFA)
• diamant (5000 FCFA)
• lifetime (15000 FCFA)

*Exemples:*
.gencode or
.gencode argent 60
.gencode lifetime
`);
  }
  
  const plan = arg[0].toLowerCase();
  const days = parseInt(arg[1]) || premium.PLANS[plan]?.duration || 30;
  
  if (!premium.PLANS[plan] || plan === 'gratuit') {
    return repondre(`❌ Plan invalide: ${plan}\n\nPlans: bronze, argent, or, diamant, lifetime`);
  }
  
  const code = premium.generateCode(plan, days, auteurMessage);
  
  const message = `
╔═══════════════════════════════════╗
║     🔐 *CODE GÉNÉRÉ*              ║
╚═══════════════════════════════════╝

📋 Code: \`${code}\`

${premium.PLANS[plan].color} Plan: *${premium.PLANS[plan].name}*
💰 Valeur: *${premium.PLANS[plan].price} FCFA*
⏱️ Durée: *${days === -1 ? 'À VIE' : days + ' jours'}*

━━━━━━━━━━━━━━━━━━━━━

📤 *Pour le client:*
Envoyez ce code: ${code}
Et dites-lui d'utiliser:
*.upgrade ${code}*

━━━━━━━━━━━━━━━━━━━━━
⚠️ Ce code ne peut être utilisé qu'une seule fois!
`;
  
  await repondre(message);
});

/**
 * .gencodes - Génère plusieurs codes
 */
ovlcmd({
  nom_cmd: "gencodes",
  classe: "💎 Premium",
  react: "🔐",
  desc: "Génère plusieurs codes. Usage: .gencodes plan nombre",
  alias: ["bulkcodes"]
}, async (hani, ms, { repondre, arg, superUser, auteurMessage }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (!arg[0] || !arg[1]) {
    return repondre(`❌ *Usage:* .gencodes <plan> <nombre>\n\nExemple: .gencodes bronze 5`);
  }
  
  const plan = arg[0].toLowerCase();
  const count = Math.min(parseInt(arg[1]) || 1, 10); // Max 10
  
  if (!premium.PLANS[plan] || plan === 'gratuit') {
    return repondre(`❌ Plan invalide: ${plan}`);
  }
  
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(premium.generateCode(plan, premium.PLANS[plan].duration, auteurMessage));
  }
  
  let message = `
╔═══════════════════════════════════╗
║   🔐 *${count} CODES GÉNÉRÉS*             ║
╚═══════════════════════════════════╝

${premium.PLANS[plan].color} Plan: *${premium.PLANS[plan].name}*
💰 Valeur unitaire: *${premium.PLANS[plan].price} FCFA*

📋 *Codes:*
`;
  
  codes.forEach((code, i) => {
    message += `${i + 1}. \`${code}\`\n`;
  });
  
  message += `\n━━━━━━━━━━━━━━━━━━━━━`;
  
  await repondre(message);
});

/**
 * .listcodes - Liste les codes
 */
ovlcmd({
  nom_cmd: "listcodes",
  classe: "💎 Premium",
  react: "📋",
  desc: "Liste tous les codes premium",
  alias: ["codes", "showcodes"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  const unusedOnly = arg[0]?.toLowerCase() === 'unused';
  const codes = premium.listCodes(unusedOnly);
  
  if (codes.length === 0) {
    return repondre(unusedOnly ? "📋 Aucun code non utilisé." : "📋 Aucun code créé.");
  }
  
  let message = `
╔═══════════════════════════════════╗
║     📋 *CODES PREMIUM*            ║
╚═══════════════════════════════════╝

`;
  
  const unused = codes.filter(c => !c.used);
  const used = codes.filter(c => c.used);
  
  if (unused.length > 0) {
    message += `✅ *Non utilisés (${unused.length}):*\n`;
    unused.slice(0, 20).forEach(c => {
      message += `• \`${c.code}\` (${c.plan})\n`;
    });
    message += `\n`;
  }
  
  if (!unusedOnly && used.length > 0) {
    message += `❌ *Utilisés (${used.length}):*\n`;
    used.slice(0, 10).forEach(c => {
      message += `• \`${c.code}\` → ${c.usedBy?.split('@')[0] || 'N/A'}\n`;
    });
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━━\n💡 .listcodes unused pour les non utilisés`;
  
  await repondre(message);
});

/**
 * .delcode - Supprime un code
 */
ovlcmd({
  nom_cmd: "delcode",
  classe: "💎 Premium",
  react: "🗑️",
  desc: "Supprime un code. Usage: .delcode CODE"
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (!arg[0]) {
    return repondre("❌ Usage: .delcode CODE");
  }
  
  const code = arg[0].toUpperCase();
  const success = premium.deleteCode(code);
  
  if (success) {
    await repondre(`✅ Code \`${code}\` supprimé.`);
  } else {
    await repondre(`❌ Code \`${code}\` non trouvé.`);
  }
});

/**
 * .addpremium - Ajoute un utilisateur premium manuellement
 */
ovlcmd({
  nom_cmd: "addpremium",
  classe: "💎 Premium",
  react: "👑",
  desc: "Ajoute un premium. Usage: .addpremium @user plan [jours]",
  alias: ["setpremium", "givepremium"]
}, async (hani, ms, { repondre, arg, superUser, verifMention }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  const mentioned = verifMention;
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Mentionnez un utilisateur.\n\nUsage: .addpremium @user or [jours]");
  }
  
  const userJid = mentioned[0];
  const plan = (arg.find(a => !a.includes('@') && isNaN(a)) || 'or').toLowerCase();
  const days = parseInt(arg.find(a => !isNaN(a))) || premium.PLANS[plan]?.duration || 30;
  
  if (!premium.PLANS[plan] || plan === 'gratuit') {
    return repondre(`❌ Plan invalide: ${plan}`);
  }
  
  const result = premium.activatePremium(userJid, plan, days);
  
  if (result.success) {
    await repondre(`
✅ *Premium activé!*

👤 Utilisateur: @${userJid.split('@')[0]}
${premium.PLANS[plan].color} Plan: *${premium.PLANS[plan].name}*
⏱️ Durée: *${days === -1 ? 'À VIE' : days + ' jours'}*
`, { mentions: [userJid] });
  } else {
    await repondre(`❌ Erreur: ${result.error}`);
  }
});

/**
 * .delpremium - Révoque le premium
 */
ovlcmd({
  nom_cmd: "delpremium",
  classe: "💎 Premium",
  react: "🚫",
  desc: "Révoque le premium d'un utilisateur",
  alias: ["revokepremium", "removepremium"]
}, async (hani, ms, { repondre, verifMention, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  const mentioned = verifMention;
  if (!mentioned || mentioned.length === 0) {
    return repondre("❌ Mentionnez un utilisateur.");
  }
  
  const userJid = mentioned[0];
  const success = premium.revokePremium(userJid);
  
  if (success) {
    await repondre(`✅ Premium révoqué pour @${userJid.split('@')[0]}`, { mentions: [userJid] });
  } else {
    await repondre("❌ Utilisateur non trouvé.");
  }
});

/**
 * .premiumlist - Liste les utilisateurs premium
 */
ovlcmd({
  nom_cmd: "premiumlist",
  classe: "💎 Premium",
  react: "👥",
  desc: "Liste tous les utilisateurs premium",
  alias: ["listpremium", "vips"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  const users = premium.listPremiumUsers();
  
  if (users.length === 0) {
    return repondre("📋 Aucun utilisateur premium pour le moment.");
  }
  
  let message = `
╔═══════════════════════════════════╗
║     👥 *UTILISATEURS PREMIUM*     ║
╚═══════════════════════════════════╝

📊 Total: *${users.length}*

`;
  
  users.forEach((user, i) => {
    const phone = user.jid.split('@')[0];
    const daysLeft = user.daysLeft === -1 ? '∞' : `${user.daysLeft}j`;
    message += `${i + 1}. ${premium.PLANS[user.plan]?.color || '🔵'} +${phone}\n`;
    message += `   Plan: ${user.plan} | Expire: ${daysLeft}\n\n`;
  });
  
  await repondre(message);
});

/**
 * .premiumstats - Statistiques premium
 */
ovlcmd({
  nom_cmd: "premiumstats",
  classe: "💎 Premium",
  react: "📊",
  desc: "Statistiques du système premium",
  alias: ["pstats"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  const stats = premium.getStats();
  
  let message = `
╔═══════════════════════════════════╗
║     📊 *STATISTIQUES PREMIUM*     ║
╚═══════════════════════════════════╝

👥 *Utilisateurs:*
   Total: ${stats.totalUsers}
   Premium: ${stats.premiumUsers}

📋 *Par plan:*
`;
  
  for (const [plan, count] of Object.entries(stats.planDistribution)) {
    message += `   ${premium.PLANS[plan]?.color || '🔵'} ${plan}: ${count}\n`;
  }
  
  message += `
🔑 *Codes:*
   Non utilisés: ${stats.unusedCodes}
   Utilisés: ${stats.usedCodes}

💰 *Revenus totaux:*
   ${stats.totalRevenue.toLocaleString()} FCFA

━━━━━━━━━━━━━━━━━━━━━
`;
  
  await repondre(message);
});

/**
 * .activercode - Active un code pour un numéro spécifique
 */
ovlcmd({
  nom_cmd: "activercode",
  classe: "💎 Premium",
  react: "🎁",
  desc: "Active un code pour un client. Usage: .activercode CODE NUMERO ou @mention",
  alias: ["redeemfor", "codefor", "activerpour"]
}, async (hani, ms, { repondre, arg, superUser, verifMention }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (!arg[0]) {
    return repondre(`
❌ *Usage incorrect!*

*.activercode CODE NUMERO*
ou
*.activercode CODE @mention*

*Exemples:*
• .activercode HANI-OR-A1B2C3 22501234567
• .activercode HANI-OR-A1B2C3 +225 01 23 45 67
• .activercode HANI-OR-A1B2C3 @client

💡 Le code sera activé pour ce numéro.
   Le client n'a pas besoin d'avoir utilisé le bot avant!
`);
  }
  
  const code = arg[0].toUpperCase();
  let targetJid;
  let numeroClient;
  
  // Vérifier si c'est une mention
  if (verifMention && verifMention.length > 0) {
    targetJid = verifMention[0];
    numeroClient = targetJid.split('@')[0];
  } else if (arg[1]) {
    // Nettoyer le numéro (enlever espaces, +, tirets, etc.)
    const numero = arg.slice(1).join('').replace(/[^0-9]/g, '');
    if (numero.length < 8) {
      return repondre("❌ Numéro invalide. Entrez un numéro valide (ex: 22501234567)");
    }
    targetJid = numero + "@s.whatsapp.net";
    numeroClient = numero;
  } else {
    return repondre("❌ Précisez le numéro.\n\nExemple: .activercode HANI-OR-XXXX 22501234567");
  }
  
  // Vérifier si le numéro existe sur WhatsApp
  let isOnWhatsApp = false;
  try {
    const [result] = await hani.onWhatsApp(numeroClient);
    isOnWhatsApp = result?.exists || false;
    if (result?.jid) {
      targetJid = result.jid; // Utiliser le JID correct retourné par WhatsApp
    }
  } catch (e) {
    // Ignorer l'erreur, on suppose que le numéro est valide
    isOnWhatsApp = true;
  }
  
  if (!isOnWhatsApp) {
    return repondre(`
⚠️ *Numéro non trouvé sur WhatsApp!*

Le numéro +${numeroClient} ne semble pas être enregistré sur WhatsApp.

*Alternatives:*
1. Vérifiez le numéro avec l'indicatif pays
   Ex: 225 pour Côte d'Ivoire
   
2. Demandez au client son numéro WhatsApp exact

3. Utilisez .addpremium quand il vous contacte
`);
  }
  
  // Activer le code
  const result = premium.redeemCode(code, targetJid);
  
  if (!result.success) {
    return repondre(`❌ Erreur: ${result.error || result.message}`);
  }
  
  const planInfo = premium.PLANS[result.plan.toLowerCase()] || { color: '💎', name: result.plan, price: '?' };
  
  const message = `
╔═══════════════════════════════════╗
║   ✅ *CODE ACTIVÉ POUR CLIENT*    ║
╚═══════════════════════════════════╝

📱 Client: *+${numeroClient}*
🔑 Code: \`${code}\`

${planInfo.color} Plan: *${planInfo.name}*
💰 Valeur: *${planInfo.price} FCFA*
⏱️ Expire: ${result.expiresAt === null ? '*À VIE* 👑' : new Date(result.expiresAt).toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━

✅ Le client a maintenant accès premium!
`;
  
  await repondre(message);
  
  // Envoyer un message de confirmation au client
  try {
    await hani.sendMessage(targetJid, {
      text: `
🎉 *FÉLICITATIONS! PREMIUM ACTIVÉ!*

━━━━━━━━━━━━━━━━━━━━━━━━━━

${planInfo.color} Plan: *${planInfo.name}*
⏱️ Validité: ${result.expiresAt === null ? '*À VIE* 👑' : 'jusqu\'au ' + new Date(result.expiresAt).toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *Comment utiliser HANI-MD:*

1️⃣ Enregistre ce numéro dans tes contacts
2️⃣ Envoie *.menu* pour voir les commandes
3️⃣ Envoie *.myplan* pour voir ton abonnement

━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Fonctionnalités disponibles:*
${planInfo.features?.slice(0, 5).join('\n') || '• Toutes les commandes premium'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
Merci pour votre confiance! 💎
Besoin d'aide? Réponds à ce message.
      `.trim()
    });
    await repondre("📤 ✅ Message de bienvenue envoyé au client!");
  } catch (e) {
    await repondre(`
⚠️ *Code activé mais message non envoyé*

Le premium est bien activé pour +${numeroClient}.
Mais le message de bienvenue n'a pas pu être envoyé.

💡 Envoie-lui manuellement les infos:
• Son plan: ${planInfo.name}
• Validité: ${result.expiresAt === null ? 'À VIE' : new Date(result.expiresAt).toLocaleDateString('fr-FR')}
• Commandes: .menu et .myplan
`);
  }
});

/**
 * .premiumhelp - Aide premium owner
 */
ovlcmd({
  nom_cmd: "premiumhelp",
  classe: "💎 Premium",
  react: "❓",
  desc: "Aide pour les commandes premium owner",
  alias: ["phelp"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  const message = `
╔═══════════════════════════════════╗
║     ❓ *AIDE PREMIUM OWNER*       ║
╚═══════════════════════════════════╝

🔐 *Gestion des codes:*
.gencode <plan> [jours]
   → Génère 1 code
.gencodes <plan> <nombre>
   → Génère plusieurs codes
.listcodes [unused]
   → Liste les codes
.delcode <code>
   → Supprime un code

🎁 *Activation pour client:*
.activercode CODE NUMERO
   → Active un code pour un client
.activercode CODE @mention
   → Active pour la personne mentionnée

👤 *Gestion utilisateurs:*
.addpremium @user <plan> [jours]
   → Active premium manuellement
.delpremium @user
   → Révoque le premium
.premiumlist
   → Liste les VIPs

📊 *Statistiques:*
.premiumstats
   → Stats globales

━━━━━━━━━━━━━━━━━━━━━

*Plans:* bronze, argent, or, diamant, lifetime

*Exemple workflow:*
1. Client paye 2000 FCFA (Or)
2. .gencode or
3. .activercode HANI-OR-XXXX 22501234567
4. Le client reçoit un message de confirmation!
`;
  
  await repondre(message);
});

// ═══════════════════════════════════════════════════════════
// 🚀 DÉPLOIEMENT BOT CLIENT
// ═══════════════════════════════════════════════════════════

/**
 * .deploybot - Déploie un bot pour un client premium
 */
ovlcmd({
  nom_cmd: "deploybot",
  classe: "💎 Premium",
  react: "🚀",
  desc: "Déploie un bot pour un client. Usage: .deploybot plan NUMERO [jours]",
  alias: ["createbot", "newbot", "deployer"]
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (arg.length < 2) {
    return repondre(`
❌ *Usage incorrect!*

*.deploybot PLAN NUMERO [jours]*

*Exemples:*
• .deploybot or 22501234567
• .deploybot diamant 22501234567 60
• .deploybot lifetime 22501234567

*Plans disponibles:*
bronze, argent, or, diamant, lifetime

💡 Un lien sera envoyé au client pour qu'il connecte son WhatsApp.
`);
  }
  
  const plan = arg[0].toLowerCase();
  const numero = arg[1].replace(/[^0-9]/g, '');
  const days = parseInt(arg[2]) || (plan === 'lifetime' ? -1 : 30);
  
  // Vérifier le plan
  if (!premium.PLANS[plan] || plan === 'gratuit') {
    return repondre(`❌ Plan invalide: ${plan}\n\nPlans: bronze, argent, or, diamant, lifetime`);
  }
  
  // Vérifier le numéro
  if (numero.length < 8) {
    return repondre("❌ Numéro invalide. Entrez un numéro valide (ex: 22501234567)");
  }
  
  const targetJid = numero + "@s.whatsapp.net";
  
  // Vérifier si le numéro est sur WhatsApp
  let isOnWhatsApp = false;
  try {
    const [result] = await hani.onWhatsApp(numero);
    isOnWhatsApp = result?.exists || false;
  } catch (e) {
    isOnWhatsApp = true; // En cas d'erreur, on suppose que oui
  }
  
  if (!isOnWhatsApp) {
    return repondre(`⚠️ Le numéro +${numero} ne semble pas être sur WhatsApp.\nVérifiez le numéro et réessayez.`);
  }
  
  await repondre("🔄 *Création du bot client en cours...*");
  
  try {
    // Charger le module multi-session
    const multiSession = require('../lib/MultiSession');
    
    // Calculer la date d'expiration
    const expiresAt = days === -1 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    // Créer la session client
    const session = await multiSession.createClientSession(
      `DEPLOY-${Date.now()}`,
      plan,
      expiresAt
    );
    
    const planInfo = premium.PLANS[plan];
    const connectUrl = `http://localhost:3000/premium/connect/${session.clientId}`;
    
    // Message pour le owner
    const ownerMsg = `
╔═══════════════════════════════════╗
║    🚀 *BOT CLIENT CRÉÉ!*          ║
╚═══════════════════════════════════╝

📱 Client: *+${numero}*
🆔 ID Session: \`${session.clientId}\`

${planInfo.color} Plan: *${planInfo.name}*
💰 Valeur: *${planInfo.price} FCFA*
⏱️ Durée: *${days === -1 ? 'À VIE' : days + ' jours'}*

━━━━━━━━━━━━━━━━━━━━━

🔗 *Lien de connexion:*
${connectUrl}

📤 Ce lien a été envoyé au client.
`;
    
    await repondre(ownerMsg);
    
    // Envoyer le lien au client
    const clientMsg = `
🎉 *BIENVENUE SUR HANI-MD PREMIUM!*

Bonjour! Votre bot personnel a été créé avec succès!

━━━━━━━━━━━━━━━━━━━━━━━━━━

${planInfo.color} *Plan: ${planInfo.name}*
⏱️ Validité: ${days === -1 ? 'À VIE 👑' : days + ' jours'}

━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 *ÉTAPE SUIVANTE:*

Cliquez sur ce lien pour connecter votre WhatsApp:
${connectUrl}

*OU* ouvrez ce lien dans votre navigateur et scannez le QR code avec votre téléphone.

━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *Comment scanner ?*
1️⃣ Ouvrez WhatsApp sur votre téléphone
2️⃣ Allez dans Paramètres → Appareils liés
3️⃣ Appuyez sur "Lier un appareil"
4️⃣ Scannez le QR code sur la page

━━━━━━━━━━━━━━━━━━━━━━━━━━

Une fois connecté, vous pourrez utiliser toutes les commandes premium directement sur VOTRE WhatsApp!

Tapez *.menu* après connexion pour voir les commandes.

Merci pour votre confiance! 💎
`;
    
    await hani.sendMessage(targetJid, { text: clientMsg.trim() });
    await repondre("📤 ✅ Lien de connexion envoyé au client!");
    
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}\n\n💡 Assurez-vous que le module MultiSession est bien installé.`);
  }
});

/**
 * .botclients - Liste tous les bots clients déployés
 */
ovlcmd({
  nom_cmd: "botclients",
  classe: "💎 Premium",
  react: "📋",
  desc: "Liste tous les bots clients déployés",
  alias: ["listbots", "clientbots"]
}, async (hani, ms, { repondre, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  try {
    const multiSession = require('../lib/MultiSession');
    const clients = multiSession.listAllClients();
    const active = multiSession.getActiveClients();
    
    if (Object.keys(clients).length === 0) {
      return repondre("📋 Aucun bot client déployé.\n\nUtilisez *.deploybot plan numero* pour en créer un.");
    }
    
    let message = `
╔═══════════════════════════════════╗
║     📋 *BOTS CLIENTS DÉPLOYÉS*    ║
╚═══════════════════════════════════╝

📊 Total: ${Object.keys(clients).length}
✅ Actifs: ${active.length}

`;
    
    for (const [id, client] of Object.entries(clients)) {
      const statusIcon = client.status === 'connected' ? '✅' : 
                        client.status === 'pending' ? '⏳' :
                        client.status === 'expired' ? '⏱️' : '❌';
      
      message += `${statusIcon} *${client.plan?.toUpperCase() || 'N/A'}*\n`;
      message += `   📱 ${client.phoneNumber ? '+' + client.phoneNumber : 'Non connecté'}\n`;
      message += `   🆔 \`${id.substring(0, 15)}...\`\n`;
      message += `   ⏱️ ${client.expiresAt ? new Date(client.expiresAt).toLocaleDateString('fr-FR') : 'À VIE'}\n\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━━
💡 .stopbot ID - Arrêter un bot
💡 .deletebot ID - Supprimer un bot`;
    
    await repondre(message);
    
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

/**
 * .stopbot - Arrête un bot client
 */
ovlcmd({
  nom_cmd: "stopbot",
  classe: "💎 Premium",
  react: "🛑",
  desc: "Arrête un bot client. Usage: .stopbot ID"
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (!arg[0]) {
    return repondre("❌ Usage: .stopbot ID_CLIENT\n\nUtilisez .botclients pour voir les IDs.");
  }
  
  try {
    const multiSession = require('../lib/MultiSession');
    await multiSession.stopClientSession(arg[0]);
    await repondre(`✅ Bot client arrêté: ${arg[0]}`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

/**
 * .deletebot - Supprime un bot client
 */
ovlcmd({
  nom_cmd: "deletebot",
  classe: "💎 Premium",
  react: "🗑️",
  desc: "Supprime un bot client. Usage: .deletebot ID"
}, async (hani, ms, { repondre, arg, superUser }) => {
  if (!superUser) {
    return repondre("❌ Réservé au propriétaire du bot.");
  }
  
  if (!arg[0]) {
    return repondre("❌ Usage: .deletebot ID_CLIENT\n\nUtilisez .botclients pour voir les IDs.");
  }
  
  try {
    const multiSession = require('../lib/MultiSession');
    await multiSession.deleteClientSession(arg[0]);
    await repondre(`✅ Bot client supprimé: ${arg[0]}`);
  } catch (e) {
    await repondre(`❌ Erreur: ${e.message}`);
  }
});

console.log("[CMD] ✅ Commandes Premium chargées!");
console.log("[CMD] 🚀 Commandes Multi-Session chargées!");

