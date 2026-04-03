# 🚀 GUIDE DE DÉPLOIEMENT HANI-MD — 100% GRATUIT

## 🎯 SOLUTION CHOISIE — 100% GRATUITE ET TOUJOURS ACTIVE

| Service | Rôle | Coût |
|---------|------|------|
| **Fly.io** | Hébergement 24/7 du bot (runtime WhatsApp) | **GRATUIT** (3 VMs nano) |
| **Firebase** | **TOUTE** la base de données (users, groupes, bans, warns, premium, paiements…) | **GRATUIT** (1GB, Google) |
| **GitHub** | Stockage du code | **GRATUIT** |
| **SESSION_ID** | Connexion WhatsApp persistante | **GRATUIT** |

> ✅ Ton projet Firebase `hani-md` est déjà créé
> 🔗 URL : `https://hani-md-default-rtdb.firebaseio.com`
> ⚠️ Fly.io est uniquement pour faire **tourner** le bot — Firebase gère **toutes les données**

---

## ÉTAPE 1 — OBTENIR LA CLÉ FIREBASE (service account)

Ton projet Firebase est déjà créé. Il faut juste générer la clé d'accès serveur :

1. Va sur **https://console.firebase.google.com/project/hani-md/settings/serviceaccounts/adminsdk**
2. Clique **"Générer une nouvelle clé privée"**
3. Un fichier JSON est téléchargé — **ouvre-le avec un éditeur de texte**
4. **Copie tout le contenu** (commence par `{` et finit par `}`) → garde-le pour l'Étape 5

---

## ÉTAPE 2 — GÉNÉRER LA SESSION WHATSAPP (sur ton PC)

Tu fais ceci **UNE SEULE FOIS** avec le numéro dédié au bot.

```bash
node session-generator.js
```

1. QR code s'affiche → ouvre **WhatsApp → Appareils connectés → Connecter un appareil**
2. Scanne avec le numéro du bot
3. Attends `✅ SESSION GÉNÉRÉE AVEC SUCCÈS`
4. Fichier `session_id.txt` créé → **copie son contenu** (commence par `HANI-MD~`)

> ⚠️ Ne partage JAMAIS `session_id.txt` — il donne accès complet à ton WhatsApp

---

## ÉTAPE 3 — POUSSER LE CODE SUR GITHUB

```bash
git init
git add .
git commit -m "HANI-MD - déploiement Fly.io"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/hani-md.git
git push -u origin main
```

---

## ÉTAPE 4 — DÉPLOYER SUR FLY.IO

### 4a. Installer flyctl (outil CLI Fly.io)

**Windows (PowerShell) :**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### 4b. Créer un compte et se connecter

```bash
fly auth signup
# ou si tu as déjà un compte:
fly auth login
```

### 4c. Lancer le déploiement

```bash
fly launch --name hani-md --region cdg --no-deploy
```
Réponds aux questions :
- `Would you like to set up a Postgresql database?` → **No**
- `Would you like to set up an Upstash Redis database?` → **No**

### 4d. Définir les variables d'environnement (secrets)

Copie ces commandes **une par une** dans ton terminal :

```bash
fly secrets set SESSION_ID="HANI-MD~COLLE_TON_CONTENU_ICI"
fly secrets set NUMERO_OWNER="22550252467"
fly secrets set NODE_ENV="production"
fly secrets set BOT_NAME="HANI-MD"
fly secrets set FIREBASE_URL="https://hani-md-default-rtdb.firebaseio.com"
fly secrets set JEKO_PAYMENT_LINK="https://pay.jeko.africa/pl/2a5354be-710e-454e-8741-1b3d6beb5890"
fly secrets set ADMIN_PASSWORD="MotDePasseAdmin2025!"
fly secrets set JWT_SECRET="uneChaineAleatoireLongue2025"
```

Pour `FIREBASE_CREDENTIALS` (le JSON complet sur une seule ligne) :
```bash
fly secrets set FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"hani-md",...}'
```

> ⚠️ Remplace `...` par le contenu réel du fichier JSON téléchargé à l'Étape 1

### 4e. Déployer

```bash
fly deploy
```

---

## ÉTAPE 5 — VÉRIFIER QUE ÇA MARCHE

Dans les logs Fly.io (`fly logs`), tu dois voir :

```
[DB] 🔥 Firebase connecté — données premium sauvegardées sur Firebase
[PREMIUM] ✅ Restauré depuis DB: premium_users.json
[SESSION] ✅ Session restaurée depuis SESSION_ID (X fichiers)
✅ Bot HANI-MD connecté: +225XXXXXXXXX
```

Envoie `.ping` au bot → réponse `🏓 Pong !` = tout fonctionne ✅

---

## 🔄 METTRE À JOUR LE BOT

```bash
git add .
git commit -m "ma modification"
fly deploy
```
Les données Firebase survivent automatiquement à chaque redéploiement.

---

## ❓ PROBLÈMES FRÉQUENTS

| Problème | Solution |
|----------|----------|
| `SESSION_ID invalide` | Refaire `node session-generator.js` → `fly secrets set SESSION_ID="..."` |
| `Firebase non connecté` | Vérifier `FIREBASE_URL` et `FIREBASE_CREDENTIALS` avec `fly secrets list` |
| `Bot ne répond pas` | Vérifier les logs : `fly logs` |
| Session expire | Refaire session-generator → `fly secrets set SESSION_ID="..."` → `fly deploy` |
| `[PREMIUM] ✅ Restauré depuis DB` | ✅ Normal — données chargées depuis Firebase |

---

## 📱 FLUX COMMERCIAL COMPLET

```
Client → .abonnement           (voit les offres)
Client → .payer or             (reçoit lien Jeko avec 2000 FCFA)
Client paie sur Wave/Jeko      (montant exact)
Client → .confirmer REF 2000   (bot vérifie montant automatiquement)
  ✅ Bon montant → owner notifié pour validation
  ❌ Mauvais montant → REJETÉ AUTOMATIQUEMENT

Owner → .validatepay REF       (envoie le code d'activation au client)
Client → .activer CODE         (premium activé immédiatement)
  → Données sauvées dans Firebase ✅ (survivent aux redémarrages)
```
