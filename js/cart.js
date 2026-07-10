const CART_KEY = 'greek_trapeza_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  renderDrawer();
}

function addToCart(item, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...item, qty });
  }
  saveCart(cart);
}

function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    saveCart(cart.filter(i => i.id !== id));
  } else {
    saveCart(cart);
  }
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * parseFloat(i.price), 0);
}

function updateCartBadge() {
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = getCartCount();
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastMsg').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ===== Side cart drawer ===== */
function buildCartDrawer() {
  if (document.getElementById('cartDrawer')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="drawer-overlay" id="drawerOverlay"></div>
    <aside class="cart-drawer" id="cartDrawer">
      <div class="drawer-head">
        <h3>Вашата заявка</h3>
        <button type="button" class="drawer-close" id="drawerClose" aria-label="Затвори">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="drawer-body" id="drawerBody"></div>
      <div class="drawer-foot" id="drawerFoot">
        <div class="summary-total"><span>Общо</span><span id="drawerTotal">0.00 лв</span></div>
        <a href="order.html" class="btn btn-primary btn-block mt-14">Към заявката</a>
        <button type="button" class="btn btn-outline btn-block mt-10" id="drawerContinue">Продължи пазаруването</button>
      </div>
    </aside>`;
  document.body.appendChild(wrap);

  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerContinue').addEventListener('click', closeDrawer);

  document.getElementById('drawerBody').addEventListener('click', e => {
    const row = e.target.closest('.cart-row');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest('.qty-plus')) changeQty(id, 1);
    if (e.target.closest('.qty-minus')) changeQty(id, -1);
    if (e.target.closest('.remove-btn')) removeFromCart(id);
  });
}

function renderDrawer() {
  const body = document.getElementById('drawerBody');
  const foot = document.getElementById('drawerFoot');
  if (!body) return;
  const cart = getCart();

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="drawer-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Заявката е празна</p>
      </div>`;
    if (foot) foot.style.display = 'none';
    return;
  }

  if (foot) foot.style.display = '';
  const e = window.escapeHtml || (s => s);
  body.innerHTML = cart.map(item => `
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
  document.getElementById('drawerTotal').innerHTML =
    `${e(window.formatEur(total))} <span class="price-bgn">${e(window.formatBgn(total))}</span>`;
}

function openDrawer() {
  renderDrawer();
  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  buildCartDrawer();
  updateCartBadge();
  renderDrawer();

  document.querySelectorAll('#cartOpenBtn, .js-open-cart').forEach(btn => {
    btn.addEventListener('click', openDrawer);
  });

  document.body.addEventListener('click', e => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    addToCart({
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: btn.dataset.price,
      unit: btn.dataset.unit,
      category: btn.dataset.category,
      img: btn.dataset.img
    });
    openDrawer();
  });
});
