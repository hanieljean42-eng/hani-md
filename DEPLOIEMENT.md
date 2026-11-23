# 🚀 DÉPLOIEMENT HANI-MD — RENDER

## 🎯 ARCHITECTURE CHOISIE

| Service | Rôle | Coût |
|---------|------|------|
| **Render** | Hébergement 24/7 du bot (web service Node) | **GRATUIT** (avec self-ping anti-veille) |
| **Firebase** | Base de données (users, premium, paiements, session WA) | **GRATUIT** |
| **GitHub** | Stockage du code + auto-deploy | **GRATUIT** |
| **SESSION_ID** | Connexion WhatsApp persistante | **GRATUIT** |

> La config Render est dans `render.yaml` (blueprint) : build `npm install`, start `node start.js`, health check `/health`.
> Le bot fait un self-ping toutes les 4 min sur `/health` pour empêcher la mise en veille du plan gratuit.

---

## ÉTAPE 1 — OBTENIR LA CLÉ FIREBASE (service account)

1. Va sur **https://console.firebase.google.com** → ton projet → ⚙️ Paramètres → Comptes de service
2. Clique **"Générer une nouvelle clé privée"**
3. Ouvre le JSON téléchargé et **copie tout le contenu** → garde-le pour l'étape 3

---

## ÉTAPE 2 — GÉNÉRER LA SESSION WHATSAPP (sur ton PC)

```bash
node session-generator.js
```

- Scanne le QR avec WhatsApp → **Appareils connectés**
- Le fichier `session_id.txt` est généré (format `HANI-MD~...` ou `HANI-MD-V2~...`)
- ⚠️ **Ne commit JAMAIS ce fichier** — il contient tes credentials WhatsApp

---

## ÉTAPE 3 — CRÉER LE SERVICE RENDER

1. **render.com** → New → **Web Service** → connecte le repo GitHub
2. Render détecte `render.yaml` automatiquement
3. Configure les variables sensibles dans **Environment** :

| Variable | Contenu |
|---|---|
| `SESSION_ID` | Contenu de `session_id.txt` |
| `FIREBASE_CREDENTIALS` | JSON complet de la clé service account |
| `FIREBASE_URL` | `https://<projet>-default-rtdb.firebaseio.com` |
| `ADMIN_PASSWORD` | Mot de passe du panel admin |
| `JWT_SECRET` | Secret 32+ caractères |
| `HANI_AUTH_SECRET` | Secret 32+ caractères |
| `HANI_SESSION_SECRET` | Secret 32+ caractères |
| `GEMINI_API_KEY` | Clé Google AI (commandes IA) |
| `SITE_URL` / `BOT_URL` | `https://<service>.onrender.com` |

4. Déploie — le bot restaure la session depuis `SESSION_ID` et se connecte sans QR

---

## VÉRIFICATION

- `https://<service>.onrender.com/health` → `{ "status": "ok", "connection": "connected" }`
- `https://<service>.onrender.com/qr` → page de connexion si pas de session
- `https://<service>.onrender.com/admin` → panel admin

## EN CAS DE DÉCONNEXION (401 / logged out)

1. Regénère : `node session-generator.js` sur ton PC
2. Mets à jour `SESSION_ID` dans Render → Environment
3. Redémarre le service (Manual Deploy → Clear build cache & deploy)

## TESTS LOCAUX

```bash
npm test          # tests unitaires (codes, premium, paiements Wave)
npm run dev       # nodemon start.js
```
