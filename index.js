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

// --- CONFIGURACIÓN DE CLOUDINARY ---
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

// --- CONEXIÓN A LA BASE DE DATOS ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sellerEmail: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, defaultValue: 'Otros' } 
});

sequelize.sync({ alter: true }) 
  .then(() => console.log('✅ Base de datos sincronizada'))
  .catch(err => console.error('❌ Error DB:', err));

// --- RUTAS DE LA API ---

// 1. Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// 2. Crear producto (Marketplace)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice, description, sellerEmail, category } = req.body;
    const newProduct = await Product.create({
      name,
      factoryPrice,
      description,
      category: category || 'Otros',
      sellerEmail: sellerEmail || 'admin@aling.com',
      imageUrl: req.file ? req.file.path : 'https://via.placeholder.com/300'
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al crear:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// 3. Actualizar producto (CON CATEGORÍA Y FIX 404)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, factoryPrice, description, category } = req.body;
    
    // Buscamos si el producto existe
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Actualizamos los campos
    await product.update({
      name: name || product.name,
      factoryPrice: factoryPrice || product.factoryPrice,
      description: description || product.description,
      category: category || product.category // 🚀 IMPORTANTE: Actualiza la categoría
    });

    res.json({ message: '✅ Producto actualizado con éxito', product });
  } catch (error) {
    console.error('❌ Error al actualizar:', error);
    res.status(500).json({ error: 'Error interno al actualizar' });
  }
});

// 4. Eliminar producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ message: 'Eliminado correctamente' });
    } else {
      res.status(404).json({ error: 'No encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// 5. Checkout y Factura
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
    res.status(500).json({ error: 'Error al enviar factura' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Aling corriendo en puerto ${PORT}`));