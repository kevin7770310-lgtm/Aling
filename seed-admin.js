require('dotenv').config();
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    await sequelize.authenticate();
    
    // Encriptamos la contraseña para que sea segura
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Creamos el superusuario
    await User.create({
      email: 'admin@aling.com',
      password: hashedPassword,
      role: 'admin' // ¡Esta es la llave maestra!
    });

    console.log('✅ Cuenta de Administrador creada con éxito.');
    console.log('📧 Correo: admin@aling.com');
    console.log('🔑 Contraseña: admin123');
  } catch (error) {
    console.log('❌ Error (¿Quizás ya la habías creado?):', error.message);
  } finally {
    await sequelize.close();
  }
};

seedAdmin();