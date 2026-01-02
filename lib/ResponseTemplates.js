/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║       🎨 HANI-MD - SYSTÈME DE RÉPONSES STYLISÉES          ║
 * ║      Templates de messages pour toutes les commandes      ║
 * ║              Par H2025 - 2025                             ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════
// 🎨 TEMPLATES DE MESSAGES
// ═══════════════════════════════════════════════════════════

/**
 * Template pour téléchargements
 */
function downloadTemplate(data) {
  const {
    title = 'Média',
    type = 'audio',
    platform = 'Web',
    duration = 'N/A',
    size = 'N/A',
    quality = 'HD',
    emoji = '📥'
  } = data;

  return `
╭────「 ${emoji} *TÉLÉCHARGEMENT* 」────╮
│
│  📌 *${title.substring(0, 50)}${title.length > 50 ? '...' : ''}*
│
│  🎬 Type: ${type}
│  🌐 Source: ${platform}
│  ⏱️ Durée: ${duration}
│  📦 Taille: ${size}
│  🎯 Qualité: ${quality}
│
╰───────────────────────────────────╯

⭐ Powered by HANI-MD Premium
`;
}

/**
 * Template pour recherche
 */
function searchTemplate(data) {
  const {
    query = '',
    results = [],
    platform = 'Web',
    emoji = '🔍'
  } = data;

  let message = `
╭────「 ${emoji} *RECHERCHE ${platform.toUpperCase()}* 」────╮
│
│  🔎 Recherche: *${query}*
│  📊 Résultats: ${results.length}
│
╰──────────────────────────────────────╯

`;

  results.slice(0, 5).forEach((r, i) => {
    message += `┌ *${i + 1}. ${r.title?.substring(0, 40) || 'Sans titre'}*\n`;
    if (r.description) message += `│ 📝 ${r.description.substring(0, 60)}...\n`;
    if (r.duration) message += `│ ⏱️ ${r.duration}\n`;
    if (r.views) message += `│ 👁️ ${r.views}\n`;
    if (r.url) message += `│ 🔗 ${r.url}\n`;
    message += `└────────────────────\n\n`;
  });

  message += `\n⭐ Powered by HANI-MD`;
  return message;
}

/**
 * Template pour IA
 */
function aiTemplate(data) {
  const {
    question = '',
    answer = '',
    model = 'GPT',
    emoji = '🤖'
  } = data;

  return `
╭────「 ${emoji} *${model.toUpperCase()}* 」────╮
│
│  ❓ *Question:*
│  ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}
│
╰──────────────────────────────╯

💡 *Réponse:*

${answer}

━━━━━━━━━━━━━━━━━━━━━
⭐ Powered by HANI-MD AI
`;
}

/**
 * Template pour groupe
 */
function groupTemplate(data) {
  const {
    action = 'Action',
    target = '',
    success = true,
    emoji = '👥',
    details = ''
  } = data;

  const statusIcon = success ? '✅' : '❌';
  const statusText = success ? 'Succès' : 'Échec';

  return `
╭────「 ${emoji} *${action.toUpperCase()}* 」────╮
│
│  ${statusIcon} *Statut:* ${statusText}
│  👤 *Cible:* ${target}
│  ${details ? `📝 *Détails:* ${details}` : ''}
│
╰───────────────────────────────────╯

⭐ Powered by HANI-MD
`;
}

/**
 * Template pour jeux/fun
 */
function funTemplate(data) {
  const {
    game = 'Jeu',
    result = '',
    emoji = '🎮',
    extra = ''
  } = data;

  return `
╭────「 ${emoji} *${game.toUpperCase()}* 」────╮
│
│  🎯 *Résultat:*
│  
│  ${result}
│  ${extra ? `\n│  ${extra}` : ''}
│
╰────────────────────────────────╯

⭐ Powered by HANI-MD Fun
`;
}

/**
 * Template pour sticker/image
 */
function mediaTemplate(data) {
  const {
    action = 'Conversion',
    type = 'média',
    success = true,
    emoji = '🖼️'
  } = data;

  return `
╭────「 ${emoji} *${action.toUpperCase()}* 」────╮
│
│  ${success ? '✅' : '❌'} ${type} ${success ? 'créé' : 'échec'}!
│
╰───────────────────────────────────╯

⭐ Powered by HANI-MD
`;
}

/**
 * Template pour traduction
 */
