# Déploiement sur Railway

## 1. Pré-requis
- Code sur GitHub
- Compte Railway

## 2. Étapes
1. Sur Railway, crée un nouveau projet et connecte ton repo GitHub.
2. Ajoute les variables d’environnement dans l’onglet Variables (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SSL=true).
3. Railway détectera automatiquement le start script (node hani.js ou npm start).
4. Clique sur "Deploy".

## 3. Conseils
- Mets à jour tes variables à chaque changement de mot de passe ou de base.
- Pour supprimer les sessions, tu peux utiliser le script delete_sessions.js en local ou via un job Railway.

## 4. Liens utiles
- https://railway.app
- https://docs.railway.app/deploy/deploy-from-github
