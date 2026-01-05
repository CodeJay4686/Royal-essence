const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const promoCartRoutes = require("./routes/promoCart"); // ✅ ADD THIS

const app = express();

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session
app.use(
  session({
    secret: "royal-essence-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// static files
app.use(express.static(__dirname));

// home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// normal cart
app.use("/cart", cartRoutes);

// ✅ PROMO CART (THIS FIXES YOUR ERROR)
app.use("/promo-cart", promoCartRoutes);

// payment
app.use("/payment", paymentRoutes);

// orders api
app.get("/api/orders", (req, res) => {
  const ordersPath = path.join(__dirname, "data/orders.json");

  try {
    const orders = JSON.parse(fs.readFileSync(ordersPath, "utf8"));
    res.json(orders);
  } catch (err) {
    console.error("Failed to read orders:", err);
    res.status(500).json({ error: "Unable to load orders" });
  }
});

// start server
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
