/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║        🎨 HANI-MD - SYSTÈME DE MENU STYLISÉ V2.0          ║
 * ║     Menus dynamiques selon abonnement & permissions       ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 🎨 THÈMES ET STYLES
// ═══════════════════════════════════════════════════════════

const THEMES = {
  default: {
    headerTop: '╔═══════════════════════════════╗',
    headerBot: '╚═══════════════════════════════╝',
    sectionTop: '┌─────────────────────────────┐',
    sectionMid: '│',
    sectionBot: '└─────────────────────────────┘',
    cmdPrefix: '│ ➤ ',
    line: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  },
  modern: {
    headerTop: '╭──── 🌟 ────╮',
    headerBot: '╰─────────────╯',
    sectionTop: '╭───〔 ⚡ 〕───╮',
    sectionMid: '│',
    sectionBot: '╰────────────╯',
    cmdPrefix: '│ ◈ ',
    line: '─────────────────────'
  },
  elegant: {
    headerTop: '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
    headerBot: '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛',
    sectionTop: '┌ ✦ ──────────────────────── ✦ ┐',
    sectionMid: '│',
    sectionBot: '└ ✦ ──────────────────────── ✦ ┘',
    cmdPrefix: '│  ⬧ ',
    line: '════════════════════════════════'
  }
};

// ═══════════════════════════════════════════════════════════
// 📋 DÉFINITION DES CATÉGORIES ET COMMANDES
// ═══════════════════════════════════════════════════════════

