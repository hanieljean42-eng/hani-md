# 🌟 HANI-MD - Bot WhatsApp Intelligent

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/itestmypartner/HANI)

Bot WhatsApp multi-fonctions développé par **H2025**

## ✨ Fonctionnalités

### 📱 Général
- `.menu` - Menu principal
- `.ping` - Latence du bot
- `.info` - Informations du bot
- `.whoami` - Ton numéro et statut

### 👁️ Vue Unique (View Once)
- Auto-interception des messages éphémères
- `.vv` - Récupérer manuellement
- `.listvv` - Liste des vues uniques

### 🗑️ Anti-Delete
- `.antidelete on/off` - Activer/désactiver
- `.deleted` - Voir les messages supprimés
- Notification automatique avec nom et numéro

### 📸 Statuts / Stories
- Sauvegarde automatique des statuts
- `.savestatus on/off` - Auto-save
- `.liststatus` - Voir les statuts
- `.getstatus [n°]` - Récupérer un statut
- `.allstatus` - Télécharger tous

### 📇 Base de Contacts
- Enregistrement automatique des contacts
- `.contacts` - Voir tous les contacts
- `.searchcontact [nom]` - Chercher
- `.contactinfo [n°]` - Fiche détaillée

### 🔍 Vérifications
- `.checkblock [n°]` - Vérifier si bloqué
- `.blocklist` - Liste des bloqués

### 🔒 Confidentialité
- `.block [n°]` - Bloquer un contact
- `.unblock [n°]` - Débloquer
- `.privacy` - Aide confidentialité

### 👥 Groupe (Admins)
- `.kick @user` - Exclure
- `.add [n°]` - Ajouter
- `.promote / .demote` - Gérer admins
- `.link` - Lien du groupe
- `.tagall` - Mentionner tous
- `.hidetag [msg]` - Tag invisible

### 🛡️ Protections Groupe
- `.antilink on/off`
- `.antispam on/off`
- `.antibot on/off`
- `.warn @user` / `.unwarn`

### 🎮 Fun
- `.sticker` - Créer un sticker
- `.dice` - Lancer un dé
- `.flip` - Pile ou face
- `.quote` - Citation aléatoire

### �️ Espionnage (Owner uniquement)
- `.spyon / .spyoff` - Activer/Désactiver le mode espion
- `.spyread` - Qui a lu mes messages
- `.spyreply` - Qui a répondu à mes messages  
- `.spypresence` - Qui ouvre mon chat (écrit/tape)
- `.spystatus` - Qui voit mes statuts
- `.spyhistory` - Historique complet espion
- `.spyclear` - Effacer les données espion
- `.lastseen` - Dernières connexions trackées
- `.callhistory` - Historique des appels
- `.profilechanges` - Changements de profil détectés
- `.ghost on/off` - Mode fantôme (invisible total)

### 📅 Messages Programmés (Owner)
- `.schedule [n°] [heure] [msg]` - Programmer un message
- `.schedulerepeat [n°] [heure] [freq] [msg]` - Message récurrent
- `.schedulelist` - Liste des messages programmés
- `.scheduledel [id]` - Supprimer un message programmé

### 📸 Statuts Programmés (Owner)
- `.statusschedule [heure] [texte]` - Statut programmé
- `.statusrepeat [heure] [freq] [texte]` - Statut récurrent
- `.statuslist` - Liste des statuts programmés

### 👑 Owner
- `.ban / .unban` - Bannir du bot
- `.sudo / .delsudo` - Gérer sudos
- `.approve / .unapprove` - Approuver utilisateurs
- `.broadcast [msg]` - Diffuser
- `.restart` - Redémarrer
- `.protection` - État des protections
- `.invisible on/off` - Mode invisible (rejette appels)

## 🚀 Déploiement sur Render

### Méthode 1: Bouton Deploy
Clique sur le bouton "Deploy to Render" ci-dessus.

### Méthode 2: Manuel
1. Fork ce repo
2. Va sur [render.com](https://render.com)
3. New → Web Service
4. Connecte ton GitHub
5. Sélectionne ce repo
6. Configure les variables d'environnement:

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PREFIXE` | Préfixe des commandes | `.` |
| `NOM_OWNER` | Ton nom | `H2025` |
| `NUMERO_OWNER` | Ton numéro WhatsApp | `2250150252467` |
| `MODE` | `public` ou `private` | `public` |

7. Deploy!

## ⚙️ Configuration Locale

```bash
# Cloner le repo
git clone https://github.com/itestmypartner/HANI.git
cd HANI

# Installer les dépendances
npm install --legacy-peer-deps

# Configurer
cp .env.example .env
# Éditer .env avec tes infos

# Lancer
npm start
```

## 📁 Structure

```
HANI/
├── start.js         # Bot principal (point d'entrée unique)
├── package.json     # Dépendances
├── render.yaml      # Config Render
├── .env.example     # Template config
└── DataBase/        # Base de données
    └── session/     # Session WhatsApp
```

## ⚠️ Notes Importantes

- La session WhatsApp est stockée localement
- Au premier lancement, scanne le QR code
- Sur Render, le QR s'affiche dans les logs

## 📞 Support

Créé par **H2025** 🇨🇮

---
*HANI-MD v1.0 - Bot WhatsApp Intelligent*
