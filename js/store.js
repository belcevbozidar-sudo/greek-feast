/* Централен модул за данни от Convex + рендиране на продуктови карти.
   Зарежда се като ES модул (defer). Изнася window.GF и събитие "gf-ready". */
import { ConvexHttpClient } from "https://esm.sh/convex@1.42.1/browser";
import { anyApi } from "https://esm.sh/convex@1.42.1/server";

const CONVEX_URL = "https://tacit-mockingbird-878.eu-west-1.convex.cloud";
const CONVEX_SITE_URL = "https://tacit-mockingbird-878.eu-west-1.convex.site";

const client = new ConvexHttpClient(CONVEX_URL);
const api = anyApi;

const PLACEHOLDER_IMG = "images/logo.png";

function esc(s) {
  return window.escapeHtml(s);
}

async function listCategories() {
  return await client.query(api.categories.list, {});
}

async function listProducts(opts = {}) {
  return await client.query(api.products.list, {
    categorySlug: opts.categorySlug || undefined,
    sort: opts.sort || undefined,
  });
}

async function getProduct(id) {
  return await client.query(api.products.get, { id });
}

// Рендира една продуктова карта (еднаква навсякъде из сайта). Всичко е екранирано.
function productCardHTML(p) {
  const img = p.mainImage || PLACEHOLDER_IMG;
  const idAttr = esc(p.id);
  const tag = p.tag
    ? '<span class="product-tag">' + esc(p.tag) + "</span>"
    : "";
  return (
    '<div class="product-card" data-search-name="' +
    esc((p.name || "").toLowerCase()) +
    '">' +
    '<div class="product-figure">' +
    tag +
    '<a href="product.html?id=' +
    idAttr +
    '" class="figure-link"><img src="' +
    esc(img) +
    '" alt="' +
    esc(p.name) +
    '" loading="lazy"></a>' +
    "</div>" +
    '<div class="product-body">' +
    "<h4><a href=\"product.html?id=" +
    idAttr +
    '">' +
    esc(p.name) +
    "</a></h4>" +
    '<p class="desc">' +
    esc(p.desc) +
    "</p>" +
    '<div class="product-foot">' +
    "<div>" +
    window.priceHTML(p.priceEur, p.unit) +
    "</div>" +
    '<button class="add-btn" data-id="' +
    idAttr +
    '" data-name="' +
    esc(p.name) +
    '" data-price="' +
    esc(p.priceEur) +
    '" data-unit="' +
    esc(p.unit) +
    '" data-category="' +
    esc(p.categorySlug) +
    '" data-img="' +
    esc(img) +
    '" aria-label="Добави към заявката">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>' +
    "</button>" +
    "</div></div></div>"
  );
}

// Обновява имената на категориите навсякъде из статичните части на сайта
// (плочки на началната страница, връзки в долния колонтитул), за да следват админа.
// Снимките и слоганите остават като част от дизайна; сменя се само името.
async function syncCategoryLabels() {
  try {
    const cats = await listCategories();
    const bySlug = {};
    cats.forEach((c) => (bySlug[c.slug] = c.name));

    document.querySelectorAll(".category-card").forEach((card) => {
      const m = (card.getAttribute("href") || "").match(/#([^#]+)$/);
      const h3 = card.querySelector("h3");
      if (m && bySlug[m[1]] && h3) h3.textContent = bySlug[m[1]];
    });
    document.querySelectorAll('.footer-col a[href*="catalog.html#"]').forEach((a) => {
      const m = (a.getAttribute("href") || "").match(/#([^#]+)$/);
      if (m && bySlug[m[1]]) a.textContent = bySlug[m[1]];
    });
  } catch (e) {
    /* при липса на връзка оставяме статичните имена */
  }
}

window.GF = {
  client,
  api,
  CONVEX_URL,
  CONVEX_SITE_URL,
  PLACEHOLDER_IMG,
  listCategories,
  listProducts,
  getProduct,
  productCardHTML,
  syncCategoryLabels,
};

window.dispatchEvent(new Event("gf-ready"));

if (document.readyState !== "loading") syncCategoryLabels();
else document.addEventListener("DOMContentLoaded", syncCategoryLabels);
