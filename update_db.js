const db = require('./index'); // Importamos lo que exporta tu index.js
const { DataTypes } = require('sequelize');

async function addFcmToken() {
  try {
    // Intentamos obtener sequelize de diferentes formas comunes
    const sequelize = db.sequelize || db; 
    
    if (!sequelize.getQueryInterface) {
      throw new Error("No se pudo encontrar la instancia de Sequelize. Revisa cómo exportas la conexión en index.js");
    }

    const queryInterface = sequelize.getQueryInterface();
    
    await queryInterface.addColumn('Users', 'fcmToken', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    
    console.log('✅ Columna fcmToken añadida correctamente a la tabla Users.');
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
      console.log('⚠️ La columna fcmToken ya existe en la base de datos.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    process.exit();
  }
}

addFcmToken();