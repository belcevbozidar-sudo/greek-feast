/* Продуктова страница: динамично зареждане от Convex, галерия със стрелки + плъзгане, цени в €/лв. */
import "./store.js";

const GREEK_TAGS = {
  salads: "Φρέσκο κάθε μέρα",
  fish: "Θαλασσινά της ημέρας",
  chicken: "Στη σχάρα, όπως παλιά",
  pork: "Στη σχάρα, όπως παλιά",
  alcohol: "Γεύσεις της Ελλάδας",
  drinks: "Δροσιστικό & φρέσκο",
};

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>';

const esc = (s) => window.escapeHtml(s);

function renderNotFound() {
  document.getElementById("productDetail").innerHTML =
    '<div class="empty-cart" style="grid-column: 1 / -1;">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>' +
    "<h3>Продуктът не е намерен</h3>" +
    "<p>Възможно е връзката да е остаряла. Разгледайте пълния каталог, за да намерите каквото търсите.</p>" +
    '<a href="catalog.html" class="btn btn-primary mt-40">Към продуктите</a></div>';
}

function galleryHTML(images, name) {
  const imgs = images && images.length ? images : [window.GF.PLACEHOLDER_IMG];
  const slides = imgs
    .map(
      (src, i) =>
        '<img class="gallery-slide' +
        (i === 0 ? " active" : "") +
        '" src="' +
        esc(src) +
        '" alt="' +
        esc(name) +
        (i > 0 ? " — снимка " + (i + 1) : "") +
        '" data-idx="' +
        i +
        '"' +
        (i === 0 ? "" : ' loading="lazy"') +
        ">",
    )
    .join("");

  const multi = imgs.length > 1;
  const arrows = multi
    ? '<button type="button" class="gallery-arrow prev" aria-label="Предишна снимка"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<button type="button" class="gallery-arrow next" aria-label="Следваща снимка"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg></button>'
    : "";
  const dots = multi
    ? '<div class="gallery-dots">' +
      imgs.map((_, i) => '<button type="button" class="gallery-dot' + (i === 0 ? " active" : "") + '" data-idx="' + i + '" aria-label="Снимка ' + (i + 1) + '"></button>').join("") +
      "</div>"
    : "";
  const thumbs = multi
    ? '<div class="gallery-thumbs">' +
      imgs.map((src, i) => '<button type="button" class="gallery-thumb' + (i === 0 ? " active" : "") + '" data-idx="' + i + '"><img src="' + esc(src) + '" alt=""></button>').join("") +
      "</div>"
    : "";

  return (
    '<div class="gallery" id="gallery">' +
    '<div class="arch-frame gallery-main">' +
    slides +
    arrows +
    "</div>" +
    dots +
    thumbs +
    "</div>" +
    '<div class="meander"></div>'
  );
}

function setupGallery(count) {
  if (count <= 1) return;
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  let cur = 0;

  function show(idx) {
    cur = (idx + count) % count;
    gallery.querySelectorAll(".gallery-slide").forEach((el) => el.classList.toggle("active", +el.dataset.idx === cur));
    gallery.querySelectorAll(".gallery-dot").forEach((el) => el.classList.toggle("active", +el.dataset.idx === cur));
    gallery.querySelectorAll(".gallery-thumb").forEach((el) => el.classList.toggle("active", +el.dataset.idx === cur));
  }

  gallery.querySelector(".gallery-arrow.prev")?.addEventListener("click", () => show(cur - 1));
  gallery.querySelector(".gallery-arrow.next")?.addEventListener("click", () => show(cur + 1));
  gallery.querySelectorAll(".gallery-dot, .gallery-thumb").forEach((el) =>
    el.addEventListener("click", () => show(+el.dataset.idx)),
  );

  // Плъзгане (swipe) на докосване.
  const main = gallery.querySelector(".gallery-main");
  let startX = 0;
  let tracking = false;
  main.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      tracking = true;
    },
    { passive: true },
  );
  main.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1);
    },
    { passive: true },
  );

  // Стрелки от клавиатурата.
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
}