const CATEGORIES = {
  // 📥 TÉLÉCHARGEMENT - Accessible à tous
  telechargement: {
    emoji: '📥',
    name: 'Téléchargement',
    desc: 'Télécharger médias depuis les réseaux',
    accessLevel: 'all', // all, premium, owner
    commands: [
      { cmd: 'play', desc: 'Télécharger audio YouTube', usage: '.play <titre/lien>', example: '.play Rema Calm Down', premium: false },
      { cmd: 'video', desc: 'Télécharger vidéo YouTube', usage: '.video <titre/lien>', example: '.video Clip Officiel', premium: false },
      { cmd: 'tiktok', desc: 'Télécharger vidéo TikTok', usage: '.tiktok <lien>', example: '.tiktok https://vm.tiktok...', premium: false },
      { cmd: 'fb', desc: 'Télécharger vidéo Facebook', usage: '.fb <lien>', example: '.fb https://fb.watch/...', premium: false },
      { cmd: 'ig', desc: 'Télécharger depuis Instagram', usage: '.ig <lien>', example: '.ig https://instagram.com/...', premium: false },
      { cmd: 'twitter', desc: 'Télécharger vidéo Twitter/X', usage: '.twitter <lien>', example: '.twitter https://x.com/...', premium: false },
      { cmd: 'pinterest', desc: 'Télécharger image Pinterest', usage: '.pinterest <lien>', example: '.pinterest https://pin.it/...', premium: false },
      { cmd: 'spotify', desc: 'Télécharger depuis Spotify', usage: '.spotify <lien>', example: '.spotify https://open.spotify...', premium: true },
      { cmd: 'song', desc: 'Rechercher et télécharger chanson', usage: '.song <titre>', example: '.song Burna Boy Last Last', premium: false },
      { cmd: 'ytaudio', desc: 'Audio YouTube (MP3)', usage: '.ytaudio <lien>', example: '.ytaudio https://youtu.be/...', premium: false },
      { cmd: 'ytvideo', desc: 'Vidéo YouTube (MP4)', usage: '.ytvideo <lien>', example: '.ytvideo https://youtu.be/...', premium: false },
      { cmd: 'apk', desc: 'Télécharger APK', usage: '.apk <nom app>', example: '.apk WhatsApp', premium: true }
    ]
  },

  // 🤖 INTELLIGENCE ARTIFICIELLE
  ia: {
    emoji: '🤖',
    name: 'Intelligence Artificielle',
    desc: 'ChatGPT, Gemini, génération images',
    accessLevel: 'all',
    commands: [
      { cmd: 'gpt', desc: 'Discuter avec ChatGPT', usage: '.gpt <message>', example: '.gpt Explique la gravité', premium: false },
      { cmd: 'gemini', desc: 'Discuter avec Google Gemini', usage: '.gemini <message>', example: '.gemini Comment coder en Python', premium: false },
      { cmd: 'imagine', desc: 'Générer une image IA', usage: '.imagine <description>', example: '.imagine Un chat astronaute', premium: true },
      { cmd: 'dalle', desc: 'Générer image DALL-E', usage: '.dalle <description>', example: '.dalle Sunset on Mars', premium: true },
      { cmd: 'gpt4', desc: 'ChatGPT-4 (avancé)', usage: '.gpt4 <message>', example: '.gpt4 Analyse ce code', premium: true },
      { cmd: 'transcribe', desc: 'Transcrire audio en texte', usage: '.transcribe (répondre audio)', example: 'Répondre à un vocal', premium: true }
    ]
  },

  // 🔍 RECHERCHE
  recherche: {
    emoji: '🔍',
    name: 'Recherche',
    desc: 'Google, YouTube, Wikipedia, etc.',
    accessLevel: 'all',
    commands: [
      { cmd: 'google', desc: 'Rechercher sur Google', usage: '.google <recherche>', example: '.google Météo Abidjan', premium: false },
      { cmd: 'ytsearch', desc: 'Rechercher sur YouTube', usage: '.ytsearch <titre>', example: '.ytsearch Afrobeats 2024', premium: false },
      { cmd: 'wiki', desc: 'Rechercher sur Wikipedia', usage: '.wiki <sujet>', example: '.wiki Côte d\'Ivoire', premium: false },
      { cmd: 'lyrics', desc: 'Trouver paroles chanson', usage: '.lyrics <artiste> <titre>', example: '.lyrics Dadju Jaloux', premium: false },
      { cmd: 'weather', desc: 'Météo d\'une ville', usage: '.weather <ville>', example: '.weather Abidjan', premium: false },
      { cmd: 'imdb', desc: 'Infos film/série', usage: '.imdb <titre>', example: '.imdb Black Panther', premium: true },
      { cmd: 'news', desc: 'Dernières actualités', usage: '.news [pays]', example: '.news ci', premium: false }
    ]
  },

  // 🎭 FUN & JEUX
  fun: {
    emoji: '🎭',
    name: 'Fun & Jeux',
    desc: 'Divertissement et jeux',
    accessLevel: 'all',
    commands: [
      { cmd: 'dice', desc: 'Lancer un dé', usage: '.dice [faces]', example: '.dice 20', premium: false },
      { cmd: 'coinflip', desc: 'Pile ou Face', usage: '.coinflip', example: '.coinflip', premium: false },
      { cmd: '8ball', desc: 'Boule magique', usage: '.8ball <question>', example: '.8ball Vais-je réussir?', premium: false },
      { cmd: 'love', desc: 'Calcul compatibilité', usage: '.love @personne', example: '.love @marie', premium: false },
      { cmd: 'blague', desc: 'Blague aléatoire', usage: '.blague', example: '.blague', premium: false },
      { cmd: 'citation', desc: 'Citation inspirante', usage: '.citation', example: '.citation', premium: false },
      { cmd: 'slot', desc: 'Machine à sous', usage: '.slot [mise]', example: '.slot 100', premium: false },
      { cmd: 'ppc', desc: 'Pierre Papier Ciseaux', usage: '.ppc <choix>', example: '.ppc pierre', premium: false },
      { cmd: 'quiz', desc: 'Quiz culture générale', usage: '.quiz', example: '.quiz', premium: false },
      { cmd: 'devinette', desc: 'Devinette aléatoire', usage: '.devinette', example: '.devinette', premium: false },
      { cmd: 'horoscope', desc: 'Horoscope du jour', usage: '.horoscope <signe>', example: '.horoscope lion', premium: false },
      { cmd: 'couple', desc: 'Couple aléatoire du groupe', usage: '.couple', example: '.couple', premium: false }
    ]
  },

  // 🛠️ OUTILS
  outils: {
    emoji: '🛠️',
    name: 'Outils',
    desc: 'Utilitaires pratiques',
    accessLevel: 'all',
    commands: [
      { cmd: 'sticker', desc: 'Créer sticker', usage: '.sticker (sur image/vidéo)', example: 'Envoyer image avec .sticker', premium: false },
      { cmd: 'toimg', desc: 'Sticker vers image', usage: '.toimg (répondre sticker)', example: 'Répondre à un sticker', premium: false },
      { cmd: 'tts', desc: 'Texte vers audio', usage: '.tts <texte>', example: '.tts Bonjour à tous!', premium: false },
      { cmd: 'calc', desc: 'Calculatrice', usage: '.calc <opération>', example: '.calc 15*8+20', premium: false },
      { cmd: 'qrcode', desc: 'Générer QR Code', usage: '.qrcode <texte>', example: '.qrcode Mon site web', premium: false },
      { cmd: 'shorturl', desc: 'Raccourcir URL', usage: '.shorturl <lien>', example: '.shorturl https://google.com', premium: false },
      { cmd: 'translate', desc: 'Traduire texte', usage: '.translate <langue> <texte>', example: '.translate en Bonjour', premium: false },
      { cmd: 'ocr', desc: 'Lire texte sur image', usage: '.ocr (répondre image)', example: 'Répondre à une image', premium: true },
      { cmd: 'qr', desc: 'Lire un QR Code', usage: '.qr (répondre image)', example: 'Répondre à un QR', premium: false },
      { cmd: 'rappel', desc: 'Créer un rappel', usage: '.rappel <durée> <message>', example: '.rappel 10m Appeler maman', premium: false }
    ]
  },

  // 👥 GROUPE
  groupe: {
    emoji: '👥',
    name: 'Gestion Groupe',
    desc: 'Administration du groupe',
    accessLevel: 'all',
    commands: [
      { cmd: 'kick', desc: 'Expulser membre', usage: '.kick @membre', example: '.kick @spammer', premium: false, adminOnly: true },
      { cmd: 'add', desc: 'Ajouter membre', usage: '.add <numéro>', example: '.add 22512345678', premium: false, adminOnly: true },
      { cmd: 'promote', desc: 'Promouvoir admin', usage: '.promote @membre', example: '.promote @user', premium: false, adminOnly: true },
      { cmd: 'demote', desc: 'Rétrograder admin', usage: '.demote @admin', example: '.demote @ex-admin', premium: false, adminOnly: true },
      { cmd: 'tagall', desc: 'Mentionner tout le monde', usage: '.tagall [message]', example: '.tagall Réunion!', premium: false, adminOnly: true },
      { cmd: 'hidetag', desc: 'Mention cachée', usage: '.hidetag <message>', example: '.hidetag Info importante', premium: true, adminOnly: true },
      { cmd: 'link', desc: 'Lien du groupe', usage: '.link', example: '.link', premium: false, adminOnly: true },
      { cmd: 'revoke', desc: 'Révoquer lien groupe', usage: '.revoke', example: '.revoke', premium: false, adminOnly: true },
      { cmd: 'groupinfo', desc: 'Infos du groupe', usage: '.groupinfo', example: '.groupinfo', premium: false },
      { cmd: 'antilink', desc: 'Activer/Désactiver antilink', usage: '.antilink on/off', example: '.antilink on', premium: true, adminOnly: true },
      { cmd: 'antispam', desc: 'Activer/Désactiver antispam', usage: '.antispam on/off', example: '.antispam on', premium: true, adminOnly: true },
      { cmd: 'warn', desc: 'Avertir membre', usage: '.warn @membre <raison>', example: '.warn @user Spam', premium: false, adminOnly: true },
      { cmd: 'mute', desc: 'Fermer le groupe', usage: '.mute', example: '.mute', premium: false, adminOnly: true },
      { cmd: 'unmute', desc: 'Ouvrir le groupe', usage: '.unmute', example: '.unmute', premium: false, adminOnly: true },
      { cmd: 'setname', desc: 'Changer nom groupe', usage: '.setname <nom>', example: '.setname Mon Groupe', premium: false, adminOnly: true },
      { cmd: 'setdesc', desc: 'Changer description', usage: '.setdesc <desc>', example: '.setdesc Bienvenue!', premium: false, adminOnly: true },
      { cmd: 'setpp', desc: 'Changer photo groupe', usage: '.setpp (sur image)', example: 'Envoyer image avec .setpp', premium: false, adminOnly: true }
    ]
  },

  // ⚙️ SYSTÈME
  systeme: {
    emoji: '⚙️',
    name: 'Système',
    desc: 'Infos et statut du bot',
    accessLevel: 'all',
    commands: [
      { cmd: 'menu', desc: 'Afficher ce menu', usage: '.menu [catégorie]', example: '.menu fun', premium: false },
      { cmd: 'help', desc: 'Aide rapide', usage: '.help [commande]', example: '.help play', premium: false },
      { cmd: 'ping', desc: 'Vérifier latence', usage: '.ping', example: '.ping', premium: false },
      { cmd: 'uptime', desc: 'Temps en ligne', usage: '.uptime', example: '.uptime', premium: false },
      { cmd: 'botinfo', desc: 'Infos du bot', usage: '.botinfo', example: '.botinfo', premium: false },
      { cmd: 'alive', desc: 'Vérifier si en ligne', usage: '.alive', example: '.alive', premium: false },
      { cmd: 'speed', desc: 'Test de vitesse', usage: '.speed', example: '.speed', premium: false },
      { cmd: 'owner', desc: 'Contact du créateur', usage: '.owner', example: '.owner', premium: false },
      { cmd: 'report', desc: 'Signaler un bug', usage: '.report <description>', example: '.report Bug sur .play', premium: false },
      { cmd: 'suggest', desc: 'Suggérer une fonctionnalité', usage: '.suggest <idée>', example: '.suggest Ajouter Snapchat', premium: false }
    ]
  },

  // 💎 PREMIUM
  premium: {
    emoji: '💎',
    name: 'Premium',
    desc: 'Fonctionnalités Premium',
    accessLevel: 'all',
    commands: [
      { cmd: 'premium', desc: 'Voir les plans', usage: '.premium', example: '.premium', premium: false },
      { cmd: 'myplan', desc: 'Mon abonnement', usage: '.myplan', example: '.myplan', premium: false },
      { cmd: 'upgrade', desc: 'Activer code premium', usage: '.upgrade <code>', example: '.upgrade HANI-XXXX', premium: false },
      { cmd: 'connect', desc: 'Connecter mon WhatsApp', usage: '.connect', example: '.connect', premium: true },
      { cmd: 'disconnect', desc: 'Déconnecter session', usage: '.disconnect', example: '.disconnect', premium: true },
      { cmd: 'mystats', desc: 'Mes statistiques', usage: '.mystats', example: '.mystats', premium: true }
    ]
  },

  // 👑 OWNER (VISIBLE UNIQUEMENT PAR LE OWNER)
  owner: {
    emoji: '👑',
    name: 'Owner',
    desc: '⚠️ Commandes du propriétaire UNIQUEMENT',
    accessLevel: 'owner',
    commands: [
      { cmd: 'restart', desc: 'Redémarrer le bot', usage: '.restart', example: '.restart', premium: false, ownerOnly: true },
      { cmd: 'shutdown', desc: 'Arrêter le bot', usage: '.shutdown', example: '.shutdown', premium: false, ownerOnly: true },
      { cmd: 'broadcast', desc: 'Diffusion générale', usage: '.broadcast <message>', example: '.broadcast Mise à jour!', premium: false, ownerOnly: true },
      { cmd: 'leave', desc: 'Quitter un groupe', usage: '.leave', example: '.leave', premium: false, ownerOnly: true },
      { cmd: 'join', desc: 'Rejoindre un groupe', usage: '.join <lien>', example: '.join https://chat.whatsapp...', premium: false, ownerOnly: true },
      { cmd: 'ban', desc: 'Bannir utilisateur', usage: '.ban @user', example: '.ban @spammer', premium: false, ownerOnly: true },
      { cmd: 'unban', desc: 'Débannir utilisateur', usage: '.unban <numéro>', example: '.unban 22512345678', premium: false, ownerOnly: true },
      { cmd: 'sudo', desc: 'Gérer les sudo', usage: '.sudo add/remove <numéro>', example: '.sudo add 22512345678', premium: false, ownerOnly: true },
      { cmd: 'shell', desc: 'Exécuter commande shell', usage: '.shell <cmd>', example: '.shell ls -la', premium: false, ownerOnly: true },
      { cmd: 'eval', desc: 'Évaluer code JS', usage: '.eval <code>', example: '.eval 2+2', premium: false, ownerOnly: true },
      { cmd: 'setprefix', desc: 'Changer préfixe', usage: '.setprefix <symbole>', example: '.setprefix !', premium: false, ownerOnly: true },
      { cmd: 'setbotname', desc: 'Changer nom bot', usage: '.setbotname <nom>', example: '.setbotname MonBot', premium: false, ownerOnly: true },
      { cmd: 'setbio', desc: 'Changer bio bot', usage: '.setbio <bio>', example: '.setbio Bot Premium', premium: false, ownerOnly: true },
      { cmd: 'setbotpp', desc: 'Changer photo bot', usage: '.setbotpp (sur image)', example: 'Envoyer image avec .setbotpp', premium: false, ownerOnly: true },
      { cmd: 'allgroups', desc: 'Lister tous les groupes', usage: '.allgroups', example: '.allgroups', premium: false, ownerOnly: true },
      { cmd: 'stats', desc: 'Statistiques complètes', usage: '.stats', example: '.stats', premium: false, ownerOnly: true },
      { cmd: 'clearsessions', desc: 'Nettoyer sessions', usage: '.clearsessions', example: '.clearsessions', premium: false, ownerOnly: true },
      { cmd: 'block', desc: 'Bloquer utilisateur', usage: '.block @user', example: '.block @user', premium: false, ownerOnly: true },
      { cmd: 'unblock', desc: 'Débloquer utilisateur', usage: '.unblock <numéro>', example: '.unblock 22512345678', premium: false, ownerOnly: true },
      { cmd: 'mode', desc: 'Mode public/privé', usage: '.mode public/private', example: '.mode private', premium: false, ownerOnly: true }
    ]
  },

  // 💰 PAIEMENTS (OWNER ONLY)
  paiements: {
    emoji: '💰',
    name: 'Paiements',
    desc: '⚠️ Gestion des paiements (Owner)',
    accessLevel: 'owner',
    commands: [
      { cmd: 'paiements', desc: 'Voir paiements en attente', usage: '.paiements', example: '.paiements', premium: false, ownerOnly: true },
      { cmd: 'confirmpay', desc: 'Confirmer paiement', usage: '.confirmpay <orderId>', example: '.confirmpay ORD-XXXXX', premium: false, ownerOnly: true },
      { cmd: 'rejectpay', desc: 'Rejeter paiement', usage: '.rejectpay <orderId> <raison>', example: '.rejectpay ORD-XXXXX Fraude', premium: false, ownerOnly: true },
      { cmd: 'paystats', desc: 'Statistiques revenus', usage: '.paystats', example: '.paystats', premium: false, ownerOnly: true },
      { cmd: 'setpaynum', desc: 'Changer numéro paiement', usage: '.setpaynum <méthode> <numéro>', example: '.setpaynum wave +225...', premium: false, ownerOnly: true },
      { cmd: 'gencode', desc: 'Générer code premium', usage: '.gencode <plan>', example: '.gencode or', premium: false, ownerOnly: true },
      { cmd: 'activecodes', desc: 'Codes actifs', usage: '.activecodes', example: '.activecodes', premium: false, ownerOnly: true },
      { cmd: 'clients', desc: 'Liste clients premium', usage: '.clients', example: '.clients', premium: false, ownerOnly: true }
    ]
  },

  // 📷 STATUS
  status: {
    emoji: '📷',
    name: 'Status',
    desc: 'Interaction avec les status',
    accessLevel: 'all',
    commands: [
      { cmd: 'dlstatus', desc: 'Télécharger un status', usage: '.dlstatus (répondre à status)', example: 'Répondre à un status vu', premium: false },
      { cmd: 'autostatus', desc: 'Auto-vue des status', usage: '.autostatus on/off', example: '.autostatus on', premium: true },
      { cmd: 'antiviewonce', desc: 'Voir photos éphémères', usage: '.antiviewonce on/off', example: '.antiviewonce on', premium: true }
    ]
  },

  // 💵 ÉCONOMIE
  economie: {
    emoji: '💵',
    name: 'Économie',
    desc: 'Système économique virtuel',
    accessLevel: 'all',
    commands: [
      { cmd: 'daily', desc: 'Récompense quotidienne', usage: '.daily', example: '.daily', premium: false },
      { cmd: 'bank', desc: 'Mon compte en banque', usage: '.bank', example: '.bank', premium: false },
      { cmd: 'balance', desc: 'Mon portefeuille', usage: '.balance', example: '.balance', premium: false },
      { cmd: 'deposit', desc: 'Déposer en banque', usage: '.deposit <montant>', example: '.deposit 1000', premium: false },
      { cmd: 'withdraw', desc: 'Retirer de la banque', usage: '.withdraw <montant>', example: '.withdraw 500', premium: false },
      { cmd: 'transfer', desc: 'Envoyer argent', usage: '.transfer @user <montant>', example: '.transfer @ami 200', premium: false },
      { cmd: 'leaderboard', desc: 'Classement richesse', usage: '.leaderboard', example: '.leaderboard', premium: false },
      { cmd: 'work', desc: 'Travailler', usage: '.work', example: '.work', premium: false },
      { cmd: 'crime', desc: 'Commettre un délit', usage: '.crime', example: '.crime', premium: false },
      { cmd: 'rob', desc: 'Voler quelqu\'un', usage: '.rob @user', example: '.rob @victime', premium: false },
      { cmd: 'shop', desc: 'Boutique', usage: '.shop', example: '.shop', premium: false },
      { cmd: 'inventory', desc: 'Mon inventaire', usage: '.inventory', example: '.inventory', premium: false }
    ]
  },

  // 🎨 LOGOS & EFFETS
  logos: {
    emoji: '🎨',
    name: 'Logos & Effets',
    desc: 'Création de logos et effets',
    accessLevel: 'premium',
    commands: [
      { cmd: 'logo', desc: 'Générer un logo', usage: '.logo <style> <texte>', example: '.logo neon MonTexte', premium: true },
      { cmd: 'textpro', desc: 'Effet texte', usage: '.textpro <effet> <texte>', example: '.textpro 3d HANI', premium: true },
      { cmd: 'photooxy', desc: 'Effet photo', usage: '.photooxy <effet> <texte>', example: '.photooxy smoke Cool', premium: true },
      { cmd: 'ephoto', desc: 'Effets avancés', usage: '.ephoto <effet> <texte>', example: '.ephoto cyber HANI', premium: true },
      { cmd: 'quotly', desc: 'Citation stylisée', usage: '.quotly (répondre message)', example: 'Répondre à un message', premium: true }
    ]
  }
};

