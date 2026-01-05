const express = require('express');
const router = express.Router();
const promoProducts = require('..promoProducts.js');

let promoCart = {};

// ADD TO PROMO CART
router.post('/add/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = promoProducts.find(p => p.id === id);

  if (!product) return res.status(404).json({ error: 'Not found' });

  promoCart[id] = {
    ...product,
    quantity: (promoCart[id]?.quantity || 0) + 1
  };

  res.json(promoCart);
});

// REMOVE FROM PROMO CART
router.post('/remove/:id', (req, res) => {
  delete promoCart[req.params.id];
  res.json(promoCart);
});

// GET PROMO CART
router.get('/', (req, res) => {
  res.json(promoCart);
});

module.exports = router;