async function renderProductPage() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    renderNotFound();
    return;
  }

  let product;
  try {
    product = await window.GF.getProduct(id);
  } catch (e) {
    console.error(e);
    renderNotFound();
    return;
  }
  if (!product) {
    renderNotFound();
    return;
  }

  // Име на категорията (за показване вместо slug).
  let categoryName = product.categorySlug;
  try {
    const cats = await window.GF.listCategories();
    const found = cats.find((c) => c.slug === product.categorySlug);
    if (found) categoryName = found.name;
  } catch (e) {
    /* при грешка оставяме slug */
  }

  document.title = product.name + " — Greek Feast";
  document.getElementById("pageDesc").setAttribute("content", product.desc || "");

  document.getElementById("breadcrumb").innerHTML =
    '<a href="index.html">Начало</a><span>/</span>' +
    '<a href="catalog.html">Продукти</a><span>/</span>' +
    '<a href="catalog.html#' +
    esc(product.categorySlug) +
    '">' +
    esc(categoryName) +
    "</a><span>/</span>" +
    esc(product.name);

  const images = product.images && product.images.length ? product.images : [window.GF.PLACEHOLDER_IMG];

  document.getElementById("productDetail").innerHTML =
    '<div class="product-detail-figure">' +
    galleryHTML(images, product.name) +
    "</div>" +
    '<div class="product-detail-info">' +
    '<span class="product-category-badge">' +
    esc(categoryName) +
    "</span>" +
    '<span class="product-greek-tag">' +
    esc(GREEK_TAGS[product.categorySlug] || "") +
    "</span>" +
    "<h1>" +
    esc(product.name) +
    "</h1>" +
    '<p class="lede">' +
    esc(product.desc) +
    "</p>" +
    '<div class="product-price-row">' +
    '<span class="price-big">' +
    esc(window.formatEur(product.priceEur)) +
    "</span>" +
    '<span class="price-bgn-big">' +
    esc(window.formatBgn(product.priceEur)) +
    "</span>" +
    '<span class="unit">/ ' +
    esc(product.unit) +
    "</span>" +
    "</div>" +
    '<p class="product-long-desc">' +
    esc(product.longDesc) +
    "</p>" +
    '<div class="qty-row">' +
    '<div class="qty-control-lg">' +
    '<button type="button" id="pdQtyMinus" aria-label="Намали">−</button>' +
    '<span id="pdQty">1</span>' +
    '<button type="button" id="pdQtyPlus" aria-label="Увеличи">+</button>' +
    "</div>" +
    '<button type="button" class="btn btn-primary" id="pdAddBtn">Добави към заявката</button>' +
    "</div>" +
    '<ul class="product-detail-badges">' +
    "<li>" + CHECK_SVG + "<span>100% прясно и качествено</span></li>" +
    "<li>" + CHECK_SVG + "<span>Официален представител на Papa Georgio</span></li>" +
    "<li>" + CHECK_SVG + "<span>Бърза доставка след потвърждение</span></li>" +
    "</ul></div>";

  setupGallery(images.length);

  let qty = 1;
  const qtyEl = document.getElementById("pdQty");
  document.getElementById("pdQtyMinus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyEl.textContent = qty;
  });
  document.getElementById("pdQtyPlus").addEventListener("click", () => {
    qty += 1;
    qtyEl.textContent = qty;
  });
  document.getElementById("pdAddBtn").addEventListener("click", () => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.priceEur,
        unit: product.unit,
        category: product.categorySlug,
        img: images[0],
      },
      qty,
    );
    openDrawer();
    qty = 1;
    qtyEl.textContent = qty;
  });

  // Свързани продукти от същата категория.
  try {
    const related = (await window.GF.listProducts({ categorySlug: product.categorySlug }))
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
    if (related.length) {
      document.getElementById("relatedSection").style.display = "";
      document.getElementById("relatedTitle").textContent = "Още продукти";
      document.getElementById("relatedGrid").innerHTML = related.map((p) => window.GF.productCardHTML(p)).join("");
    }
  } catch (e) {
    console.error(e);
  }
}

window.addEventListener("gf-ready", renderProductPage, { once: true });
if (window.GF) renderProductPage();
