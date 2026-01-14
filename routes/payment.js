require("dotenv").config();

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const ordersFile = path.join(__dirname, "../data/orders.json");

/* ======================================================
   LOCAL ORDER SAVE
====================================================== */

function saveOrder(order) {
  let orders = [];

  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile, "utf8"));
  }

  orders.push(order);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

function formatItemsForSheet(items = {}) {
  return Object.values(items)
    .map(i => `${i.name} (₦${i.price}) x ${i.quantity || 1}`)
    .join(", ");
}

/* ======================================================
   GOOGLE SHEETS
====================================================== */

async function saveOrderToGoogleSheet(order) {
  if (!process.env.GOOGLE_CREDS) {
    throw new Error("GOOGLE_CREDS missing");
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

  await sheet.addRow({
    "Order ID": order.transactionId,
    "Customer Name": order.customer.name,
    "WhatsApp": order.customer.whatsapp,
    "Location": order.customer.location,
    "Amount": order.amount,
    "Currency": order.currency,
    "Payment Ref": order.tx_ref,
    "Items": formatItemsForSheet(order.items),
    "Date": new Date().toLocaleString(),
  });
}

/* ======================================================
   SAVE CUSTOMER + CART (BEFORE PAYMENT)
====================================================== */

router.post("/save-customer", (req, res) => {
  req.session.customer = {
    name: req.body.name,
    whatsapp: req.body.phone,
    location: req.body.location,
  };

  res.json({ saved: true });
});

router.post("/save-cart", (req, res) => {
  req.session.cart = req.body.cart || {};
  res.json({ saved: true });
});

/* ======================================================
   VERIFY PAYMENT (AFTER FLUTTERWAVE REDIRECT)
====================================================== */

router.get("/verify", async (req, res) => {
  const { transaction_id, tx_ref } = req.query;

  if (!transaction_id) {
    console.error("❌ Missing transaction_id");
    return res.redirect("/cart.html");
  }

  if (!req.session.cart || !req.session.customer) {
    console.error("❌ Session lost on redirect");
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

    if (!["successful", "completed"].includes(payment.status)) {
      console.error("❌ Payment not successful:", payment.status);
      return res.redirect("/cart.html");
    }
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
    return res.redirect("/cart.html");
  }

  /* ======================================================
     BUILD ORDER
  ====================================================== */

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

  /* ======================================================
     SAVE ORDER
  ====================================================== */

  try {
    saveOrder(order);
    await saveOrderToGoogleSheet(order);
    console.log("✅ Order saved (local + sheet)");
  } catch (err) {
    console.error("❌ Order save error:", err.message);
  }

  /* ======================================================
     CLEAR SESSION
  ====================================================== */

  req.session.cart = null;
  req.session.customer = null;

  return res.redirect("/success.html");
});

module.exports = router;
