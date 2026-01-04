document.addEventListener("DOMContentLoaded", () => {
  const payBtn = document.getElementById("checkout");
  const modal = document.getElementById("customer-modal");
  const form = document.getElementById("customer-form");

  if (!payBtn || !modal || !form) return;

  payBtn.addEventListener("click", (e) => {
    e.preventDefault();
    modal.style.display = "flex";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("cust-name").value;
    const phone = document.getElementById("cust-phone").value;
    const location = document.getElementById("cust-location").value;

    const amount = Number(
      document.getElementById("cart-total").innerText.replace(/[₦,]/g, "")
    );

    // save customer details in session
fetch("/payment/save-customer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    phone,
    location
  })
});

    FlutterwaveCheckout({
      public_key: "FLWPUBK-55b9e90add3aea479bb56b23d5499031-X",
      tx_ref: "RE-" + Date.now(),
      amount,
      currency: "NGN",
      redirect_url: "http://localhost:3000/payment/verify",
      customer: {
        email: "order@royalessence.com",
        name
      },
      customizations: {
        title: "Royal Essence",
        description: `Name: ${name}, WhatsApp: ${phone}, Location: ${location}`
      }
    });
  });
});
