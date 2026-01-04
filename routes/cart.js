const express = require('express');
const router = express.Router();

/* backend product catalog */
const products = [
  { id: 1, name: "Baccarat Rouge 540", price: 100, image: "/images/asad.png" },
  { id: 2, name: "Dior Sauvage Elixir", price: 45000, image: "/images/Asad2.png" },
  { id: 3, name: "Tom Ford Oud Wood", price: 48000, image: "/images/jean_lowe.png" },
  { id: 4, name: "YSL Y EDP", price: 42000, image: "/images/Armaf-club-de-nuit-intense-man-eau-de-toilette-for-men.jpg" }
];

function getCart(req) {
  if (!req.session.cart) req.session.cart = {};
  return req.session.cart;
}

router.get('/', (req, res) => {
  res.json(getCart(req));
});

router.post('/add/:id', (req, res) => {
  const cart = getCart(req);
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (!cart[product.id]) {
    cart[product.id] = product;
  }

  res.json(cart);
});

router.post('/remove/:id', (req, res) => {
  const cart = getCart(req);
  delete cart[req.params.id];
  res.json(cart);
});

module.exports = router;
router.post("/clear", (req, res) => {
  req.session.cart = {};
  res.json({ cleared: true });
});