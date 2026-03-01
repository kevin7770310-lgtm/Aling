const { Sequelize } = require('sequelize');
require('dotenv').config();

// Validación: Si la URL está vacía, detenemos el servidor y avisamos
if (!process.env.DATABASE_URL) {
  console.error("ERROR CRÍTICO: No se encontró DATABASE_URL en el archivo .env");
  process.exit(1); 
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
});

module.exports = sequelize;