function translateTemplate(data) {
  const {
    original = '',
    translated = '',
    fromLang = 'Auto',
    toLang = 'FR'
  } = data;

  return `
╭────「 🌍 *TRADUCTION* 」────╮
│
│  📥 *De:* ${fromLang}
│  📤 *Vers:* ${toLang}
│
╰────────────────────────────╯

📝 *Original:*
${original.substring(0, 200)}${original.length > 200 ? '...' : ''}

🔄 *Traduction:*
${translated}

━━━━━━━━━━━━━━━━━━━━━
⭐ Powered by HANI-MD
`;
}

/**
 * Template pour économie
 */
function economyTemplate(data) {
  const {
    action = 'Transaction',
    amount = 0,
    balance = 0,
    bank = 0,
    emoji = '💵',
    details = ''
  } = data;

  return `
╭────「 ${emoji} *${action.toUpperCase()}* 」────╮
│
│  💰 *Montant:* ${amount.toLocaleString()} 💵
│  👛 *Portefeuille:* ${balance.toLocaleString()} 💵
│  🏦 *Banque:* ${bank.toLocaleString()} 💵
│  ${details ? `\n│  📝 ${details}` : ''}
│
╰────────────────────────────────────╯

⭐ Powered by HANI-MD Economy
`;
}

/**
 * Template pour erreur
 */
function errorTemplate(data) {
  const {
    command = '',
    error = 'Une erreur est survenue',
    suggestion = ''
  } = data;

  return `
╭────「 ❌ *ERREUR* 」────╮
│
│  📋 Commande: *.${command}*
│  
│  ⚠️ ${error}
│  ${suggestion ? `\n│  💡 ${suggestion}` : ''}
│
╰──────────────────────────╯

📞 Support: wa.me/2250150252467
`;
}

/**
 * Template pour succès
 */
function successTemplate(data) {
  const {
    action = 'Action',
    message = 'Opération réussie',
    emoji = '✅'
  } = data;

  return `
╭────「 ${emoji} *SUCCÈS* 」────╮
│
│  ${message}
│
╰───────────────────────────╯

⭐ Powered by HANI-MD
`;
}

/**
 * Template pour chargement
 */
function loadingTemplate(action = 'Traitement') {
  return `⏳ *${action} en cours...*\n\n_Veuillez patienter..._`;
}

/**
 * Template pour notification admin
 */
function adminNotificationTemplate(data) {
  const {
    type = 'INFO',
    message = '',
    from = '',
    timestamp = new Date().toLocaleString('fr-FR')
  } = data;

  const typeEmoji = {
    'INFO': 'ℹ️',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'SUCCESS': '✅',
    'PAYMENT': '💰',
    'USER': '👤',
    'REPORT': '📢'
  }[type] || 'ℹ️';

  return `
╔══════════════════════════════╗
║ ${typeEmoji} *NOTIFICATION ${type}*
╚══════════════════════════════╝

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 ${timestamp}
👤 De: ${from}
🤖 Via HANI-MD
`;
}

// ═══════════════════════════════════════════════════════════
// 🎨 EMOJIS PAR CATÉGORIE
// ═══════════════════════════════════════════════════════════

const CATEGORY_EMOJIS = {
  telechargement: '📥',
  download: '📥',
  ia: '🤖',
  ai: '🤖',
  recherche: '🔍',
  search: '🔍',
  fun: '🎭',
  game: '🎮',
  groupe: '👥',
  group: '👥',
  systeme: '⚙️',
  system: '⚙️',
  outils: '🛠️',
  tools: '🛠️',
  premium: '💎',
  owner: '👑',
  economie: '💵',
  economy: '💵',
  status: '📷',
  logo: '🎨',
  sticker: '🖼️',
  audio: '🎵',
  video: '🎬'
};

/**
 * Obtenir l'emoji d'une catégorie
 */
function getCategoryEmoji(category) {
  return CATEGORY_EMOJIS[category?.toLowerCase()] || '📦';
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Templates
  downloadTemplate,
  searchTemplate,
  aiTemplate,
  groupTemplate,
  funTemplate,
  mediaTemplate,
  translateTemplate,
  economyTemplate,
  errorTemplate,
  successTemplate,
  loadingTemplate,
  adminNotificationTemplate,
  
  // Utilitaires
  getCategoryEmoji,
  CATEGORY_EMOJIS
};

console.log('[STYLE] ✅ ResponseTemplates.js chargé - Templates de réponses stylisées');
