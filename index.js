require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
const sequelize = require('./src/config/database');

// Importar Modelos
require('./src/models/Product');
require('./src/models/User');

// Importar Rutas
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Uso de Rutas
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// --- RUTA: AGREGAR PRODUCTOS (ADMIN) ---
app.post('/api/products', async (req, res) => {
  try {
    const Product = require('./src/models/Product');
    const { name, factoryPrice, weightKg, imageUrl, category } = req.body;
    
    const newProduct = await Product.create({
      name,
      factoryPrice,
      weightKg: weightKg || 1.0,
      imageUrl,
      category: category || 'General'
    });
    
    res.status(201).json({ message: 'Producto agregado con éxito', product: newProduct });
  } catch (error) {
    console.error('❌ Error al guardar producto:', error);
    res.status(500).json({ message: 'Error al guardar el producto' });
  }
});

// --- RUTA MAESTRA: CHECKOUT Y ENVÍO DE FACTURA REAL ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { email, totalAmount } = req.body;

    // 1. Validar datos básicos
    if (!email || !totalAmount) {
      return res.status(400).json({ message: 'Faltan datos para el checkout' });
    }

    // 2. Configurar el transporte usando las variables del .env
    // 🔥 IMPORTANTE: Asegúrate que en tu .env EMAIL_PASS=lsiqleaznahvdfav
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
      }
    });

    // 3. Diseño de la factura en HTML
    const mailOptions = {
      from: `"Aling Mayorista" <${process.env.EMAIL_USER}>`, 
      to: email,
      subject: '🧾 Tu Comprobante de Compra en Aling',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; border: 1px solid #e0e0e0; border-radius: 15px; max-width: 600px; margin: auto;">
          <div style="text-align: center;">
            <h1 style="color: #FF5722; margin-bottom: 5px;">ALING</h1>
            <p style="color: #757575; font-size: 14px;">Importaciones B2B - Santo Domingo, Ecuador</p>
          </div>
          
          <div style="background-color: #FFF3E0; padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
            <h2 style="margin: 0; color: #E64A19;">¡Pago Confirmado!</h2>
            <p style="margin: 5px 0 0 0; color: #5D4037;">Gracias por tu preferencia.</p>
          </div>

          <div style="padding: 10px 0;">
            <p><strong>Detalle de la transacción:</strong></p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Monto Total:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; font-size: 20px; color: #FF5722;">$${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Estado:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #4CAF50; font-weight: bold;">Completado</td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">Enviado a:</td>
                <td style="padding: 10px 0; text-align: right; color: #757575;">${email}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #424242; margin-top: 25px;">
            Tu pedido ya está siendo procesado en nuestra bodega. Un agente de Aling se contactará contigo para coordinar la logística de entrega.
          </p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 11px; color: #9E9E9E; text-align: center;">
            Este es un documento informativo generado automáticamente por Aling App.<br>
            © 2026 Aling Mayorista. Todos los derechos reservados.
          </p>
        </div>
      `
    };

    // 4. Ejecutar el envío
    await transporter.sendMail(mailOptions);
    console.log(`✅ Factura enviada con éxito a: ${email}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Checkout procesado y factura enviada' 
    });

  } catch (error) {
    console.error('❌ Error en el proceso de Checkout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar el pago o enviar el correo',
      error: error.message 
    });
  }
});

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.send({ message: 'API Aling Mayorista activa y lista' });
});

// Busca donde dice const PORT = ...
const PORT = process.env.PORT || 3000; 

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Base de datos en Neon conectada');
    
    // 🔥 CAMBIO CLAVE: Agregamos '0.0.0.0' para que Render pueda "ver" el servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor Aling corriendo en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Fallo al conectar con la base de datos:', err);
  });