// ═══════════════════════════════════════════════════════════
// 🔒 NIVEAUX D'ACCÈS
// ═══════════════════════════════════════════════════════════

const ACCESS_LEVELS = {
  GUEST: { level: 0, name: 'Invité', emoji: '👤', dailyLimit: 10 },
  FREE: { level: 1, name: 'Gratuit', emoji: '🆓', dailyLimit: 30 },
  BRONZE: { level: 2, name: 'Bronze', emoji: '🥉', dailyLimit: 100 },
  ARGENT: { level: 3, name: 'Argent', emoji: '🥈', dailyLimit: 200 },
  OR: { level: 4, name: 'Or', emoji: '🥇', dailyLimit: 500 },
  DIAMANT: { level: 5, name: 'Diamant', emoji: '💎', dailyLimit: -1 },
  LIFETIME: { level: 6, name: 'Lifetime', emoji: '👑', dailyLimit: -1 },
  OWNER: { level: 10, name: 'Propriétaire', emoji: '🔱', dailyLimit: -1 }
};

// ═══════════════════════════════════════════════════════════
// 🎨 GÉNÉRATION DU MENU
// ═══════════════════════════════════════════════════════════

/**
 * Génère le menu principal stylisé
 */
function generateMainMenu(userInfo = {}) {
  const {
    name = 'Utilisateur',
    phone = '',
    plan = 'FREE',
    isOwner = false,
    isPremium = false,
    commandsToday = 0,
    dailyLimit = 30,
    theme = 'elegant'
  } = userInfo;

  const style = THEMES[theme] || THEMES.elegant;
  const accessLevel = ACCESS_LEVELS[plan.toUpperCase()] || ACCESS_LEVELS.FREE;
  const botUptime = formatUptime(process.uptime());
  const currentTime = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' });

  let menu = `
${style.headerTop}
║  🤖 *HANI-MD PREMIUM V2.6.0*  ║
${style.headerBot}

╭────「 👋 *BIENVENUE* 」────╮
│ 
│  👤 *${name}*
│  ${accessLevel.emoji} Plan: *${accessLevel.name}*
│  📊 Commandes: ${dailyLimit === -1 ? '∞ Illimité' : `${commandsToday}/${dailyLimit}`}
│  🕐 ${currentTime}
│ 
╰─────────────────────────╯

╭────「 📊 *BOT STATUS* 」────╮
│ 
│  ⚡ Latence: ~100ms
│  ⏱️ Uptime: ${botUptime}
│  💾 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB
│ 
╰─────────────────────────╯

${style.line}
      📋 *CATÉGORIES*
${style.line}

`;

  // Ajouter les catégories selon le niveau d'accès
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    // Filtrer selon l'accès
    if (cat.accessLevel === 'owner' && !isOwner) continue;
    if (cat.accessLevel === 'premium' && !isPremium && !isOwner) continue;

    const cmdCount = cat.commands.filter(c => {
      if (c.ownerOnly && !isOwner) return false;
      if (c.premium && !isPremium && !isOwner) return false;
      return true;
    }).length;

    const lockIcon = cat.accessLevel === 'owner' ? ' 🔐' : '';
    const premiumIcon = cat.accessLevel === 'premium' ? ' 💎' : '';

    menu += `│ ${cat.emoji} *.menu ${key}*${lockIcon}${premiumIcon}\n`;
    menu += `│    ↳ ${cat.desc} (${cmdCount} cmds)\n│\n`;
  }

  menu += `
${style.line}

💡 *ASTUCES:*
├ *.menu <catégorie>* → Détails
├ *.help <commande>* → Aide
└ *.premium* → Débloquer tout

`;

  if (!isPremium && !isOwner) {
    menu += `
╭─「 💎 *PASSEZ PREMIUM!* 」─╮
│                           
│  🔓 Débloquez +50 commandes
│  ⚡ Accès illimité
│  🤖 Votre propre bot WhatsApp
│  📱 Support prioritaire
│                           
│  Tapez *.premium* pour voir
│  les offres dès 500 FCFA!
│                           
╰───────────────────────────╯
`;
  }

  menu += `
${style.line}
  🌐 *Support:* wa.me/2250150252467
  ⭐ *Powered by HANI-MD*
${style.line}
`;

  return menu;
}

