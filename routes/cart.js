const express = require('express');
const router = express.Router();
const path = require('path');

/* ✅ correct path based on your folder structure */
const products = require(path.join(__dirname, '../data/products.js'));

function getCart(req) {
  if (!req.session.cart) req.session.cart = {};
  return req.session.cart;
}

router.get('/', (req, res) => {
  res.json(getCart(req));
});

router.post('/add/:id', (req, res) => {
  const cart = getCart(req);
  const id = Number(req.params.id);

  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!cart[id]) {
    cart[id] = { ...product, quantity: 1 };
  } else {
    cart[id].quantity += 1;
  }

  res.json(cart);
});

router.post('/remove/:id', (req, res) => {
  const cart = getCart(req);
  delete cart[req.params.id];
  res.json(cart);
});

router.post('/clear', (req, res) => {
  req.session.cart = {};
  res.json({ cleared: true });
});

module.exports = router;
