function addToCart(id, btn = null) {
  let quantity = 1;

  // If this button comes from a product card with quantity selector
  if (btn) {
    const card = btn.closest(".perfume-card");
    if (card) {
      const qtyInput = card.querySelector(".qty-input");
      if (qtyInput) {
        quantity = parseInt(qtyInput.value) || 1;
      }
    }
  }

  fetch(`/cart/add/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ quantity })
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    })
    .then(() => {
      alert("Added to cart");
      loadCart();
    })
    .catch(err => {
      console.error(err);
      alert("Product not added");
    });
}


/* ================= REMOVE FROM CART ================= */

function removeFromCart(id) {
  fetch(`/cart/remove/${id}`, { method: "POST" })
    .then(res => res.json())
    .then(() => loadCart())
    .catch(err => console.error(err));
}

/* ================= LOAD CART ================= */

function loadCart() {
  fetch("/cart")
    .then(res => res.json())
    .then(cart => {
      const cartContainer = document.getElementById("cart-items");
      const totalEl = document.getElementById("cart-total");

      if (!cartContainer || !totalEl) return;

      cartContainer.innerHTML = "";
      let total = 0;

      Object.values(cart).forEach(item => {
        const qty = item.quantity || 1;
        total += item.price * qty;

        cartContainer.innerHTML += `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-info">
              <h3>${item.name}</h3>
              <p>₦${item.price.toLocaleString()}</p>
              <p>Qty: ${qty}</p>
              <button onclick="removeFromCart(${item.id})">Remove</button>
            </div>
          </div>
        `;
      });

      totalEl.textContent = `₦${total.toLocaleString()}`;
    })
    .catch(err => console.error("Load cart error:", err));
}

/* ================= QUANTITY + / - HANDLER ================= */

document.addEventListener("click", function (e) {
  if (!e.target.classList.contains("qty-btn")) return;

  const wrapper = e.target.closest(".quantity-wrapper");
  const input = wrapper.querySelector(".qty-input");
  let value = parseInt(input.value) || 1;

  if (e.target.dataset.action === "plus") value++;
  if (e.target.dataset.action === "minus" && value > 1) value--;

  input.value = value;
});

/* ================= CHECKOUT MODAL ================= */

document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkout");
  const modal = document.getElementById("customer-modal");

  if (!checkoutBtn || !modal) return;

  checkoutBtn.addEventListener("click", e => {
    e.preventDefault();
    modal.classList.add("active");
  });
});

