const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");

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

// static files (html, css, js, images)
app.use(express.static(__dirname));

// home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// cart routes
app.use("/cart", cartRoutes);

// payment routes
app.use("/payment", paymentRoutes);

// ✅ ORDERS API (FOR RETOOL)
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

// start server (ALWAYS LAST)
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
