require("dotenv").config();

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const router = express.Router();

/* ================= LOCAL BACKUP SAVE ================= */

function saveOrder(order) {
  const dir = path.join(__dirname, "../data");
  const file = path.join(dir, "orders.json");

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([], null, 2));

  const orders = JSON.parse(fs.readFileSync(file, "utf8"));
  orders.push(order);
  fs.writeFileSync(file, JSON.stringify(orders, null, 2));
}

/* ================= GOOGLE SHEETS HELPERS ================= */

function formatItemsForSheet(items = {}) {
  return Object.values(items)
    .map(i => `${i.name} (₦${i.price}) x ${i.quantity || 1}`)
    .join(", ");
}

async function ensureHeaders(sheet) {
  const headers = [
    "Order ID",
    "Customer Name",
    "WhatsApp",
    "Location",
    "Amount",
    "Payment Ref",
    "Items",
    "Date",
  ];

  await sheet.loadHeaderRow();

  if (
    !sheet.headerValues ||
    sheet.headerValues.join() !== headers.join()
  ) {
    await sheet.setHeaderRow(headers);
  }
}

/* ================= GOOGLE SHEETS SAVE ================= */

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

  console.log("📄 SHEET TABS:", doc.sheetsByIndex.map(s => s.title));
  console.log("✍️ WRITING TO TAB:", sheet.title);

  await ensureHeaders(sheet);

  const row = await sheet.addRow({
    "Order ID": order.transactionId,
    "Customer Name": order.customer.name,
    "WhatsApp": order.customer.whatsapp,
    "Location": order.customer.location,
    "Amount": order.amount,
    "Payment Ref": order.tx_ref,
    "Items": formatItemsForSheet(order.items),
    "Date": new Date().toLocaleString(),
  });

  console.log("🧾 ROW WRITTEN AT:", row.rowNumber);
}

/* ================= SAVE CUSTOMER & CART ================= */

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

/* ================= VERIFY PAYMENT ================= */

router.get("/verify", async (req, res) => {
  const { transaction_id, tx_ref } = req.query;

  console.log("VERIFY QUERY PARAMS:", req.query);

  if (!transaction_id) return res.redirect("/success.html");

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
    tx_ref,
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
  } catch (e) {
    console.error("LOCAL SAVE ERROR:", e.message);
  }

  try {
    await saveOrderToGoogleSheet(order);
    console.log("✅ Order saved to Google Sheets");
  } catch (e) {
    console.error("❌ Google Sheets error:", e.message);
  }

  req.session.cart = {};
  req.session.customer = null;

  return res.redirect("/success.html");
});

module.exports = router;
