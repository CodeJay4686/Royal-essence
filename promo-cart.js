/* ================= ADD TO CART ================= */
function addToCart(id) {
  fetch(`/cart/add/${id}`, { method: "POST" })
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
              <button onclick="removeFromCart('${item.id}')">Remove</button>
            </div>
          </div>
        `;
      });

      totalEl.textContent = `₦${total.toLocaleString()}`;
    })
    .catch(err => console.error("Load cart error:", err));
}

/* ================= PAYMENT MODAL ================= */
document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkout");
  const modal = document.getElementById("customer-modal");

  if (!checkoutBtn || !modal) return;

  checkoutBtn.addEventListener("click", e => {
    e.preventDefault();
    modal.classList.add("active");
  });
});
