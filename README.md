# 🌟 HANI-MD V2.6.0 SECURE - Bot WhatsApp Premium

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.6.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
  <img src="https://img.shields.io/badge/WhatsApp-Multi--Device-brightgreen.svg" alt="WhatsApp">
  <img src="https://img.shields.io/badge/Status-Secure-success.svg" alt="Secure">
</p>

<p align="center">
  <b>🔥 Bot WhatsApp premium avec système d'abonnements, protection avancée et fonctionnalités exclusives 🔥</b>
</p>

---

## ✨ Nouveautés v2.6.0 SECURE

- 🎨 **Nouveau système de menus stylisés** avec thèmes personnalisables
- 💎 **Système d'abonnements premium** avec 6 niveaux
- 🔐 **Contrôle d'accès avancé** par commande
- 🌐 **Interface web intégrée** pour les abonnements
- 💳 **Paiement mobile** via Wave & Moov Money

---

## 💎 Plans d'Abonnement

| Plan | Prix | Commandes/Jour | Accès |
|------|------|----------------|-------|
| 🆓 FREE | Gratuit | 30 | Commandes de base |
| 🥉 BRONZE | 500 F/mois | 100 | + Téléchargements |
| 🥈 ARGENT | 1000 F/mois | 200 | + Convertisseurs |
| 🥇 OR | 2000 F/mois | 500 | + IA & Recherche |
| 💎 DIAMANT | 5000 F/mois | Illimité | Toutes les fonctionnalités |
| ♾️ LIFETIME | 15000 F (unique) | Illimité à vie | Accès permanent |

---

## ✨ Fonctionnalités Principales

### 🔐 Protection & Sécurité
| Fonction | Description |
|----------|-------------|
| Anti-Delete | Récupère les messages supprimés |
| Anti-Spam | Protection contre le spam |
| Anti-Bot | Bloque les autres bots |
| Anti-Link | Supprime les liens non autorisés |
| Anti-Call | Bloque et rejette les appels |
| Anti-Tag | Protection contre le tag abusif |
| Anti-Mention | Protection contre les mentions massives |

### 🕵️ Surveillance Avancée (Premium)
| Fonction | Description |
|----------|-------------|
| Spy Mode | Surveiller l'activité en temps réel |
| Interception Médias | Récupère photos/vidéos automatiquement |
| Activity Tracker | Suivi complet des activités |
| Alertes instantanées | Notifications en temps réel |

### 👁️ Vue Unique (View Once)
- ✅ Interception automatique des médias à vue unique
- ✅ Sauvegarde instantanée
- ✅ Envoi en privé au propriétaire

### 📸 Statuts / Stories
- ✅ Sauvegarde automatique
- ✅ Récupération des statuts supprimés
- ✅ Téléchargement de statuts

### 🤖 Intelligence Artificielle (Premium)
- 💬 ChatGPT intégré
- 🎨 Génération d'images AI
- 🎵 IA musicale

### 📥 Téléchargements
- YouTube (audio & vidéo)
- TikTok, Instagram, Facebook
- Spotify, SoundCloud
- Twitter/X, Pinterest

---

## 📋 Catégories de Commandes

| Catégorie | Commande | Description |
|-----------|----------|-------------|
| 📊 Système | `.menu` | Menu principal stylisé |
| | `.menucat [catégorie]` | Menu par catégorie |
| | `.ping` | Latence du bot |
| | `.info` | Informations |
| 🔐 Protection | `.antilink on/off` | Protection liens |
| | `.antispam on/off` | Protection spam |
| | `.antibot on/off` | Protection bots |
| | `.anticall on/off` | Protection appels |
| 📥 Téléchargement | `.yt [url]` | YouTube |
| | `.tiktok [url]` | TikTok |
| | `.ig [url]` | Instagram |
| 🤖 IA | `.gpt [question]` | ChatGPT |
| | `.dall-e [prompt]` | Génération image |
| 👥 Groupe | `.kick @user` | Expulser |
| | `.promote @user` | Promouvoir admin |
| | `.demote @user` | Rétrograder |
| 🎮 Fun | `.sticker` | Créer sticker |
| | `.quote` | Citation aléatoire |
| 💎 Premium | `.sub` | Voir son abonnement |
| | `.upgrade` | Améliorer son plan |

---

## 🚀 Déploiement

### 📦 Installation Locale

```bash
# 1. Cloner le repo
git clone https://github.com/VOTRE_USERNAME/HANI-MD.git
cd HANI-MD

# 2. Installer les dépendances
npm install

# 3. Configurer le .env
cp .env.example .env
# Éditer .env avec vos informations

# 4. Lancer le bot
npm start
# ou
node start.js

# 5. Scanner le QR code avec WhatsApp
```

### ☁️ Déploiement sur Render (Recommandé)

1. **Fork** ce repository sur GitHub
2. Allez sur [render.com](https://render.com)
3. **New → Web Service** → Sélectionnez le repo
4. Configurez :
   - **Name**: `hani-md`
   - **Build Command**: `npm install --legacy-peer-deps`
   - **Start Command**: `node start.js`
5. Ajoutez les **Environment Variables**
6. **Create Web Service**

### 🔑 Générer un SESSION_ID

```bash
node session-generator.js
# Copiez le SESSION_ID et ajoutez-le dans les variables d'environnement
```

---

## ⚙️ Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PREFIXE` | Préfixe des commandes | `.` |
| `NOM_OWNER` | Votre nom | `Hanie` |
| `NUMERO_OWNER` | Votre numéro (sans +) | `2250150252467` |
| `MODE` | `public` ou `private` | `public` |
| `SESSION_ID` | Session encodée | `HANI-MD~xxx...` |
| `MYSQL_URL` | URL MySQL (optionnel) | `mysql://user:pass@host/db` |

---

## 📁 Structure du Projet

```
HANI-MD/
├── start.js            # Point d'entrée UNIQUE (bot + serveur web)
├── session.js          # Gestion des sessions
├── set.js              # Configuration
├── cmd/                # Modules de commandes
│   ├── Menu.js         # Nouveau système de menus
│   ├── Groupe.js       # Commandes de groupe
│   ├── Telechargement.js
│   ├── Ia.js           # Commandes IA
│   └── ...
├── lib/                # Bibliothèques
│   ├── MenuSystem.js   # Générateur de menus
│   ├── AccessControl.js # Contrôle d'accès
│   ├── PaymentSystem.js # Système de paiement
│   └── ...
├── DataBase/           # Modules de base de données
├── Ovl_events/         # Gestionnaires d'événements
├── public/             # Interface web
│   ├── index.html      # Page d'accueil
│   └── subscribe.html  # Page d'abonnement
└── assets/             # Ressources statiques
```

---

## 🔒 Sécurité

⚠️ **Important** :

- ❌ Ne partagez jamais votre fichier `.env`
- ❌ Ne partagez jamais le dossier `session/`
- ❌ Ne partagez jamais votre `SESSION_ID`
- ✅ Utilisez les fonctionnalités de manière éthique

---

## 💳 Méthodes de Paiement

| Méthode | Disponible |
|---------|------------|
| 🟢 Wave | ✅ Actif |
| 🟡 Moov Money | ✅ Actif |

---

## 📱 Support

- **Auteur**: H2025
- **Version**: 2.6.0 SECURE
- **License**: MIT

---

<p align="center">
  <b>⭐ Si vous aimez ce projet, n'oubliez pas de mettre une étoile ! ⭐</b>
</p>

<p align="center">
  <i>Développé avec ❤️ par H2025</i>
</p>

