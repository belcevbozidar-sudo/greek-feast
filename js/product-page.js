const GREEK_TAGS = {
  salads: 'Φρέσκο κάθε μέρα',
  fish: 'Θαλασσινά της ημέρας',
  chicken: 'Στη σχάρα, όπως παλιά',
  pork: 'Στη σχάρα, όπως παλιά',
  alcohol: 'Γεύσεις της Ελλάδας',
  drinks: 'Δροσιστικό & φρέσκο'
};

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>';

function productCardHTML(p) {
  return `
    <div class="product-card" data-search-name="${p.name.toLowerCase()}">
      <div class="product-figure">
        ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
        <a href="product.html?id=${p.id}" class="figure-link"><img src="${p.img}" alt="${p.name}"></a>
      </div>
      <div class="product-body">
        <h4><a href="product.html?id=${p.id}">${p.name}</a></h4>
        <p class="desc">${p.desc}</p>
        <div class="product-foot">
          <div><span class="price">${p.price.toFixed(2)} лв</span> <span class="unit">/ ${p.unit}</span></div>
          <button class="add-btn" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-unit="${p.unit}" data-category="${p.category}" data-img="${p.img}" aria-label="Добави към заявката">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

function renderNotFound() {
  document.getElementById('productDetail').innerHTML = `
    <div class="empty-cart" style="grid-column: 1 / -1;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <h3>Продуктът не е намерен</h3>
      <p>Възможно е връзката да е остаряла. Разгледайте пълния каталог, за да намерите каквото търсите.</p>
      <a href="catalog.html" class="btn btn-primary mt-40">Към продуктите</a>
    </div>`;
}

function renderProductPage() {
  const id = new URLSearchParams(window.location.search).get('id');
  const product = id ? getProductById(id) : null;

  if (!product) {
    renderNotFound();
    return;
  }

  document.title = `${product.name} — Greek Feast`;
  document.getElementById('pageDesc').setAttribute('content', product.desc);

  document.getElementById('breadcrumb').innerHTML = `
    <a href="index.html">Начало</a><span>/</span>
    <a href="catalog.html">Продукти</a><span>/</span>
    <a href="catalog.html#${product.categorySlug}">${product.category}</a><span>/</span>
    ${product.name}`;

  document.getElementById('productDetail').innerHTML = `
    <div class="product-detail-figure">
      <div class="arch-frame"><img src="${product.img}" alt="${product.name}"></div>
      <div class="meander"></div>
    </div>
    <div class="product-detail-info">
      <span class="product-category-badge">${product.category}</span>
      <span class="product-greek-tag">${GREEK_TAGS[product.categorySlug] || ''}</span>
      <h1>${product.name}</h1>
      <p class="lede">${product.desc}</p>
      <div class="product-price-row">
        <span class="price-big">${product.price.toFixed(2)} лв</span>
        <span class="unit">/ ${product.unit}</span>
      </div>
      <p class="product-long-desc">${product.longDesc}</p>
      <div class="qty-row">
        <div class="qty-control-lg">
          <button type="button" id="pdQtyMinus" aria-label="Намали">−</button>
          <span id="pdQty">1</span>
          <button type="button" id="pdQtyPlus" aria-label="Увеличи">+</button>
        </div>
        <button type="button" class="btn btn-primary" id="pdAddBtn">Добави към заявката</button>
      </div>
      <ul class="product-detail-badges">
        <li>${CHECK_SVG}<span>100% прясно и качествено</span></li>
        <li>${CHECK_SVG}<span>Официален представител на Papa Georgio</span></li>
        <li>${CHECK_SVG}<span>Бърза доставка след потвърждение</span></li>
      </ul>
    </div>`;

  let qty = 1;
  const qtyEl = document.getElementById('pdQty');
  document.getElementById('pdQtyMinus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyEl.textContent = qty;
  });
  document.getElementById('pdQtyPlus').addEventListener('click', () => {
    qty += 1;
    qtyEl.textContent = qty;
  });
  document.getElementById('pdAddBtn').addEventListener('click', () => {
    addToCart({
      id: product.id, name: product.name, price: product.price,
      unit: product.unit, category: product.category, img: product.img
    }, qty);
    openDrawer();
    qty = 1;
    qtyEl.textContent = qty;
  });

  const related = getRelatedProducts(product, 4);
  if (related.length) {
    document.getElementById('relatedSection').style.display = '';
    document.getElementById('relatedTitle').textContent = `Още от „${product.category}“`;
    document.getElementById('relatedGrid').innerHTML = related.map(productCardHTML).join('');
  }
}

document.addEventListener('DOMContentLoaded', renderProductPage);
