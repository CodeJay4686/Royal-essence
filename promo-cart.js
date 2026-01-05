function addToPromoCart(id) {
  fetch(`/promo-cart/add/${id}`, { method: 'POST' })
    .then(res => res.json())
    .then(() => alert('Added to promo cart'))
    .catch(() => alert('Failed to add'));
}

function removeFromPromoCart(id) {
  fetch(`/promo-cart/remove/${id}`, { method: 'POST' })
    .then(() => loadPromoCart());
}

function loadPromoCart() {
  fetch('/promo-cart')
    .then(res => res.json())
    .then(cart => {
      const container = document.getElementById('cart-items');
      const totalEl = document.getElementById('cart-total');
      const checkoutBtn = document.getElementById('checkout');

      container.innerHTML = '';
      let total = 0;
      let message = 'Hello, I would like to order (New User Promo):%0A';

      Object.values(cart).forEach(item => {
        total += item.price * item.quantity;

        container.innerHTML += `
          <div class="cart-item">
            <img src="${item.image}">
            <div>
              <h3>${item.name}</h3>
              <p>₦${item.price.toLocaleString()} × ${item.quantity}</p>
              <button onclick="removeFromPromoCart(${item.id})">Remove</button>
            </div>
          </div>
        `;

        message += `${item.name} × ${item.quantity} - ₦${item.price * item.quantity}%0A`;
      });

      totalEl.textContent = `₦${total.toLocaleString()}`;
      checkoutBtn.href = `https://wa.me/2349129232610?text=${message}`;
    });
}
