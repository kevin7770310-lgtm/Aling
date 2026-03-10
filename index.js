require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const nodemailer = require('nodemailer');

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

// --- CONFIGURACIÓN DE CORREOS (PLAN DE RESCATE FINAL) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true, // Mantiene la conexión abierta para mayor velocidad
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Forzamos el uso de IPv4 para evitar el error de red que vimos antes
  connectionTimeout: 20000, // Aumentamos el tiempo de espera a 20 segundos
  greetingTimeout: 20000,
  socketTimeout: 20000,
  tls: {
    // Esto es clave para que Render no bloquee la conexión
    rejectUnauthorized: false
  }
});

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
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  // Mantenemos weightKg para compatibilidad con tu DB actual
  weightKg: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: true, 
    defaultValue: 0.00 
  }
});

// Sincronización estándar (Segura para producción)
sequelize.sync()
  .then(() => console.log('✅ Base de datos sincronizada correctamente'))
  .catch(err => console.error('❌ Error al sincronizar la base de datos:', err));

// --- RUTAS DE LA API ---

// Obtener productos
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Crear producto
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const newProduct = await Product.create({
      name: req.body.name,
      factoryPrice: req.body.factoryPrice,
      imageUrl: req.file.path
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ error: 'Error interno al crear producto' });
  }
});

// Actualizar producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, factoryPrice } = req.body;
    await Product.update(
      { name, factoryPrice: parseFloat(factoryPrice) }, 
      { where: { id: req.params.id } }
    );
    res.json({ message: 'Producto actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// Eliminar producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Producto eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

// Checkout y envío de correo
app.post('/api/checkout', async (req, res) => {
  try {
    const { email, totalAmount } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Factura de Compra - Aling Mayorista',
      html: `<h1>Gracias por tu compra</h1><p>Total: <b>$${totalAmount}</b></p>`
    };

    // Intentamos enviar el correo
    await transporter.sendMail(mailOptions);
    
    // Si funciona, enviamos éxito
    return res.status(200).json({ message: 'Pedido procesado con éxito' });

  } catch (error) {
    // Si falla el correo, imprimimos el error en el log de Render
    console.error("❌ Error en el envío de factura:", error);
    
    // ENVIAMOS ERROR AL FRONTEND PARA QUE NO SE QUEDE CARGANDO
    return res.status(500).json({ error: 'Error interno al enviar la factura' });
  }
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});