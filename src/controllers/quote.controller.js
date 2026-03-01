// Lógica para calcular costos
const calculateQuote = (factoryPrice, weight, quantity) => {
  const SHIPPING_COST_PER_KG = 10; // Ejemplo: $10 por kilo desde China
  const TAX_IMPORT = 0.15;        // 15% de aranceles promedio
  const OUR_COMMISSION = 0.05;    // Tu ganancia (5%)

  const subtotalProducts = factoryPrice * quantity;
  const shippingTotal = weight * quantity * SHIPPING_COST_PER_KG;
  const importFees = subtotalProducts * TAX_IMPORT;
  
  const baseCost = subtotalProducts + shippingTotal + importFees;
  const totalWithCommission = baseCost * (1 + OUR_COMMISSION);

  return {
    unitPriceFinal: (totalWithCommission / quantity).toFixed(2),
    totalOrder: totalWithCommission.toFixed(2),
    profitForUs: (baseCost * OUR_COMMISSION).toFixed(2)
  };
};

exports.getMockQuote = async (req, res) => {
  const { productId, quantity, hasBranding } = req.body;
  // Aquí luego buscaremos el producto en la DB
  // Por ahora devolvemos un cálculo de prueba
  const result = calculateQuote(5.00, 0.5, quantity); 
  res.json(result);
};