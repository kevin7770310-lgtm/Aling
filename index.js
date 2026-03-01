require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer'); // 🔥 Librería para recibir fotos
const path = require('path');
const sequelize = require('./src/config/database');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurar dónde se guardan las fotos
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único: 17123456.jpg
  }
});
const upload = multer({ storage });

// 2. Hacer que la carpeta 'uploads' sea pública para ver las fotos en la App
app.use('/uploads', express.static('uploads'));

// --- RUTA: AGREGAR PRODUCTO CON FOTO REAL ---
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const Product = require('./src/models/Product');
    const { name, factoryPrice } = req.body;

    // Construimos la URL de la imagen
    // Si estás en Render, será: https://tu-app.onrender.com/uploads/nombre.jpg
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const newProduct = await Product.create({
      name,
      factoryPrice: parseFloat(factoryPrice),
      weightKg: 1.0,
      imageUrl, // Guardamos la URL generada
      category: 'General'
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al subir producto' });
  }
});

// --- RUTA: CHECKOUT (GMAIL) ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { email, totalAmount } = req.body;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
      from: `"Aling Mayorista" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🧾 Comprobante de Compra - Aling',
      html: `<h1>Gracias por tu compra</h1><p>Total: $${totalAmount}</p>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Correo enviado' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el pago' });
  }
});

// Rutas base
const productRoutes = require('./src/routes/product.routes');
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en puerto ${PORT}`));
});