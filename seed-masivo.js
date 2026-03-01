require('dotenv').config();
const sequelize = require('./src/config/database');
const Product = require('./src/models/Product');

const seedRealProducts = async () => {
  try {
    await sequelize.authenticate();
    // Forzamos la actualización de la tabla para que acepte la nueva columna "category"
    await Product.sync({ alter: true }); 
    await Product.destroy({ where: {} });
    console.log('Insertando inventario con categorías...');

    const realProducts = [
      // FERRETERÍA
      { name: 'Taladro Percutor 800W Industrial', factoryPrice: 22.50, weightKg: 1.8, category: 'Ferretería', imageUrl: 'https://images.pexels.com/photos/5974087/pexels-photo-5974087.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Amoladora / Disco de Corte', factoryPrice: 18.00, weightKg: 1.5, category: 'Ferretería', imageUrl: 'https://images.pexels.com/photos/175039/pexels-photo-175039.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Cinta Métrica 5m (Caja 12u)', factoryPrice: 10.50, weightKg: 1.2, category: 'Ferretería', imageUrl: 'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Focos LED 12W (Pack 50u)', factoryPrice: 35.00, weightKg: 2.0, category: 'Ferretería', imageUrl: 'https://images.pexels.com/photos/3201764/pexels-photo-3201764.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Guantes de Cuero (10 pares)', factoryPrice: 9.50, weightKg: 1.0, category: 'Ferretería', imageUrl: 'https://images.pexels.com/photos/4480461/pexels-photo-4480461.jpeg?auto=compress&cs=tinysrgb&w=600' },
      
      // BAZAR
      { name: 'Calculadora de Oficina', factoryPrice: 3.80, weightKg: 0.15, category: 'Bazar', imageUrl: 'https://images.pexels.com/photos/220804/pexels-photo-220804.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Cuadernos Espiral (Caja 50u)', factoryPrice: 42.00, weightKg: 15.0, category: 'Bazar', imageUrl: 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Mochila Urbana Resistente', factoryPrice: 8.50, weightKg: 0.6, category: 'Bazar', imageUrl: 'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Termo de Acero Inoxidable', factoryPrice: 4.20, weightKg: 0.35, category: 'Bazar', imageUrl: 'https://images.pexels.com/photos/1188649/pexels-photo-1188649.jpeg?auto=compress&cs=tinysrgb&w=600' },
      
      // TECNOLOGÍA
      { name: 'Audífonos Inalámbricos Negros', factoryPrice: 6.50, weightKg: 0.15, category: 'Tecnología', imageUrl: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Cargador de Pared Rápido', factoryPrice: 2.10, weightKg: 0.1, category: 'Tecnología', imageUrl: 'https://images.pexels.com/photos/3602856/pexels-photo-3602856.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { name: 'Cables USB Varios Tipos', factoryPrice: 1.80, weightKg: 0.2, category: 'Tecnología', imageUrl: 'https://images.pexels.com/photos/4144183/pexels-photo-4144183.jpeg?auto=compress&cs=tinysrgb&w=600' }
    ];

    await Product.bulkCreate(realProducts);
    console.log(`✅ ¡Éxito! Base de datos actualizada con categorías.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
};

seedRealProducts();