/**
 * Génère le menu d'une catégorie spécifique
 */
function generateCategoryMenu(categoryKey, userInfo = {}) {
  const {
    plan = 'FREE',
    isOwner = false,
    isPremium = false,
    theme = 'elegant'
  } = userInfo;

  const style = THEMES[theme] || THEMES.elegant;
  const category = CATEGORIES[categoryKey.toLowerCase()];

  if (!category) {
    return `❌ *Catégorie inconnue!*\n\nCatégories disponibles:\n${Object.keys(CATEGORIES).map(k => `• ${k}`).join('\n')}`;
  }

  // Vérifier l'accès
  if (category.accessLevel === 'owner' && !isOwner) {
    return `🔐 *Accès Refusé*\n\nCette catégorie est réservée au propriétaire du bot.`;
  }

  if (category.accessLevel === 'premium' && !isPremium && !isOwner) {
    return `💎 *Contenu Premium*\n\nCette catégorie nécessite un abonnement premium.\n\nTapez *.premium* pour voir les offres!`;
  }

  let menu = `
${style.headerTop}
║  ${category.emoji} *${category.name.toUpperCase()}*  ║
${style.headerBot}

📝 ${category.desc}

${style.line}
`;

  // Trier les commandes
  const availableCommands = category.commands.filter(cmd => {
    if (cmd.ownerOnly && !isOwner) return false;
    return true;
  });

  for (const cmd of availableCommands) {
    const premiumBadge = cmd.premium && !isPremium && !isOwner ? ' 💎' : '';
    const adminBadge = cmd.adminOnly ? ' 👑' : '';
    const ownerBadge = cmd.ownerOnly ? ' 🔐' : '';
    const locked = (cmd.premium && !isPremium && !isOwner) ? ' *(Premium)*' : '';

    menu += `\n┌ *.${cmd.cmd}*${premiumBadge}${adminBadge}${ownerBadge}\n`;
    menu += `│  📝 ${cmd.desc}${locked}\n`;
    menu += `│  📋 ${cmd.usage}\n`;
    menu += `└  💡 Ex: ${cmd.example}\n`;
  }

  menu += `
${style.line}

📊 Total: ${availableCommands.length} commandes
💡 *.menu* → Retour au menu principal

${style.line}
  ⭐ *Powered by HANI-MD*
`;

  return menu;
}

