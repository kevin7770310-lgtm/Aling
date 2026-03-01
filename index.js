require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

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

// --- CONEXIÓN A LA BASE DE DATOS (NEON) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

// --- MODELO DE PRODUCTO ---
const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false }
});

// Sincronizar base de datos
sequelize.sync().then(() => console.log('Base de datos sincronizada'));

// --- RUTAS DE LA API ---

// 1. Obtener todos los productos (Para la tienda)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// 2. Subir un nuevo producto (Panel Admin - Agregar)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const newProduct = await Product.create({
      name: req.body.name,
      factoryPrice: req.body.factoryPrice,
      imageUrl: req.file.path // URL que devuelve Cloudinary
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// 3. Editar un producto (Panel Admin - Gestionar)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, factoryPrice } = req.body;
    await Product.update(
      { name, factoryPrice: parseFloat(factoryPrice) }, 
      { where: { id: req.params.id } }
    );
    res.json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// 4. Eliminar un producto (Panel Admin - Gestionar)
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

// 5. Procesar Pago (Carrito)
app.post('/api/checkout', (req, res) => {
  const { email, totalAmount } = req.body;
  // Aquí en el futuro conectarías con Stripe, PayPal o enviarías un correo real
  console.log(`Pedido recibido de ${email} por un total de $${totalAmount}`);
  res.json({ message: 'Checkout exitoso' });
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});