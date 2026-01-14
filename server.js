const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const cartRoutes = require("./routes/cart");
const promoCartRoutes = require("./routes/promoCart");
const paymentRoutes = require("./routes/payment");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= SESSION (FIXED) =================
app.use(
  session({
    name: "royal-essence-session",
    secret: "royal-essence-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// ================= STATIC FILES =================
app.use(express.static(__dirname));

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use("/cart", cartRoutes);
app.use("/promo-cart", promoCartRoutes);
app.use("/payment", paymentRoutes);

// ================= ORDERS API =================
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

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
