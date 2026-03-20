require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { Resend } = require('resend');
const admin = require('./firebaseconfig'); // Importamos la configuración de Firebase

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

// --- MODELOS ---
const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sellerEmail: { type: DataTypes.STRING, allowNull: true },
  sellerPhone: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, defaultValue: 'Otros' }
});

const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  fcmToken: { type: DataTypes.STRING, allowNull: true }
});

// Sincronización automática (añade columnas o tablas nuevas si faltan)
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

// 2. Crear producto
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice, description, sellerEmail, sellerPhone, category } = req.body;
    const newProduct = await Product.create({
      name,
      factoryPrice,
      description,
      category: category || 'Otros',
      sellerEmail: sellerEmail || 'admin@aling.com',
      sellerPhone: sellerPhone || '593982822157',
      imageUrl: req.file ? req.file.path : 'https://via.placeholder.com/300'
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al crear:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// 3. Actualizar producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, factoryPrice, description, category, sellerPhone } = req.body;
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    await product.update({
      name: name || product.name,
      factoryPrice: factoryPrice || product.factoryPrice,
      description: description || product.description,
      category: category || product.category,
      sellerPhone: sellerPhone || product.sellerPhone
    });
    res.json({ message: '✅ Producto actualizado con éxito', product });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al actualizar' });
  }
});

// 4. Eliminar producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    res.json(deleted ? { message: 'Eliminado' } : { error: 'No encontrado' });
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

// 6. Sincronizar Token de Firebase (NUEVO)
app.post('/api/users/update-token', async (req, res) => {
  try {
    const { email, fcmToken } = req.body;
    const [user, created] = await User.findOrCreate({
      where: { email: email },
      defaults: { fcmToken: fcmToken }
    });
    if (!created) await user.update({ fcmToken });
    res.json({ message: '✅ Token sincronizado' });
  } catch (error) {
    console.error('Error token:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// --- LÓGICA DE NOTIFICACIONES ---
const enviarNotificacionInteres = async (vendedorToken, nombreProducto) => {
  const mensaje = {
    notification: {
      title: '¡Nuevo interesado!',
      body: `Alguien quiere saber más sobre tu producto: ${nombreProducto}`,
    },
    token: vendedorToken,
  };
  try {
    await admin.messaging().send(mensaje);
    console.log('Notificación enviada con éxito');
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Aling corriendo en puerto ${PORT}`));