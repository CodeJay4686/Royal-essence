document.getElementById("customer-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const customer = {
    name: document.getElementById("cust-name").value,
    phone: document.getElementById("cust-phone").value,
    location: document.getElementById("cust-location").value,
  };

  // 1️⃣ GET CART FROM SERVER
  const cartRes = await fetch("/cart");
  const cart = await cartRes.json();

  // 2️⃣ SAVE CART TO SESSION (IMPORTANT)
  await fetch("/payment/save-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart }),
  });

  // 3️⃣ SAVE CUSTOMER TO SESSION
  await fetch("/payment/save-customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });

  // 4️⃣ CALCULATE TOTAL
  let total = 0;
  Object.values(cart).forEach(item => {
    total += item.price * (item.quantity || 1);
  });

  // 5️⃣ START FLUTTERWAVE PAYMENT
  FlutterwaveCheckout({
    public_key: window.FLW_PUBLIC_KEY,
    tx_ref: "RE-" + Date.now(),
    amount: total,
    currency: "NGN",
    payment_options: "card,banktransfer,ussd",
    redirect_url: `${window.location.origin}/payment/verify`,
    customer: {
      email: "customer@royalessence.com",
      phone_number: customer.phone,
      name: customer.name,
    },
    customizations: {
      title: "Royal Essence",
      description: "Perfume Purchase",
      logo: "/images/logo.png",
    },
  });
});
