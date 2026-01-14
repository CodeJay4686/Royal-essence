const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const cartRoutes = require("./routes/cart");
const promoCartRoutes = require("./routes/promoCart");
const paymentRoutes = require("./routes/payment");

const app = express();

/* ✅ REQUIRED FOR RENDER / PROXY HOSTING */
app.set("trust proxy", 1);

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SESSION (NOW ACTUALLY WORKS ONLINE)
app.use(
  session({
    name: "royal-essence-session",
    secret: "royal-essence-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "none",
      secure: true,
    },
  })
);

// static files
app.use(express.static(__dirname));

// routes
app.use("/cart", cartRoutes);
app.use("/promo-cart", promoCartRoutes);
app.use("/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

