require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { Resend } = require('resend'); // 🚀 Cambio a Resend

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

// --- CONFIGURACIÓN DE RESEND (REEMPLAZA A NODEMAILER) ---
// Usamos directamente tu llave para asegurar el funcionamiento inmediato
const resend = new Resend('re_PhirtQEh_6B4Hf96RvoMT6LVBeWjNT4Sa'); 

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
  weightKg: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: true, 
    defaultValue: 0.00 
  }
});

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

// --- CHECKOUT Y ENVÍO DE FACTURA CON RESEND ---
app.post('/api/checkout', async (req, res) => {
  const { email, totalAmount } = req.body;
  console.log(`📩 Intentando enviar factura a: ${email}`);

  try {
    // 🚀 Resend utiliza HTTPS (Puerto 443), por lo que Render no lo bloquea
    const data = await resend.emails.send({
      from: 'Aling Mayorista <onboarding@resend.dev>',
      to: email, // kevin7770310@gmail.com
      subject: 'Confirmación de Pedido - Aling Mayorista',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ff5722;">¡Gracias por tu compra!</h2>
          <p>Hola, hemos recibido tu pedido en <strong>Aling Mayorista</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 18px;"><strong>Total a pagar: $${totalAmount}</strong></p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888;">Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      `,
    });

    console.log("✅ Factura enviada vía Resend:", data);
    return res.status(200).json({ message: 'Pedido exitoso y factura enviada' });

  } catch (error) {
    console.error("❌ Error crítico en el checkout (Resend):", error);
    // Respondemos con JSON para que Flutter pueda mostrar el error y no se quede cargando
    return res.status(500).json({ error: 'Error al procesar el envío de la factura' });
  }
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});