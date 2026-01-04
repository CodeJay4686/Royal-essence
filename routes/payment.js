require("dotenv").config();

const { GoogleSpreadsheet } = require("google-spreadsheet");
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
function formatItemsForSheet(items) {
  return Object.values(items)
    .map(item => `${item.name} (₦${item.price})`)
    .join(", ");
}
// ================= SAVE ORDER TO GOOGLE SHEETS =================
const { JWT } = require("google-auth-library");

async function saveOrderToGoogleSheet(order) {
  const creds = require("../google-credentials.json");

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
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


// ================= VERIFY PAYMENT =================
router.get("/verify", async (req, res) => {
  const { transaction_id, status, tx_ref } = req.query;

  console.log("VERIFY QUERY PARAMS:", req.query);

  if (!["successful", "completed"].includes(status) || !transaction_id) {
    return res.status(400).send("Invalid payment response");
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
      return res.status(400).send("Payment not successful");
    }

    const order = {
      transactionId: payment.id,
      tx_ref,
      amount: payment.amount,
      currency: payment.currency,
      customer: {
        name: req.session.customer?.name,
        whatsapp: req.session.customer?.phone,
        location: req.session.customer?.location,
        email: payment.customer.email,
      },
      items: req.session.cart,
      paidAt: new Date().toISOString(),
    };

// ✅ ALWAYS SAVE LOCALLY
saveOrder(order);

// ✅ TRY GOOGLE SHEETS, BUT NEVER BLOCK PAYMENT
try {
  await saveOrderToGoogleSheet(order);
  console.log("✅ Order saved to Google Sheets");
} catch (sheetError) {
  console.error("❌ Google Sheets error:", sheetError.message);
}

// ✅ CLEAR SESSION
req.session.cart = {};
req.session.customer = null;

// ✅ ALWAYS REDIRECT ON SUCCESSFUL PAYMENT
return res.redirect("/success.html");


  } catch (error) {
    console.error("FULL ERROR OBJECT:", error);
    console.error("ERROR MESSAGE:", error.message);
    console.error("STACK TRACE:", error.stack);

    return res
      .status(500)
      .send("Payment received but verification is pending.");
  }
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