/**
 * Génère l'aide pour une commande spécifique
 */
function generateCommandHelp(cmdName, userInfo = {}) {
  const {
    plan = 'FREE',
    isOwner = false,
    isPremium = false
  } = userInfo;

  // Rechercher la commande
  for (const [catKey, category] of Object.entries(CATEGORIES)) {
    for (const cmd of category.commands) {
      if (cmd.cmd.toLowerCase() === cmdName.toLowerCase()) {
        // Vérifier l'accès
        if (cmd.ownerOnly && !isOwner) {
          return `🔐 *Accès Refusé*\n\nCette commande est réservée au propriétaire du bot.`;
        }

        const locked = cmd.premium && !isPremium && !isOwner;

        let help = `
╭────「 ❓ *AIDE COMMANDE* 」────╮
│
│  📌 Commande: *.${cmd.cmd}*
│  📁 Catégorie: ${category.emoji} ${category.name}
│  ${locked ? '🔒 Statut: Premium requis' : '🔓 Statut: Accessible'}
│
╰───────────────────────────────╯

📝 *Description:*
${cmd.desc}

📋 *Utilisation:*
${cmd.usage}

💡 *Exemple:*
${cmd.example}
`;

        if (locked) {
          help += `
╭──「 💎 *PREMIUM REQUIS* 」──╮
│                            
│  Cette commande nécessite   
│  un abonnement premium.     
│                            
│  Tapez *.premium* pour     
│  voir les offres!          
│                            
╰────────────────────────────╯
`;
        }

        return help;
      }
    }
  }

  return `❌ *Commande inconnue: ${cmdName}*\n\nTapez *.menu* pour voir les commandes disponibles.`;
}

