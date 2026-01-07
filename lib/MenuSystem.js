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
      { cmd: 'ytaudio', desc: 'Télécharger audio YouTube', usage: '.ytaudio <titre/lien>', example: '.ytaudio Rema Calm Down', premium: false },
      { cmd: 'ytvideo', desc: 'Télécharger vidéo YouTube', usage: '.ytvideo <titre/lien>', example: '.ytvideo Clip Officiel', premium: false },
      { cmd: 'tiktokdl', desc: 'Télécharger vidéo TikTok', usage: '.tiktokdl <lien>', example: '.tiktokdl https://vm.tiktok...', premium: false },
      { cmd: 'fbvideo', desc: 'Télécharger vidéo Facebook', usage: '.fbvideo <lien>', example: '.fbvideo https://fb.watch/...', premium: false },
      { cmd: 'igdownload', desc: 'Télécharger depuis Instagram', usage: '.igdownload <lien>', example: '.igdownload https://instagram.com/...', premium: false },
      { cmd: 'twitterdl', desc: 'Télécharger vidéo Twitter/X', usage: '.twitterdl <lien>', example: '.twitterdl https://x.com/...', premium: false },
      { cmd: 'pinterestdl', desc: 'Télécharger image Pinterest', usage: '.pinterestdl <lien>', example: '.pinterestdl https://pin.it/...', premium: false },
      { cmd: 'spotifydownload', desc: 'Télécharger depuis Spotify', usage: '.spotifydownload <lien>', example: '.spotifydownload https://open.spotify...', premium: true },
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
      { cmd: 'dalle', desc: 'Générer image DALL-E', usage: '.dalle <description>', example: '.dalle Sunset on Mars', premium: true },
      { cmd: 'summarize', desc: 'Résumer un texte', usage: '.summarize <texte>', example: '.summarize [long texte]', premium: false },
      { cmd: 'code', desc: 'Générer du code', usage: '.code <description>', example: '.code fonction Python tri', premium: true },
      { cmd: 'aitranslate', desc: 'Traduire avec IA', usage: '.aitranslate <langue> <texte>', example: '.aitranslate en Bonjour', premium: false },
      { cmd: 'aiquiz', desc: 'Quiz généré par IA', usage: '.aiquiz <sujet>', example: '.aiquiz histoire', premium: false },
      { cmd: 'story', desc: 'Générer une histoire', usage: '.story <thème>', example: '.story aventure spatiale', premium: true }
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
      { cmd: 'wikipedia', desc: 'Rechercher sur Wikipedia', usage: '.wikipedia <sujet>', example: '.wikipedia Côte d\'Ivoire', premium: false },
      { cmd: 'lyrics', desc: 'Trouver paroles chanson', usage: '.lyrics <artiste> <titre>', example: '.lyrics Dadju Jaloux', premium: false },
      { cmd: 'weather', desc: 'Météo d\'une ville', usage: '.weather <ville>', example: '.weather Abidjan', premium: false },
      { cmd: 'movie', desc: 'Infos film/série', usage: '.movie <titre>', example: '.movie Black Panther', premium: false },
      { cmd: 'news', desc: 'Dernières actualités', usage: '.news [pays]', example: '.news ci', premium: false },
      { cmd: 'image', desc: 'Rechercher images', usage: '.image <recherche>', example: '.image chat mignon', premium: false }
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
      { cmd: 'love', desc: 'Calcul compatibilité', usage: '.love Nom1 + Nom2', example: '.love Marie + Paul', premium: false },
      { cmd: 'blague', desc: 'Blague aléatoire', usage: '.blague', example: '.blague', premium: false },
      { cmd: 'citation', desc: 'Citation inspirante', usage: '.citation', example: '.citation', premium: false },
      { cmd: 'slot', desc: 'Machine à sous', usage: '.slot [mise]', example: '.slot 100', premium: false },
      { cmd: 'ppc', desc: 'Pierre Papier Ciseaux', usage: '.ppc <choix>', example: '.ppc pierre', premium: false },
      { cmd: 'quiz', desc: 'Quiz culture générale', usage: '.quiz', example: '.quiz', premium: false },
      { cmd: 'horoscope', desc: 'Horoscope du jour', usage: '.horoscope <signe>', example: '.horoscope lion', premium: false },
      { cmd: 'rps', desc: 'Rock Paper Scissors', usage: '.rps <choix>', example: '.rps rock', premium: false },
      { cmd: 'blackjack', desc: 'Jeu de Blackjack', usage: '.blackjack [mise]', example: '.blackjack 50', premium: false },
      { cmd: 'guess', desc: 'Deviner un nombre', usage: '.guess', example: '.guess', premium: false },
      { cmd: 'scramble', desc: 'Mots mélangés', usage: '.scramble', example: '.scramble', premium: false },
      { cmd: 'duel', desc: 'Duel avec quelqu\'un', usage: '.duel @user', example: '.duel @ami', premium: false },
      { cmd: 'tictactoe', desc: 'Morpion', usage: '.tictactoe @user', example: '.tictactoe @ami', premium: false },
      { cmd: 'vod', desc: 'Vérité ou Défi', usage: '.vod', example: '.vod', premium: false }
    ]
  },

  // 🛠️ OUTILS
  outils: {
    emoji: '🛠️',
    name: 'Outils',
    desc: 'Utilitaires pratiques',
    accessLevel: 'all',
    commands: [
      { cmd: 's', desc: 'Créer sticker', usage: '.s (sur image/vidéo)', example: 'Envoyer image avec .s', premium: false },
      { cmd: 'toimage', desc: 'Sticker vers image', usage: '.toimage (répondre sticker)', example: 'Répondre à un sticker', premium: false },
      { cmd: 'toaudio', desc: 'Vidéo vers audio', usage: '.toaudio (répondre vidéo)', example: 'Répondre à une vidéo', premium: false },
      { cmd: 'tts2', desc: 'Texte vers audio', usage: '.tts2 <texte>', example: '.tts2 Bonjour à tous!', premium: false },
      { cmd: 'calculate', desc: 'Calculatrice', usage: '.calculate <opération>', example: '.calculate 15*8+20', premium: false },
      { cmd: 'qrcode', desc: 'Générer QR Code', usage: '.qrcode <texte>', example: '.qrcode Mon site web', premium: false },
      { cmd: 'shorturl', desc: 'Raccourcir URL', usage: '.shorturl <lien>', example: '.shorturl https://google.com', premium: false },
      { cmd: 'translate', desc: 'Traduire texte', usage: '.translate <langue> <texte>', example: '.translate en Bonjour', premium: false },
      { cmd: 'password', desc: 'Générer mot de passe', usage: '.password [longueur]', example: '.password 16', premium: false },
      { cmd: 'base64', desc: 'Encoder/Décoder Base64', usage: '.base64 encode/decode <texte>', example: '.base64 encode Hello', premium: false },
      { cmd: 'datetime', desc: 'Date et heure', usage: '.datetime [ville]', example: '.datetime Paris', premium: false }
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
      { cmd: 'grouplink', desc: 'Lien du groupe', usage: '.grouplink', example: '.grouplink', premium: false, adminOnly: true },
      { cmd: 'revoke', desc: 'Révoquer lien groupe', usage: '.revoke', example: '.revoke', premium: false, adminOnly: true },
      { cmd: 'groupinfo', desc: 'Infos du groupe', usage: '.groupinfo', example: '.groupinfo', premium: false },
      { cmd: 'antilink', desc: 'Activer/Désactiver antilink', usage: '.antilink on/off', example: '.antilink on', premium: false, adminOnly: true },
      { cmd: 'setname', desc: 'Changer nom groupe', usage: '.setname <nom>', example: '.setname Mon Groupe', premium: false, adminOnly: true },
      { cmd: 'setdesc', desc: 'Changer description', usage: '.setdesc <desc>', example: '.setdesc Bienvenue!', premium: false, adminOnly: true },
      { cmd: 'groupopen', desc: 'Ouvrir le groupe', usage: '.groupopen', example: '.groupopen', premium: false, adminOnly: true },
      { cmd: 'groupclose', desc: 'Fermer le groupe', usage: '.groupclose', example: '.groupclose', premium: false, adminOnly: true },
      { cmd: 'adminlist', desc: 'Liste des admins', usage: '.adminlist', example: '.adminlist', premium: false },
      { cmd: 'memberlist', desc: 'Liste des membres', usage: '.memberlist', example: '.memberlist', premium: false }
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
      { cmd: 'sysinfo', desc: 'Infos système', usage: '.sysinfo', example: '.sysinfo', premium: false },
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
      { cmd: 'abonnement', desc: 'S\'abonner avec Wave', usage: '.abonnement', example: '.abonnement', premium: false },
      { cmd: 'activer', desc: 'Activer code premium', usage: '.activer <code>', example: '.activer HANI-OR-XXXX', premium: false },
      { cmd: 'monplan', desc: 'Mon abonnement actuel', usage: '.monplan', example: '.monplan', premium: false },
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
      { cmd: 'ban', desc: 'Bannir utilisateur', usage: '.ban @user', example: '.ban @spammer', premium: false, ownerOnly: true },
      { cmd: 'unban', desc: 'Débannir utilisateur', usage: '.unban <numéro>', example: '.unban 22512345678', premium: false, ownerOnly: true },
      { cmd: 'addsudo', desc: 'Ajouter sudo', usage: '.addsudo <numéro>', example: '.addsudo 22512345678', premium: false, ownerOnly: true },
      { cmd: 'delsudo', desc: 'Retirer sudo', usage: '.delsudo <numéro>', example: '.delsudo 22512345678', premium: false, ownerOnly: true },
      { cmd: 'listsudo', desc: 'Liste des sudo', usage: '.listsudo', example: '.listsudo', premium: false, ownerOnly: true },
      { cmd: 'shell', desc: 'Exécuter commande shell', usage: '.shell <cmd>', example: '.shell ls -la', premium: false, ownerOnly: true },
      { cmd: 'setprefix', desc: 'Changer préfixe', usage: '.setprefix <symbole>', example: '.setprefix !', premium: false, ownerOnly: true },
      { cmd: 'public', desc: 'Mode public', usage: '.public', example: '.public', premium: false, ownerOnly: true },
      { cmd: 'private', desc: 'Mode privé', usage: '.private', example: '.private', premium: false, ownerOnly: true },
      { cmd: 'stats', desc: 'Statistiques complètes', usage: '.stats', example: '.stats', premium: false, ownerOnly: true },
      { cmd: 'protect', desc: 'Activer protections groupe', usage: '.protect on/off', example: '.protect on', premium: false, ownerOnly: true },
      { cmd: 'lockdown', desc: 'Mode urgence groupe', usage: '.lockdown', example: '.lockdown', premium: false, ownerOnly: true },
      { cmd: 'unlock', desc: 'Désactiver mode urgence', usage: '.unlock', example: '.unlock', premium: false, ownerOnly: true }
    ]
  },

  // 💰 PAIEMENTS WAVE (OWNER ONLY)
  paiements: {
    emoji: '💰',
    name: 'Paiements Wave',
    desc: '⚠️ Gestion des paiements Wave (Owner)',
    accessLevel: 'owner',
    commands: [
      { cmd: 'wavepending', desc: 'Paiements en attente', usage: '.wavepending', example: '.wavepending', premium: false, ownerOnly: true },
      { cmd: 'waveconfirm', desc: 'Confirmer paiement Wave', usage: '.waveconfirm <ref>', example: '.waveconfirm HANI-A1B2C3D4', premium: false, ownerOnly: true },
      { cmd: 'wavestats', desc: 'Statistiques Wave', usage: '.wavestats', example: '.wavestats', premium: false, ownerOnly: true },
      { cmd: 'wavesearch', desc: 'Rechercher abonné', usage: '.wavesearch <nom/tel>', example: '.wavesearch Jean', premium: false, ownerOnly: true },
      { cmd: 'waveall', desc: 'Liste tous les abonnés', usage: '.waveall [statut]', example: '.waveall active', premium: false, ownerOnly: true },
      { cmd: 'pendingpays', desc: 'Voir paiements en attente', usage: '.pendingpays', example: '.pendingpays', premium: false, ownerOnly: true },
      { cmd: 'validatepay', desc: 'Confirmer paiement', usage: '.validatepay <orderId>', example: '.validatepay ORD-XXXXX', premium: false, ownerOnly: true },
      { cmd: 'rejectpay', desc: 'Rejeter paiement', usage: '.rejectpay <orderId> <raison>', example: '.rejectpay ORD-XXXXX Fraude', premium: false, ownerOnly: true },
      { cmd: 'paymentstats', desc: 'Statistiques revenus', usage: '.paymentstats', example: '.paymentstats', premium: false, ownerOnly: true },
      { cmd: 'clients', desc: 'Liste clients premium', usage: '.clients', example: '.clients', premium: false, ownerOnly: true },
      { cmd: 'giftplan', desc: 'Offrir un plan', usage: '.giftplan <numéro> <plan>', example: '.giftplan 22512345678 or', premium: false, ownerOnly: true },
      { cmd: 'gencode', desc: 'Générer code premium', usage: '.gencode <plan>', example: '.gencode or', premium: false, ownerOnly: true }
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
      { cmd: 'autoview', desc: 'Auto-vue des status', usage: '.autoview on/off', example: '.autoview on', premium: true },
      { cmd: 'autoreact', desc: 'Auto-réaction status', usage: '.autoreact on/off', example: '.autoreact on', premium: true },
      { cmd: 'statustext', desc: 'Poster statut texte', usage: '.statustext <texte>', example: '.statustext Salut!', premium: false },
      { cmd: 'statusimg', desc: 'Poster statut image', usage: '.statusimg (sur image)', example: 'Envoyer image avec .statusimg', premium: false },
      { cmd: 'statusvid', desc: 'Poster statut vidéo', usage: '.statusvid (sur vidéo)', example: 'Envoyer vidéo avec .statusvid', premium: false },
      { cmd: 'statusaudio', desc: 'Poster statut audio', usage: '.statusaudio (sur audio)', example: 'Envoyer audio avec .statusaudio', premium: false }
    ]
  },

  // 💵 ÉCONOMIE
  economie: {
    emoji: '💵',
    name: 'Économie',
    desc: 'Système économique virtuel',
    accessLevel: 'all',
    commands: [
      { cmd: 'register', desc: 'Créer un compte', usage: '.register', example: '.register', premium: false },
      { cmd: 'daily', desc: 'Récompense quotidienne', usage: '.daily', example: '.daily', premium: false },
      { cmd: 'balance', desc: 'Mon portefeuille', usage: '.balance', example: '.balance', premium: false },
      { cmd: 'deposit', desc: 'Déposer en banque', usage: '.deposit <montant>', example: '.deposit 1000', premium: false },
      { cmd: 'withdraw', desc: 'Retirer de la banque', usage: '.withdraw <montant>', example: '.withdraw 500', premium: false },
      { cmd: 'transfer', desc: 'Envoyer argent', usage: '.transfer @user <montant>', example: '.transfer @ami 200', premium: false },
      { cmd: 'leaderboard', desc: 'Classement richesse', usage: '.leaderboard', example: '.leaderboard', premium: false },
      { cmd: 'work', desc: 'Travailler', usage: '.work', example: '.work', premium: false },
      { cmd: 'gamble', desc: 'Parier coins', usage: '.gamble <montant>', example: '.gamble 100', premium: false },
      { cmd: 'fish', desc: 'Aller pêcher', usage: '.fish', example: '.fish', premium: false },
      { cmd: 'hunt', desc: 'Aller chasser', usage: '.hunt', example: '.hunt', premium: false }
    ]
  },

  // 🎨 LOGOS & EFFETS
  logos: {
    emoji: '🎨',
    name: 'Logos & Effets',
    desc: 'Création de logos et effets',
    accessLevel: 'all',
    commands: [
      { cmd: 'fire', desc: 'Logo style feu', usage: '.fire <texte>', example: '.fire MonTexte', premium: false },
      { cmd: 'ice', desc: 'Logo style glace', usage: '.ice <texte>', example: '.ice MonTexte', premium: false },
      { cmd: 'neon', desc: 'Logo style néon', usage: '.neon <texte>', example: '.neon MonTexte', premium: false },
      { cmd: 'thunder', desc: 'Logo style électrique', usage: '.thunder <texte>', example: '.thunder MonTexte', premium: false },
      { cmd: 'gaming', desc: 'Logo style gaming', usage: '.gaming <texte>', example: '.gaming MonTexte', premium: false },
      { cmd: 'diamond', desc: 'Logo style diamant', usage: '.diamond <texte>', example: '.diamond MonTexte', premium: false },
      { cmd: '3dlogo', desc: 'Logo style 3D', usage: '.3dlogo <texte>', example: '.3dlogo MonTexte', premium: false },
      { cmd: 'galaxy', desc: 'Logo style galaxie', usage: '.galaxy <texte>', example: '.galaxy MonTexte', premium: false },
      { cmd: 'blood', desc: 'Logo style sang', usage: '.blood <texte>', example: '.blood MonTexte', premium: false },
      { cmd: 'gold', desc: 'Logo style or', usage: '.gold <texte>', example: '.gold MonTexte', premium: false },
      { cmd: 'graffiti', desc: 'Logo style graffiti', usage: '.graffiti <texte>', example: '.graffiti MonTexte', premium: false },
      { cmd: 'water', desc: 'Logo style eau', usage: '.water <texte>', example: '.water MonTexte', premium: false },
      { cmd: 'logolist', desc: 'Liste des styles', usage: '.logolist', example: '.logolist', premium: false }
    ]
  },

  // 🎵 EFFETS AUDIO
  audio: {
    emoji: '🎵',
    name: 'Effets Audio',
    desc: 'Modifier des audios (nécessite FFmpeg)',
    accessLevel: 'all',
    commands: [
      { cmd: 'bass', desc: 'Ajouter des basses', usage: '.bass (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'slow', desc: 'Ralentir audio', usage: '.slow (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'fast', desc: 'Accélérer audio', usage: '.fast (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'chipmunk', desc: 'Voix chipmunk', usage: '.chipmunk (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'deep', desc: 'Voix grave', usage: '.deep (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'reverb', desc: 'Ajouter reverb', usage: '.reverb (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: '8d', desc: 'Effet 8D', usage: '.8d (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'robot', desc: 'Voix robot', usage: '.robot (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'karaoke', desc: 'Supprimer voix', usage: '.karaoke (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'loud', desc: 'Augmenter volume', usage: '.loud (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'telephone', desc: 'Effet téléphone', usage: '.telephone (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'underwater', desc: 'Effet sous l\'eau', usage: '.underwater (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'vibrato', desc: 'Effet vibrato', usage: '.vibrato (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'treble', desc: 'Augmenter aigus', usage: '.treble (répondre audio)', example: 'Répondre à un audio', premium: false },
      { cmd: 'reverse', desc: 'Inverser audio', usage: '.reverse (répondre audio)', example: 'Répondre à un audio', premium: false }
    ]
  },

  // 🖼️ ÉDITION IMAGE
  images: {
    emoji: '🖼️',
    name: 'Édition Image',
    desc: 'Modifier des images avec Jimp',
    accessLevel: 'all',
    commands: [
      { cmd: 'removebg', desc: 'Supprimer fond', usage: '.removebg (répondre image)', example: 'Répondre à une image', premium: true },
      { cmd: 'blur', desc: 'Flouter image', usage: '.blur [intensité] (répondre image)', example: '.blur 5', premium: false },
      { cmd: 'grayscale', desc: 'Noir et blanc', usage: '.grayscale (répondre image)', example: 'Répondre à une image', premium: false },
      { cmd: 'invert', desc: 'Inverser couleurs', usage: '.invert (répondre image)', example: 'Répondre à une image', premium: false },
      { cmd: 'mirror', desc: 'Effet miroir', usage: '.mirror (répondre image)', example: 'Répondre à une image', premium: false },
      { cmd: 'rotate', desc: 'Rotation image', usage: '.rotate <degrés> (répondre image)', example: '.rotate 90', premium: false },
      { cmd: 'sepia', desc: 'Effet vintage', usage: '.sepia (répondre image)', example: 'Répondre à une image', premium: false },
      { cmd: 'brightness', desc: 'Ajuster luminosité', usage: '.brightness [-1 à 1] (répondre image)', example: '.brightness 0.3', premium: false },
      { cmd: 'contrast', desc: 'Ajuster contraste', usage: '.contrast [-1 à 1] (répondre image)', example: '.contrast 0.3', premium: false },
      { cmd: 'posterize', desc: 'Effet poster', usage: '.posterize [niveau] (répondre image)', example: '.posterize 5', premium: false },
      { cmd: 'pixelate', desc: 'Pixeliser', usage: '.pixelate [taille] (répondre image)', example: '.pixelate 10', premium: false },
      { cmd: 'circle', desc: 'Rogner en cercle', usage: '.circle (répondre image)', example: 'Répondre à une image', premium: false },
      { cmd: 'resize', desc: 'Redimensionner', usage: '.resize <largeur> [hauteur]', example: '.resize 512', premium: false },
      { cmd: 'enhance', desc: 'Améliorer qualité', usage: '.enhance (répondre image)', example: 'Répondre à une image', premium: false },
      { cmd: 'cartoon', desc: 'Effet cartoon', usage: '.cartoon (répondre image)', example: 'Répondre à une image', premium: false }
    ]
  },

  // 😀 RÉACTIONS
  reactions: {
    emoji: '😀',
    name: 'Réactions',
    desc: 'Réagir aux messages',
    accessLevel: 'all',
    commands: [
      { cmd: 'react', desc: 'Réagir avec emoji', usage: '.react <emoji>', example: '.react 🔥', premium: false },
      { cmd: 'like', desc: 'Réaction like', usage: '.like (répondre message)', example: 'Répondre à un message', premium: false },
      { cmd: 'lol', desc: 'Réaction MDR', usage: '.lol (répondre message)', example: 'Répondre à un message', premium: false },
      { cmd: 'ok', desc: 'Réaction OK', usage: '.ok (répondre message)', example: 'Répondre à un message', premium: false },
      { cmd: 'feu', desc: 'Réaction 🔥', usage: '.feu (répondre message)', example: 'Répondre à un message', premium: false },
      { cmd: 'sad', desc: 'Réaction triste', usage: '.sad (répondre message)', example: 'Répondre à un message', premium: false },
      { cmd: 'unreact', desc: 'Retirer réaction', usage: '.unreact (répondre message)', example: 'Répondre à un message', premium: false },
      { cmd: 'randomreact', desc: 'Réaction aléatoire', usage: '.randomreact (répondre message)', example: 'Répondre à un message', premium: false }
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
  ARGENT: { level: 3, name: 'Argent', emoji: '🥈', dailyLimit: 300 },
  OR: { level: 4, name: 'Or', emoji: '🥇', dailyLimit: -1 },
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
