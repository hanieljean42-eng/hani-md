/**
 * ═══════════════════════════════════════════════════════════
 * 📦 HANI-MD - Index des Commandes
 * ═══════════════════════════════════════════════════════════
 * Point d'entrée pour charger tous les modules de commandes
 * Version: 2.6.0 - Organisé et optimisé
 * ═══════════════════════════════════════════════════════════
 */

const path = require("path");

// Liste des modules de commandes
const modules = [
  "Telechargement",
  "Outils",
  "Fun",
  "Groupe",
  "Owner",
  "Systeme",
  "Search",
  "Ia",
  "Conversion",
  "Fx_audio",
  "Status",
  "Image_edits",
  "Logo",
  "Reaction",
  "Confidentialite",
  "ProFeatures",
  "Premium",
  "Ovl-economy",
  "Ovl-game",
  "Advanced",
  "WavePayments",
  // Nouveaux modules d'engagement et croissance
  "Newsletter",
  "Autoreply",
  "Contacts",
  "Engagement",
  // Modules commerciaux et support client
  "Support",
  "Feedback",
  "Tutorial",
  "Referral",
  // Configuration centralisée
  "Config",
  // Vue unique & messages supprimés
  "VueUnique",
  // Protections du bot
  "Protection"
];

// Charger tous les modules
let loadedCount = 0;
let failedCount = 0;
const loadedModules = [];
const failedModules = [];

for (const mod of modules) {
  try {
    require(`./${mod}`);
    loadedModules.push(mod);
    loadedCount++;
  } catch (error) {
    failedModules.push({ name: mod, error: error.message });
    failedCount++;
    console.error(`[CMD] ❌ Erreur chargement ${mod}:`, error.message);
  }
}

// Exporter les informations
module.exports = {
  modules,
  loadedModules,
  failedModules,
  stats: {
    total: modules.length,
    loaded: loadedCount,
    failed: failedCount
  }
};

console.log(`[CMD] 📦 Index des commandes: ${loadedCount}/${modules.length} modules chargés`);
