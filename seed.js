require('dotenv').config();
const sequelize = require('./src/config/database');
const Product = require('./src/models/Product');

const seedProducts = async () => {
  try {
    // Primero nos aseguramos de estar conectados
    await sequelize.authenticate();
    console.log('Conexión establecida para la siembra de datos...');

    // Sincronizamos por si acaso
    await sequelize.sync();

    // Verificamos si ya hay productos para no duplicar
    const count = await Product.count();
    
    if (count === 0) {
      await Product.bulkCreate([
        {
          name: 'Smartwatch Serie 9 (Marca Blanca)',
          factoryPrice: 14.50,
          weightKg: 0.15,
          imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80'
        },
        {
          name: 'Audífonos Gamer Inalámbricos TWS',
          factoryPrice: 8.20,
          weightKg: 0.20,
          imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80'
        },
        {
          name: 'Termo de Acero Inoxidable 500ml',
          factoryPrice: 3.50,
          weightKg: 0.35,
          imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80'
        },
        {
          name: 'Mini Impresora Térmica Portátil',
          factoryPrice: 11.00,
          weightKg: 0.25,
          imageUrl: 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=500&q=80'
        }
      ]);
      console.log('¡Éxito! 4 productos de prueba inyectados en Neon.');
    } else {
      console.log('La base de datos ya tiene productos, no se insertó nada para evitar duplicados.');
    }

  } catch (error) {
    console.error('Error inyectando datos:', error);
  } finally {
    // Cerramos la conexión para que el script termine
    await sequelize.close();
  }
};

seedProducts();