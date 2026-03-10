require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { Resend } = require('resend');

const app = express();

// 🚀 1. CORS CONFIGURADO PARA TRABAJO REAL
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
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sellerEmail: { type: DataTypes.STRING, allowNull: false } // 🚀 Requerido
});

sequelize.sync({ alter: true }) 
  .then(() => console.log('✅ Base de datos sincronizada'))
  .catch(err => console.error('❌ Error DB:', err));

// --- RUTAS ---

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// 🚀 2. RUTA CORREGIDA: Ahora sí guarda el sellerEmail del Marketplace
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice, description, sellerEmail } = req.body; // Extraemos sellerEmail
    
    const newProduct = await Product.create({
      name,
      factoryPrice,
      description,
      sellerEmail: sellerEmail || 'admin@aling.com', // Backup por si falla el front
      imageUrl: req.file ? req.file.path : 'https://via.placeholder.com/300'
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('❌ Error en POST /api/products:', error);
    res.status(500).json({ error: 'Faltan datos obligatorios o error de servidor' });
  }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice, description } = req.body;
    const updateData = {
      name,
      factoryPrice: parseFloat(factoryPrice),
      description
    };
    if (req.file) updateData.imageUrl = req.file.path;

    await Product.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// 🚀 3. CHECKOUT ROBUSTO (Resuelve el error del botón naranja)
app.post('/api/checkout', async (req, res) => {
  const { email, totalAmount, address } = req.body; 

  if (!email || !totalAmount) {
    return res.status(400).json({ error: 'Faltan datos para procesar el pago' });
  }

  try {
    await resend.emails.send({
      from: 'Aling Mayorista <onboarding@resend.dev>',
      to: email,
      subject: '📦 Confirmación de Pedido - Aling Mayorista',
      html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #ff5722; padding: 20px; text-align: center; color: white;">
            <h1>ALING MAYORISTA</h1>
          </div>
          <div style="padding: 30px;">
            <h2>¡Hola! Hemos recibido tu pedido.</h2>
            <p><strong>Comprador:</strong> ${email}</p>
            <p><strong>Dirección de Entrega:</strong> ${address}</p>
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="font-size: 20px; color: #ff5722;"><strong>Total a Pagar: $${totalAmount}</strong></p>
            <p style="font-size: 12px; color: #666;">Pronto un vendedor se pondrá en contacto contigo.</p>
          </div>
        </div>
      `,
    });
    res.status(200).json({ message: 'Factura enviada' });
  } catch (error) {
    console.error("Error Resend:", error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});