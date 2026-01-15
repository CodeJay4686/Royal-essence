document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("customer-form");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1️⃣ Collect customer data
    const customer = {
      name: document.getElementById("cust-name").value,
      phone: document.getElementById("cust-phone").value,
      location: document.getElementById("cust-location").value,
    };

    // ✅ DETERMINE WHICH CART TO USE
    const cartEndpoint =
      window.CART_TYPE === "promo" ? "/promo-cart" : "/cart";

    // 2️⃣ Get cart from backend
    const cartRes = await fetch(cartEndpoint);
    const cart = await cartRes.json();

    if (!Object.keys(cart).length) {
      alert("Your cart is empty");
      return;
    }

    // 3️⃣ Save cart + customer to session
    await fetch("/payment/save-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });

    await fetch("/payment/save-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });

    // 4️⃣ Calculate total
    let total = 0;
    Object.values(cart).forEach(item => {
      total += item.price * (item.quantity || 1);
    });

    // 5️⃣ START PAYMENT
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
      },
    });
  });
});