/**
 * Vérifie si l'utilisateur peut utiliser une commande
 */
function canUseCommand(cmdName, userInfo = {}) {
  const {
    plan = 'FREE',
    isOwner = false,
    isPremium = false,
    isAdmin = false,
    commandsToday = 0,
    dailyLimit = 30
  } = userInfo;

  // Rechercher la commande
  for (const [catKey, category] of Object.entries(CATEGORIES)) {
    for (const cmd of category.commands) {
      if (cmd.cmd.toLowerCase() === cmdName.toLowerCase()) {
        // Commandes owner uniquement
        if (cmd.ownerOnly && !isOwner) {
          return {
            allowed: false,
            reason: 'owner_only',
            message: `🔐 Cette commande est réservée au propriétaire du bot.`
          };
        }

        // Commandes admin uniquement
        if (cmd.adminOnly && !isAdmin && !isOwner) {
          return {
            allowed: false,
            reason: 'admin_only',
            message: `👑 Cette commande est réservée aux administrateurs du groupe.`
          };
        }

        // Commandes premium uniquement
        if (cmd.premium && !isPremium && !isOwner) {
          return {
            allowed: false,
            reason: 'premium_only',
            message: `💎 *Commande Premium*\n\nCette commande nécessite un abonnement premium.\n\n📱 Tapez *.premium* pour voir les offres!`
          };
        }

        // Vérifier la limite quotidienne
        if (dailyLimit !== -1 && commandsToday >= dailyLimit) {
          return {
            allowed: false,
            reason: 'daily_limit',
            message: `⚠️ *Limite quotidienne atteinte!*\n\nVous avez utilisé ${commandsToday}/${dailyLimit} commandes aujourd'hui.\n\n💎 Passez à Premium pour un accès illimité!\nTapez *.premium* pour en savoir plus.`
          };
        }

        // Accès autorisé
        return {
          allowed: true,
          reason: 'ok',
          command: cmd,
          category: category
        };
      }
    }
  }

  // Commande non trouvée
  return {
    allowed: false,
    reason: 'not_found',
    message: `❌ Commande inconnue: *.${cmdName}*\n\nTapez *.menu* pour voir les commandes disponibles.`
  };
}

