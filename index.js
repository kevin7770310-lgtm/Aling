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

// --- CONFIGURACIÓN DE CORREOS (NODEMAILER ACTUALIZADA) ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true para puerto 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Esto ayuda a evitar bloqueos en servidores en la nube
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
  const { email, totalAmount } = req.body;
  try {
    const mailOptions = {
      from: `"Aling Mayorista" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Confirmación de Pedido - Aling Mayorista',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee;">
          <h2 style="color: #FF5722; text-align: center;">¡Gracias por tu compra!</h2>
          <p>Hola,</p>
          <p>Hemos recibido tu pedido correctamente en <strong>Aling Mayorista</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 18px;"><strong>Resumen del Total:</strong> <span style="color: #FF5722;">$${totalAmount}</span></p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p>Nuestro equipo se pondrá en contacto contigo pronto para coordinar el pago y el envío.</p>
          <br>
          <p>Saludos cordiales,</p>
          <p><strong>El equipo de Aling</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Checkout exitoso y correo enviado' });
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    res.status(500).json({ error: 'Error al procesar el pago o enviar correo' });
  }
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});