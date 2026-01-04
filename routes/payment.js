require("dotenv").config();

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const ordersFile = path.join(__dirname, "../data/orders.json");

// ================= SAVE ORDER LOCALLY =================
function saveOrder(order) {
  const orders = JSON.parse(fs.readFileSync(ordersFile, "utf8"));
  orders.push(order);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

function formatItemsForSheet(items = {}) {
  return Object.values(items)
    .map(item => `${item.name} (₦${item.price})`)
    .join(", ");
}

// ================= SAVE ORDER TO GOOGLE SHEETS =================
async function saveOrderToGoogleSheet(order) {
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
  const sheet = doc.sheetsByIndex[0];

  await sheet.addRow({
    "Order ID": order.transactionId,
    "Customer Name": order.customer?.name || "N/A",
    "WhatsApp": order.customer?.whatsapp || "N/A",
    "Location": order.customer?.location || "N/A",
    "Amount": order.amount,
    "Payment Ref": order.tx_ref,
    "Items": formatItemsForSheet(order.items),
    "Date": new Date().toLocaleString(),
  });
}

// ================= VERIFY PAYMENT =================
router.get("/verify", async (req, res) => {
  const { transaction_id, status, tx_ref } = req.query;

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

    if (payment.status !== "successful") {
      return res.redirect("/success.html");
    }

  } catch (err) {
    console.error("❌ Verification failed:", err.message);
    return res.redirect("/success.html");
  }

  // ✅ BUILD ORDER (never crash)
  const order = {
    transactionId: payment.id,
    tx_ref,
    amount: payment.amount,
    currency: payment.currency,
    customer: {
      name: req.session.customer?.name || "N/A",
      whatsapp: req.session.customer?.phone || "N/A",
      location: req.session.customer?.location || "N/A",
      email: payment.customer?.email || "N/A",
    },
    items: req.session.cart || {},
    paidAt: new Date().toISOString(),
  };

  // ✅ SAVE LOCALLY (must succeed)
  try {
    saveOrder(order);
  } catch (e) {
    console.error("❌ Local save failed:", e.message);
  }

  // ✅ SAVE TO GOOGLE SHEETS (optional)
  try {
    await saveOrderToGoogleSheet(order);
    console.log("✅ Order saved to Google Sheets");
  } catch (e) {
    console.error("❌ Sheets error:", e.message);
  }

  // ✅ CLEAR SESSION
  req.session.cart = {};
  req.session.customer = null;

  // ✅ ALWAYS REDIRECT
  return res.redirect("/success.html");
});

// ================= SAVE CUSTOMER BEFORE PAYMENT =================
router.post("/save-customer", (req, res) => {
  req.session.customer = {
    name: req.body.name,
    phone: req.body.phone,
    location: req.body.location,
  };
  res.json({ saved: true });
});

module.exports = router;