/**
 * Génère une réponse stylisée pour les erreurs
 */
function generateErrorResponse(type, details = {}) {
  switch (type) {
    case 'not_found':
      return `
╭────「 ❌ *ERREUR* 」────╮
│
│  Commande non trouvée!
│
│  💡 Tapez *.menu* pour voir
│  les commandes disponibles.
│
╰─────────────────────────╯`;

    case 'premium_only':
      return `
╭────「 💎 *PREMIUM REQUIS* 」────╮
│
│  Cette fonctionnalité est
│  réservée aux membres premium.
│
│  🎁 Offres dès 500 FCFA/mois
│
│  Tapez *.premium* pour
│  découvrir nos plans!
│
╰─────────────────────────────────╯`;

    case 'owner_only':
      return `
╭────「 🔐 *ACCÈS REFUSÉ* 」────╮
│
│  Cette commande est réservée
│  au propriétaire du bot.
│
╰──────────────────────────────╯`;

    case 'admin_only':
      return `
╭────「 👑 *ADMIN REQUIS* 」────╮
│
│  Cette commande est réservée
│  aux administrateurs du groupe.
│
╰───────────────────────────────╯`;

    case 'daily_limit':
      return `
╭────「 ⚠️ *LIMITE ATTEINTE* 」────╮
│
│  Vous avez atteint votre limite
│  quotidienne de commandes.
│
│  📊 ${details.used || 0}/${details.limit || 30} utilisées
│
│  💎 Passez Premium pour
│  un accès ILLIMITÉ!
│
│  Tapez *.premium*
│
╰──────────────────────────────────╯`;

    case 'group_only':
      return `
╭────「 👥 *GROUPE REQUIS* 」────╮
│
│  Cette commande fonctionne
│  uniquement dans les groupes.
│
╰───────────────────────────────╯`;

    case 'private_only':
      return `
╭────「 🔒 *PRIVÉ REQUIS* 」────╮
│
│  Cette commande fonctionne
│  uniquement en messages privés.
│
╰───────────────────────────────╯`;

    case 'cooldown':
      return `
╭────「 ⏳ *PATIENCE* 」────╮
│
│  Veuillez patienter ${details.remaining || 5}s
│  avant de réutiliser cette commande.
│
╰────────────────────────────╯`;

    default:
      return `
╭────「 ❌ *ERREUR* 」────╮
│
│  Une erreur s'est produite.
│  ${details.message || 'Réessayez plus tard.'}
│
╰─────────────────────────╯`;
  }
}

