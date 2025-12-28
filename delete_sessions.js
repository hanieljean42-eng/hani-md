// Script pour supprimer toutes les sessions de la table `sessions` MySQL
require('dotenv').config();
const { Sequelize } = require('sequelize');

function getSequelizeFromEnv() {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (databaseUrl) {
    return new Sequelize(databaseUrl, {
      dialect: 'mysql',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: false,
    });
  }

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = process.env.MYSQL_PORT || 3306;
  const database = process.env.MYSQL_DATABASE || 'hani_db';
  const username = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';

  return new Sequelize(database, username, password, {
    host,
    port: Number(port),
    dialect: 'mysql',
    logging: false,
  });
}

async function deleteAllSessions() {
  const sequelize = getSequelizeFromEnv();
  try {
    await sequelize.authenticate();
    const [result] = await sequelize.query('DELETE FROM sessions');
    console.log('Commande exécutée : DELETE FROM sessions');
    console.log('Résultat :', result);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de la suppression des sessions :', err.message || err);
    try {
      await sequelize.close();
    } catch (e) {}
    process.exit(1);
  }
}

if (require.main === module) deleteAllSessions();
