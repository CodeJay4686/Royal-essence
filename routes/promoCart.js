const express = require('express');
const router = express.Router();
const promoProducts = require('../promoProducts');

/**
 * Ensure promoCart exists in session
 */
router.use((req, res, next) => {
  if (!req.session.promoCart) {
    req.session.promoCart = {};
  }
  next();
});

// ADD TO PROMO CART
router.post('/add/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = promoProducts.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  req.session.promoCart[id] = {
    ...product,
    quantity: (req.session.promoCart[id]?.quantity || 0) + 1
  };

  res.json(req.session.promoCart);
});

// REMOVE FROM PROMO CART
router.post('/remove/:id', (req, res) => {
  delete req.session.promoCart[req.params.id];
  res.json(req.session.promoCart);
});

// GET PROMO CART
router.get('/', (req, res) => {
  res.json(req.session.promoCart);
});

module.exports = router;
