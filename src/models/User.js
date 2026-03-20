const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // No pueden haber dos correos iguales
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'client', // Por defecto todos son clientes. Luego crearemos tu admin.
  },
  fcmToken: {
  type: DataTypes.STRING,
  allowNull: true
}
});

module.exports = User;