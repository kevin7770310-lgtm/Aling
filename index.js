require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const nodemailer = require('nodemailer');
const sequelize = require('./src/config/database');
const Product = require('./src/models/Product');

// 1. Inicialización de la App (DEBE IR AQUÍ ARRIBA)
const app = express();
app.use(cors());
app.use(express.json());

// 2. Configuración de Cloudinary (Usa tus variables de entorno)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. Configuración del almacenamiento en la nube
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aling_products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// --- RUTA: AGREGAR PRODUCTO CON IMAGEN DEL CELULAR ---
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se seleccionó ninguna imagen' });
    }

    // Cloudinary nos devuelve la URL permanente en req.file.path
    const imageUrl = req.file.path; 

    const newProduct = await Product.create({
      name,
      factoryPrice: parseFloat(factoryPrice),
      imageUrl,
      category: 'General',
      weightKg: 1.0
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al guardar producto:', error);
    res.status(500).json({ error: 'Error interno al procesar el producto' });
  }
});

// --- RUTA: CHECKOUT Y ENVÍO DE CORREO ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { email, totalAmount } = req.body;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Aling Mayorista" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🧾 Comprobante de Compra - Aling',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #FF5722;">¡Gracias por tu compra en Aling!</h2>
          <p>Hemos recibido tu pedido correctamente.</p>
          <hr/>
          <p style="font-size: 18px;"><strong>Total pagado: $${totalAmount}</strong></p>
          <p>Tu pedido será procesado para envío mayorista a la brevedad.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Comprobante enviado con éxito' });
  } catch (error) {
    console.error('Error en checkout:', error);
    res.status(500).json({ error: 'Error al enviar el comprobante' });
  }
});

// --- RUTA: OBTENER TODOS LOS PRODUCTOS ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Ruta de salud para Render
app.get('/', (req, res) => res.send('🚀 Backend de Aling Mayorista está en línea!'));

// 4. Sincronización y Arranque
const PORT = process.env.PORT || 10000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de Aling corriendo en puerto ${PORT}`);
  });
}).catch(err => {
  console.error('Error al conectar con Neon:', err);
});