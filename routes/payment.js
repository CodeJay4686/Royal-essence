require("dotenv").config();

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const router = express.Router();
const ordersFile = path.join(__dirname, "../data/orders.json");

/* =====================================================
   LOCAL SAVE (BACKUP)
===================================================== */

function saveOrderLocally(order) {
  let orders = [];

  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile, "utf8"));
  }

  orders.push(order);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

/* =====================================================
   GOOGLE SHEETS
===================================================== */

async function saveOrderToGoogleSheet(order) {
  if (!process.env.GOOGLE_CREDS) {
    throw new Error("GOOGLE_CREDS env variable missing");
  }

  const creds = JSON.parse(process.env.GOOGLE_CREDS);

  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(
    "1fJG8T4hnNtW74d91zxi9ZkLXYIS8L3Nu_NeM-P4Or-k",
    auth
  );

  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  const itemsString = Object.values(order.items)
    .map(i => `${i.name} (₦${i.price}) x ${i.quantity || 1}`)
    .join(", ");

  await sheet.addRow({
    "Order ID": order.transactionId,
    "Customer Name": order.customer.name,
    "WhatsApp": order.customer.whatsapp,
    "Location": order.customer.location,
    "Amount": order.amount,
    "Currency": order.currency,
    "Payment Ref": order.tx_ref,
    "Items": itemsString,
    "Date": new Date().toLocaleString(),
  });
}

/* =====================================================
   SAVE CUSTOMER + CART (BEFORE PAYMENT)
===================================================== */

router.post("/save-customer", (req, res) => {
  req.session.customer = {
    name: req.body.name,
    whatsapp: req.body.phone,
    location: req.body.location,
  };

  console.log("✅ CUSTOMER SAVED:", req.session.customer);
  res.json({ saved: true });
});

router.post("/save-cart", (req, res) => {
  req.session.cart = req.body.cart || {};
  console.log("✅ CART SAVED:", req.session.cart);
  res.json({ saved: true });
});

/* =====================================================
   VERIFY PAYMENT (AFTER FLUTTERWAVE)
===================================================== */

router.get("/verify", async (req, res) => {
  const { transaction_id, tx_ref } = req.query;

  console.log("🔍 VERIFY HIT:", req.query);

  if (!transaction_id) {
    console.error("❌ Missing transaction_id");
    return res.redirect("/cart.html");
  }

  if (!req.session.cart || !req.session.customer) {
    console.error("❌ SESSION LOST", {
      cart: req.session.cart,
      customer: req.session.customer,
    });
    return res.redirect("/cart.html");
  }

  let payment;

  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    payment = response.data.data;

    console.log("✅ FLUTTERWAVE VERIFIED:", payment.status);

    if (!["successful", "completed"].includes(payment.status)) {
      console.error("❌ Payment not successful:", payment.status);
      return res.redirect("/cart.html");
    }
  } catch (err) {
    console.error("❌ FLUTTERWAVE VERIFY ERROR:", err.response?.data || err);
    return res.redirect("/cart.html");
  }

  /* ================= BUILD ORDER ================= */

  const order = {
    transactionId: payment.id,
    tx_ref,
    amount: payment.amount,
    currency: payment.currency,
    customer: {
      name: req.session.customer.name,
      whatsapp: req.session.customer.whatsapp,
      location: req.session.customer.location,
      email: payment.customer?.email || "N/A",
    },
    items: req.session.cart,
    paidAt: new Date().toISOString(),
  };

  console.log("📦 ORDER BUILT:", order);

  /* ================= SAVE ORDER ================= */

  try {
    saveOrderLocally(order);
    await saveOrderToGoogleSheet(order);
    console.log("✅ ORDER SAVED TO GOOGLE SHEETS");
  } catch (err) {
    console.error("❌ GOOGLE SHEETS SAVE FAILED:", err);
    return res.redirect("/cart.html");
  }

  /* ================= CLEAR SESSION ================= */

  req.session.cart = null;
  req.session.customer = null;

  return res.redirect("/success.html");
});

module.exports = router;
