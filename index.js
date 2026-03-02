require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const nodemailer = require('nodemailer'); // 🔥 Nueva librería para correos

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

// --- CONFIGURACIÓN DE CORREOS (NODEMAILER) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo de Gmail
    pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación (NO la normal)
  }
});

// --- CONEXIÓN A LA BASE DE DATOS (NEON) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  // 🔥 ESTA ES LA COLUMNA QUE CAUSA EL ERROR 500
  weightKg: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: true, 
    defaultValue: 0.00 // Envía un 0 automático para que la DB no se queje
  }
});

sequelize.sync({ alter: true }).then(() => console.log('Estructura actualizada con weightKg'));
// --- RUTAS DE LA API ---

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const newProduct = await Product.create({
      name: req.body.name,
      factoryPrice: req.body.factoryPrice,
      imageUrl: req.file.path
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al crear producto' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, factoryPrice } = req.body;
    await Product.update(
      { name, factoryPrice: parseFloat(factoryPrice) }, 
      { where: { id: req.params.id } }
    );
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// 🔥 RUTA DE CHECKOUT (AHORA ENVÍA CORREOS REALES) 🔥
app.post('/api/checkout', async (req, res) => {
  const { email, totalAmount } = req.body;
  try {
    const mailOptions = {
      from: `"Aling Mayorista" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Confirmación de Pedido - Aling Mayorista',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #FF5722;">¡Gracias por tu compra en Aling Mayorista!</h2>
          <p>Hemos recibido tu pedido correctamente.</p>
          <p><strong>Total a pagar:</strong> $${totalAmount}</p>
          <p>Nos pondremos en contacto contigo pronto para coordinar el envío y el método de pago.</p>
          <br>
          <p>Saludos cordiales,</p>
          <p><strong>El equipo de Aling</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Checkout exitoso y correo enviado' });
  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ error: 'Error al procesar el pago y enviar correo' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));