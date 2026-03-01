const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  factoryPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  weightKg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // 🔥 NUEVO CAMPO: Categoría
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General',
  }
});

module.exports = Product;