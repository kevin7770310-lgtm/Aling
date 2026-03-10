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

// --- CONFIGURACIÓN DE RESEND ---
const resend = new Resend('re_PhirtQEh_6B4Hf96RvoMT6LVBeWjNT4Sa');

// --- CONEXIÓN A LA BASE DE DATOS (NEON) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

// --- MODELO DE PRODUCTO ACTUALIZADO ---
const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  factoryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true }, // 🚀 Nueva columna para acceso total
  weightKg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  }
});

sequelize.sync({ alter: true }) // 'alter: true' actualiza la tabla si agregas columnas
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

// Crear producto (Insertar con imagen desde el celular)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const newProduct = await Product.create({
      name: req.body.name,
      factoryPrice: req.body.factoryPrice,
      description: req.body.description, // Soporte para descripción
      imageUrl: req.file ? req.file.path : 'https://via.placeholder.com/300'
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ error: 'Error interno al crear producto' });
  }
});

// Actualizar producto (Acceso total: Nombre, Precio, Descripción e Imagen)
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice, description } = req.body;
    const updateData = {
      name,
      factoryPrice: parseFloat(factoryPrice),
      description
    };

    // Si el admin selecciona una nueva imagen desde los archivos del celular
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    await Product.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Producto actualizado con éxito' });
  } catch (error) {
    console.error('❌ Error al actualizar:', error);
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

// --- CHECKOUT Y ENVÍO DE FACTURA ---
app.post('/api/checkout', async (req, res) => {
  const { email, totalAmount, address } = req.body; 

  try {
    const data = await resend.emails.send({
      from: 'Aling Mayorista <onboarding@resend.dev>',
      to: email,
      subject: '📦 Confirmación de Pedido - Aling Mayorista',
      html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #ff5722; padding: 20px; text-align: center; color: white;">
            <h1>ALING MAYORISTA</h1>
          </div>
          <div style="padding: 30px;">
            <h2>Resumen de tu pedido</h2>
            <p><strong>Usuario:</strong> ${email}</p>
            <p><strong>Dirección de Entrega:</strong> ${address || 'Retiro en local'}</p>
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="font-size: 20px; color: #ff5722;"><strong>Total: $${totalAmount}</strong></p>
          </div>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #999;">
            Santo Domingo, Ecuador
          </div>
        </div>
      `,
    });
    res.status(200).json({ message: 'Pedido procesado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar factura' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});