/**
 * Génère une réponse de succès stylisée
 */
function generateSuccessResponse(type, details = {}) {
  switch (type) {
    case 'command_executed':
      return null; // Les commandes gèrent leur propre réponse

    case 'premium_activated':
      return `
╭────「 🎉 *FÉLICITATIONS!* 」────╮
│
│  Votre abonnement Premium
│  est maintenant activé!
│
│  ${details.planEmoji || '💎'} Plan: *${details.plan || 'Premium'}*
│  ⏱️ Durée: ${details.duration || '30 jours'}
│  🔓 Toutes les commandes débloquées!
│
╰──────────────────────────────────╯

💡 Tapez *.menu* pour découvrir
toutes vos nouvelles fonctionnalités!`;

    case 'action_completed':
      return `
╭────「 ✅ *SUCCÈS* 」────╮
│
│  ${details.message || 'Action effectuée avec succès!'}
│
╰─────────────────────────╯`;

    default:
      return `✅ ${details.message || 'Succès!'}`;
  }
}

// ═══════════════════════════════════════════════════════════
// 🔧 UTILITAIRES
// ═══════════════════════════════════════════════════════════

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let result = '';
  if (days > 0) result += `${days}j `;
  if (hours > 0) result += `${hours}h `;
  result += `${minutes}m`;
  
  return result;
}

function getCategories() {
  return CATEGORIES;
}

function getAccessLevels() {
  return ACCESS_LEVELS;
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  generateMainMenu,
  generateCategoryMenu,
  generateCommandHelp,
  canUseCommand,
  generateErrorResponse,
  generateSuccessResponse,
  getCategories,
  getAccessLevels,
  CATEGORIES,
  ACCESS_LEVELS,
  THEMES
};

console.log('[MENU] ✅ MenuSystem.js chargé - Système de menu stylisé v2.0');
