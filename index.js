require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'aling_products' },
});
const upload = multer({ storage: storage });

const resend = new Resend('re_PhirtQEh_6B4Hf96RvoMT6LVBeWjNT4Sa');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sellerEmail: { type: DataTypes.STRING, allowNull: true } // 🚀 Cambiado a true para evitar el Error 500
});

// ⚠️ ATENCIÓN KEVIN: 
// Cambia 'alter: true' por 'force: true' SOLO UNA VEZ si el error persiste para limpiar la tabla.
// Luego de que funcione, regrésalo a 'alter: true'.
sequelize.sync({ alter: true }) 
  .then(() => console.log('✅ Base de datos lista'))
  .catch(err => console.error('❌ Error DB:', err));

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice, description, sellerEmail } = req.body;
    const newProduct = await Product.create({
      name,
      factoryPrice,
      description,
      sellerEmail: sellerEmail || 'admin@aling.com',
      imageUrl: req.file ? req.file.path : 'https://via.placeholder.com/300'
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear' });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { email, totalAmount, address } = req.body; 
  try {
    await resend.emails.send({
      from: 'Aling Mayorista <onboarding@resend.dev>',
      to: email,
      subject: '📦 Nuevo Pedido - Aling Mayorista',
      html: `<h1>Pedido Recibido</h1><p>Total: $${totalAmount}</p><p>Dirección: ${address}</p>`,
    });
    res.status(200).json({ message: 'Enviado' });
  } catch (error) {
    res.status(500).json({ error: 'Error Resend' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puerto ${PORT}`));