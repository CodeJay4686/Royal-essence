function addToCart(id) {
  fetch(`/cart/add/${id}`, { method: "POST" })
    .then(res => {
      if (!res.ok) throw new Error("Failed to add");
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

function removeFromCart(id) {
  fetch(`/cart/remove/${id}`, { method: "POST" })
    .then(res => res.json())
    .then(() => loadCart());
}

function loadCart() {
  fetch("/cart")
    .then(res => res.json())
    .then(cart => {
      const cartContainer = document.getElementById("cart-items");
      const totalEl = document.getElementById("cart-total");
      const checkoutBtn = document.getElementById("checkout");

      if (!cartContainer || !totalEl || !checkoutBtn) return;

      cartContainer.innerHTML = "";
      let total = 0;
      let message = "Hello, I would like to order:%0A";

      Object.values(cart).forEach(item => {
        total += item.price * (item.quantity || 1);

        cartContainer.innerHTML += `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-info">
              <h3>${item.name}</h3>
              <p>₦${item.price.toLocaleString()}</p>
              <button onclick="removeFromCart(${item.id})">Remove</button>
            </div>
          </div>
        `;

        message += `${item.name} - ₦${item.price}%0A`;
      });

      totalEl.textContent = `₦${total.toLocaleString()}`;
      checkoutBtn.href = `https://wa.me/2349129232610?text=${message}`;
    })
    .catch(err => console.error("Load cart error:", err));
}
