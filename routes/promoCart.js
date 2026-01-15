const express = require("express");
const router = express.Router();
const promoProducts = require("../promoProducts");

// GLOBAL PROMO CART (KEYED BY IP)
const promoCarts = {};

// Helper to identify user
function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress;
}

// ADD TO PROMO CART
router.post("/add/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = promoProducts.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const key = getClientKey(req);

  if (!promoCarts[key]) {
    promoCarts[key] = {};
  }

  promoCarts[key][id] = {
    ...product,
    quantity: (promoCarts[key][id]?.quantity || 0) + 1
  };

  res.json(promoCarts[key]);
});

// REMOVE FROM PROMO CART
router.post("/remove/:id", (req, res) => {
  const key = getClientKey(req);
  if (promoCarts[key]) {
    delete promoCarts[key][req.params.id];
  }
  res.json(promoCarts[key] || {});
});

// GET PROMO CART
router.get("/", (req, res) => {
  const key = getClientKey(req);
  res.json(promoCarts[key] || {});
});

module.exports = router;
