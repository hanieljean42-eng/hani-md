/**
 * 🚂 Script de déploiement Railway pour HANI-MD
 * Automatise le déploiement complet avec MySQL
 * 
 * Usage: node scripts/deploy-railway.js
 */

const { execSync, spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (q) => new Promise(resolve => rl.question(q, resolve));

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (n, msg) => console.log(`\n${colors.cyan}[${n}]${colors.reset} ${msg}`)
};

// Exécuter une commande
function run(cmd, silent = false) {
  try {
    const result = execSync(cmd, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Vérifier si Railway CLI est installé
function checkRailwayCLI() {
  const result = run('railway --version', true);
  return result.success;
}

// Installer Railway CLI
async function installRailwayCLI() {
  log.info('Installation de Railway CLI...');
  
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Via npm (cross-platform)
    const result = run('npm install -g @railway/cli');
    if (!result.success) {
      log.error('Échec installation. Essayez manuellement:');
      console.log('  npm install -g @railway/cli');
      console.log('  # ou');
      console.log('  iwr https://raw.githubusercontent.com/railwayapp/cli/master/install.ps1 -useb | iex');
      return false;
    }
  } else {
    run('curl -fsSL https://railway.app/install.sh | sh');
  }
  
  return checkRailwayCLI();
}

// Variables d'environnement par défaut
const DEFAULT_VARS = {
  PREFIXE: '.',
  NOM_OWNER: 'H2025',
  MODE: 'public',
  STICKER_PACK_NAME: 'HANI-MD',
  STICKER_AUTHOR_NAME: 'H2025',
  NODE_ENV: 'production'
};

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     🚂 DÉPLOIEMENT HANI-MD SUR RAILWAY               ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Étape 1: Vérifier Railway CLI
  log.step(1, 'Vérification de Railway CLI...');
  
  if (!checkRailwayCLI()) {
    log.warn('Railway CLI non trouvé');
    const install = await question('Installer Railway CLI ? (o/n): ');
    
    if (install.toLowerCase() === 'o') {
      const installed = await installRailwayCLI();
      if (!installed) {
        log.error('Impossible d\'installer Railway CLI');
        rl.close();
        process.exit(1);
      }
    } else {
      log.error('Railway CLI requis pour continuer');
      rl.close();
      process.exit(1);
    }
  }
  log.success('Railway CLI installé');

  // Étape 2: Connexion
  log.step(2, 'Connexion à Railway...');
  log.info('Une fenêtre de navigateur va s\'ouvrir pour l\'authentification');
  
  run('railway login');
  log.success('Connecté à Railway');

  // Étape 3: Initialiser le projet
  log.step(3, 'Initialisation du projet...');
  
  const initResult = run('railway init', true);
  if (initResult.success) {
    log.success('Projet initialisé');
  } else {
    log.info('Projet déjà initialisé ou erreur');
  }

  // Étape 4: Ajouter MySQL
  log.step(4, 'Configuration MySQL...');
  
  const addMysql = await question('Ajouter une base de données MySQL ? (o/n): ');
  
  if (addMysql.toLowerCase() === 'o') {
    log.info('Ajout de MySQL au projet...');
    run('railway add --database mysql');
    log.success('MySQL ajouté');
    log.info('Les variables MySQL seront automatiquement configurées');
  }

  // Étape 5: Configurer les variables
  log.step(5, 'Configuration des variables d\'environnement...');
  
  // Variables obligatoires
  const numeroOwner = await question('Numéro du owner (ex: 2250150252467): ');
  const sessionId = await question('SESSION_ID: ');
  
  if (numeroOwner) {
    run(`railway variables set NUMERO_OWNER="${numeroOwner}"`);
    log.success('NUMERO_OWNER configuré');
  }
  
  if (sessionId) {
    run(`railway variables set SESSION_ID="${sessionId}"`);
    log.success('SESSION_ID configuré');
  }
  
  // Variables par défaut
  for (const [key, value] of Object.entries(DEFAULT_VARS)) {
    run(`railway variables set ${key}="${value}"`, true);
  }
  log.success('Variables par défaut configurées');

  // Étape 6: Déployer
  log.step(6, 'Déploiement...');
  log.info('Cela peut prendre quelques minutes...');
  
  run('railway up --detach');
  log.success('Déploiement lancé !');

  // Étape 7: Afficher les informations
  log.step(7, 'Informations de déploiement');
  
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║           🎉 DÉPLOIEMENT RÉUSSI !                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  log.info('Commandes utiles:');
  console.log('  railway logs -f     → Voir les logs en temps réel');
  console.log('  railway open        → Ouvrir le dashboard');
  console.log('  railway status      → Voir le statut');
  console.log('  railway variables   → Voir les variables');
  
  console.log('\n');
  run('railway open');
  
  rl.close();
}

// Exécuter
main().catch(err => {
  log.error(err.message);
  rl.close();
  process.exit(1);
});

