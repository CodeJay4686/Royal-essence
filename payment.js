document.addEventListener("DOMContentLoaded", () => {
  const payBtn = document.getElementById("checkout");
  const modal = document.getElementById("customer-modal");
  const form = document.getElementById("customer-form");

  if (!payBtn || !modal || !form) return;

  // Open modal
  payBtn.addEventListener("click", (e) => {
    e.preventDefault();
    modal.style.display = "flex";
  });

  // Submit customer details & start payment
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("cust-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const location = document.getElementById("cust-location").value.trim();

    const amount = Number(
      document
        .getElementById("cart-total")
        .innerText.replace(/[₦,]/g, "")
    );

    if (!name || !phone || !location || !amount) {
      alert("Please complete all fields");
      return;
    }

    // ✅ Save customer details in session
    await fetch("/payment/save-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, location }),
    });

    // ✅ Start Flutterwave payment
    payWithFlutterwave(amount, name, phone, location);
  });
});

/* ================= FLUTTERWAVE ================= */

function payWithFlutterwave(amount, name, phone, location) {
  const BASE_URL = window.location.origin;

  // ✅ AUTO-GENERATED EMAIL (user never sees it)
  const fakeEmail = `customer_${Date.now()}@royalessence.store`;

  FlutterwaveCheckout({
    public_key: window.FLW_PUBLIC_KEY,
    tx_ref: "RE-" + Date.now(),
    amount: amount,
    currency: "NGN",
    payment_options: "card, banktransfer, ussd",

    redirect_url: `${BASE_URL}/payment/verify`,

    customer: {
      email: fakeEmail,     // ✅ REQUIRED
      name: name,
      phone_number: phone,
    },

    customizations: {
      title: "Royal Essence",
      description: `Order by ${name} | ${phone} | ${location}`,
    },
  });
}
