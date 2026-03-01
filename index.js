// Instalar: npm install cloudinary multer-storage-cloudinary multer
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aling_products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// RUTA PARA RECIBIR PRODUCTO CON IMAGEN REAL
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, factoryPrice } = req.body;
    const imageUrl = req.file.path; // URL permanente de Cloudinary

    const newProduct = await Product.create({
      name,
      factoryPrice: parseFloat(factoryPrice),
      imageUrl,
      category: 'General',
      weightKg: 1.0
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al subir a la nube' });
  }
});