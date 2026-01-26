const express = require('express');
const router = express.Router();

const products = require('../products.js');

function getCart(req) {
  if (!req.session.cart) req.session.cart = {};
  return req.session.cart;
}

/* ================= GET CART ================= */

router.get('/', (req, res) => {
  res.json(getCart(req));
});

/* ================= ADD TO CART (WITH QUANTITY) ================= */

router.post('/add/:id', (req, res) => {
  const cart = getCart(req);
  const id = Number(req.params.id);
  const quantity = Number(req.body.quantity) || 1;

  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!cart[id]) {
    cart[id] = { ...product, quantity };
  } else {
    cart[id].quantity += quantity;
  }

  res.json(cart);
});

/* ================= REMOVE FROM CART ================= */

router.post('/remove/:id', (req, res) => {
  const cart = getCart(req);
  delete cart[req.params.id];
  res.json(cart);
});

/* ================= CLEAR CART ================= */

router.post('/clear', (req, res) => {
  req.session.cart = {};
  res.json({ cleared: true });
});

module.exports = router;
