require("dotenv").config();

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const ordersFile = path.join(__dirname, "../data/orders.json");

/* ================= SAVE ORDER LOCALLY ================= */

function saveOrder(order) {
  const dir = path.join(__dirname, "../data");
  const file = path.join(dir, "orders.json");

  // ✅ Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ✅ Ensure file exists
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2));
  }

  // ✅ Now safely read + write
  const orders = JSON.parse(fs.readFileSync(file, "utf8"));
  orders.push(order);
  fs.writeFileSync(file, JSON.stringify(orders, null, 2));
}


/* ================= GOOGLE SHEETS ================= */
async function saveOrderToGoogleSheet(order) {
  if (!process.env.GOOGLE_CREDS) {
    throw new Error("GOOGLE_CREDS env variable missing");
  }

  const creds = JSON.parse(process.env.GOOGLE_CREDS);

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(
    "1fJG8T4hnNtW74d91zxi9ZkLXYIS8L3Nu_NeM-P4Or-k",
    serviceAccountAuth
  );

  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

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


/* ================= SAVE CUSTOMER BEFORE PAYMENT ================= */

router.post("/save-customer", (req, res) => {
  req.session.customer = {
    name: req.body.name,
    phone: req.body.phone,
    location: req.body.location,
  };
  res.json({ saved: true });
});

/* ================= SAVE CART BEFORE PAYMENT (ADDED) ================= */

router.post("/save-cart", (req, res) => {
  req.session.cart = req.body.cart || {};
  res.json({ saved: true });
});

/* ================= VERIFY PAYMENT ================= */

router.get("/verify", async (req, res) => {
  const { transaction_id, status, tx_ref } = req.query;

  console.log("VERIFY QUERY PARAMS:", req.query);

  // ✅ KEEP ORIGINAL VALIDATION
  if (!["successful", "completed"].includes(status) || !transaction_id) {
    return res.redirect("/success.html");
  }

  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const payment = response.data.data;

    if (payment.status !== "successful") {
      return res.redirect("/success.html");
    }

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

    // ✅ ALWAYS SAVE LOCALLY
    saveOrder(order);

    // ✅ TRY GOOGLE SHEETS, NEVER BLOCK USER
    try {
      await saveOrderToGoogleSheet(order);
      console.log("✅ Order saved to Google Sheets");
    } catch (sheetError) {
      console.error("❌ Google Sheets error:", sheetError.message);
    }

    // ✅ CLEAR SESSION
    req.session.cart = {};
    req.session.customer = null;

    // ✅ ALWAYS GO TO SUCCESS
    return res.redirect("/success.html");

  } catch (error) {
    console.error("VERIFY ERROR:", error.message);
    return res.redirect("/success.html");
  }
});

module.exports = router;


