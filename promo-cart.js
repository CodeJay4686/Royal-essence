function addToPromoCart(id) {
  fetch(`/promo-cart/add/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log('Promo cart:', data);
      alert('Added to promo cart');
    })
    .catch(err => {
      console.error('Add promo cart error:', err);
      alert('Failed to add to promo cart');
    });
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

      if (!container || !totalEl || !checkoutBtn) return;

      container.innerHTML = '';
      let total = 0;
      let message = 'Hello, I would like to order (New User Promo):%0A';

      Object.values(cart).forEach(item => {
        total += item.price * item.quantity;

        container.innerHTML += `
          <div class="cart-item">
            <img src="${item.image}">
            <div class="cart-info">
              <h3>${item.name}</h3>
              <p>₦${item.price.toLocaleString()} × ${item.quantity}</p>
              <button class="remove-btn"
                onclick="removeFromPromoCart(${item.id})">
                Remove
              </button>
            </div>
          </div>
        `;

        message += `${item.name} × ${item.quantity} - ₦${item.price * item.quantity}%0A`;
      });

      totalEl.textContent = `₦${total.toLocaleString()}`;
      checkoutBtn.href = `https://wa.me/2349129232610?text=${message}`;
    })
    .catch(err => console.error('Load promo cart error:', err));
}
