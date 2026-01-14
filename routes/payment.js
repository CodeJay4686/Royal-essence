require("dotenv").config();

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const router = express.Router();

/* =====================================================
   SAFE LOCAL ORDER SAVE (BACKUP ONLY)
===================================================== */

function saveOrder(order) {
  const dir = path.join(__dirname, "../data");
  const file = path.join(dir, "orders.json");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2));
  }

  const orders = JSON.parse(fs.readFileSync(file, "utf8"));
  orders.push(order);
  fs.writeFileSync(file, JSON.stringify(orders, null, 2));
}


/* =====================================================
   GOOGLE SHEETS SAVE (USING ENV VAR)
===================================================== */
function formatItemsForSheet(items = {}) {
  return Object.values(items)
    .map(item => `${item.name} (₦${item.price}) x ${item.quantity || 1}`)
    .join(", ");
}

async function saveOrderToGoogleSheet(order) {
  if (!process.env.GOOGLE_CREDS) {
    throw new Error("GOOGLE_CREDS env variable missing");
  }

  const creds = JSON.parse(process.env.GOOGLE_CREDS);

  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(
    "1fJG8T4hnNtW74d91zxi9ZkLXYIS8L3Nu_NeM-P4Or-k",
    auth
  );

  await doc.loadInfo();

  console.log("📄 SHEET TABS:", doc.sheetsByIndex.map(s => s.title));

  const sheet = doc.sheetsByIndex[0];
  console.log("✍️ WRITING TO TAB:", sheet.title);

  await sheet.addRow({
    "Order ID": order.transactionId,
    "Customer Name": order.customer.name,
    "WhatsApp": order.customer.whatsapp,
    "Location": order.customer.location,
    "Amount": order.amount,
    "Payment Ref": order.tx_ref,
    "Items": formatItemsForSheet(order.items),
    "Date": new Date().toLocaleString(),
  });
}


/* =====================================================
   SAVE CUSTOMER + CART BEFORE PAYMENT
===================================================== */

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

/* =====================================================
   VERIFY PAYMENT (FLUTTERWAVE CALLBACK)
===================================================== */

router.get("/verify", async (req, res) => {
  const { transaction_id } = req.query;

  console.log("VERIFY QUERY PARAMS:", req.query);

  if (!transaction_id) {
    return res.redirect("/success.html");
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
      return res.redirect("/success.html");
    }
  } catch (err) {
    console.error("FLUTTERWAVE VERIFY ERROR:", err.message);
    return res.redirect("/success.html");
  }

  const order = {
    transactionId: payment.id,
    tx_ref: req.query.tx_ref,
    amount: payment.amount,
    currency: payment.currency,
    customer: {
      name: req.session.customer?.name || "N/A",
      whatsapp: req.session.customer?.whatsapp || "N/A",
      location: req.session.customer?.location || "N/A",
      email: payment.customer?.email || "N/A",
    },
    items: req.session.cart || {},
    paidAt: new Date().toISOString(),
  };

  try {
    saveOrder(order);
  } catch (err) {
    console.error("LOCAL SAVE ERROR:", err.message);
  }

  try {
    await saveOrderToGoogleSheet(order);
    console.log("✅ Order saved to Google Sheets");
  } catch (err) {
    console.error("❌ Google Sheets error:", err.message);
  }

  req.session.cart = {};
  req.session.customer = null;

  return res.redirect("/success.html");
});

module.exports = router;


