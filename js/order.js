function renderCartList() {
  const cart = getCart();
  const listEl = document.getElementById('cartList');
  const emptyEl = document.getElementById('emptyCart');
  const summaryBox = document.getElementById('orderSummaryBox');

  if (cart.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = '';
    summaryBox.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  summaryBox.style.display = '';

  const e = window.escapeHtml || (s => s);
  listEl.innerHTML = cart.map(item => `
    <div class="cart-row" data-id="${e(item.id)}">
      <div class="thumb"><img src="${e(item.img)}" alt="${e(item.name)}"></div>
      <div>
        <div class="name">${e(item.name)}</div>
        <div class="cat">${e(item.unit)} · ${e(window.formatEur(item.price))} · ${e(window.formatBgn(item.price))}</div>
      </div>
      <div class="qty-control">
        <button type="button" class="qty-minus" aria-label="Намали">−</button>
        <span>${e(item.qty)}</span>
        <button type="button" class="qty-plus" aria-label="Увеличи">+</button>
      </div>
      <button type="button" class="remove-btn">Премахни</button>
    </div>
  `).join('');

  const total = getCartTotal();
  document.getElementById('sumCount').textContent = getCartCount();
  document.getElementById('sumTotal').innerHTML =
    `${e(window.formatEur(total))} <span class="price-bgn">${e(window.formatBgn(total))}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === '1') {
    saveCart([]);
    document.getElementById('successMessage').style.display = '';
    document.getElementById('orderContent').style.display = 'none';
    return;
  }

  renderCartList();

  document.getElementById('cartList').addEventListener('click', e => {
    const row = e.target.closest('.cart-row');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.classList.contains('qty-plus')) changeQty(id, 1);
    if (e.target.classList.contains('qty-minus')) changeQty(id, -1);
    if (e.target.classList.contains('remove-btn')) removeFromCart(id);
    renderCartList();
  });

  const form = document.getElementById('orderForm');
  form.addEventListener('submit', e => {
    const cart = getCart();
    if (cart.length === 0) {
      e.preventDefault();
      showToast('Заявката е празна');
      return;
    }
    const summary = cart.map(i => {
      const lineEur = i.qty * parseFloat(i.price);
      return `${i.name} x${i.qty} (${i.unit}) — ${window.formatEur(lineEur)} / ${window.formatBgn(lineEur)}`;
    }).join('\n');
    const total = getCartTotal();
    document.getElementById('orderItemsField').value =
      summary + `\n\nОбщо: ${window.formatEur(total)} / ${window.formatBgn(total)} (приблизително)`;
  });
});
