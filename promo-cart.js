function addToPromoCart(id) {
  fetch(`/promo-cart/add/${id}`, {
    method: "POST"
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed");
      return res.json();
    })
    .then(() => {
      alert("Added to cart");
    })
    .catch(err => {
      console.error(err);
      alert("Product not added");
    });
}

function removeFromPromoCart(id) {
  fetch(`/promo-cart/remove/${id}`, {
    method: "POST"
  })
    .then(res => res.json())
    .then(() => loadPromoCart());
}

function loadPromoCart() {
  fetch("/promo-cart")
    .then(res => res.json())
    .then(cart => {
      const cartContainer = document.getElementById("cart-items");
      const totalEl = document.getElementById("cart-total");

      if (!cartContainer || !totalEl) return;

      cartContainer.innerHTML = "";
      let total = 0;

      Object.values(cart).forEach(item => {
        total += item.price * item.quantity;

        cartContainer.innerHTML += `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-info">
              <h3>${item.name}</h3>
              <p>₦${item.price.toLocaleString()}</p>
              <p>Qty: ${item.quantity}</p>
              <button onclick="removeFromPromoCart(${item.id})">Remove</button>
            </div>
          </div>
        `;
      });

      totalEl.textContent = `₦${total.toLocaleString()}`;
    })
    .catch(err => console.error(err));
}

document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkout");
  const modal = document.getElementById("customer-modal");

  if (!checkoutBtn || !modal) return;

  checkoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    modal.classList.add("active");
  });
});

