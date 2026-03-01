const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// Cuando la app llame a esta ruta, se ejecuta el controlador
router.get('/', productController.getProducts);

module.exports = router;