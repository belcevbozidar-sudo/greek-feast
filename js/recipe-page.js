/* Детайлна страница за отделна "Идея за меню" — динамична, по слъг от заявката (?slug=...). */
import "./store.js";
import { RECIPES, findProduct } from "./recipes-data.js";

const esc = (s) => window.escapeHtml(s);

function renderNotFound() {
  document.getElementById("recipeIntro").innerHTML =
    '<div class="empty-cart" style="grid-column: 1 / -1;">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>' +
    "<h3>Идеята не е намерена</h3>" +
    "<p>Възможно е връзката да е остаряла. Разгледайте всички идеи за меню.</p>" +
    '<a href="menu-ideas.html" class="btn btn-primary mt-40">Към идеите за меню</a></div>';
  document.getElementById("ingredientsSection").style.display = "none";
}

function relatedCardHTML(recipe) {
  return (
    '<a href="recipe.html?slug=' +
    esc(recipe.slug) +
    '" class="idea-teaser-card">' +
    '<img src="' +
    esc(recipe.img) +
    '" alt="' +
    esc(recipe.title) +
    '" loading="lazy">' +
    '<div class="idea-teaser-overlay">' +
    '<span class="idea-teaser-eyebrow">' +
    esc(recipe.badge) +
    "</span>" +
    "<h4>" +
    esc(recipe.title) +
    "</h4>" +
    "<span>" +
    recipe.ingredients.length +
    " съставки от каталога</span>" +
    "</div>" +
    "</a>"
  );
}

async function renderRecipePage() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const recipe = RECIPES.find((r) => r.slug === slug);
  if (!recipe) {
    renderNotFound();
    return;
  }

  document.title = recipe.title + " — Идеи за меню — Greek Feast";
  document.getElementById("pageDesc").setAttribute("content", recipe.desc);

  document.getElementById("breadcrumb").innerHTML =
    '<a href="index.html">Начало</a><span>/</span>' +
    '<a href="menu-ideas.html">Идеи за меню</a><span>/</span>' +
    esc(recipe.title);

  let products = [];
  try {
    products = await window.GF.listProducts({});
  } catch (e) {
    console.error(e);
  }

  const matched = recipe.ingredients.map((ing) => findProduct(products, ing.name, ing.unit));
  const found = matched.filter(Boolean);

  document.getElementById("recipeIntro").innerHTML =
    '<div class="product-detail-figure">' +
    '<div class="arch-frame"><img src="' +
    esc(recipe.img) +
    '" alt="' +
    esc(recipe.title) +
    '"></div>' +
    "</div>" +
    '<div class="product-detail-info">' +
    '<span class="product-category-badge">' +
    esc(recipe.badge) +
    "</span>" +
    "<h1>" +
    esc(recipe.title) +
    "</h1>" +
    '<p class="lede">' +
    esc(recipe.desc) +
    "</p>" +
    '<p class="product-long-desc">' +
    esc(recipe.longDesc) +
    "</p>" +
    '<div class="recipe-count-line">' +
    found.length +
    " съставки от нашия каталог — всички налични на едро.</div>" +
    "</div>";

  document.getElementById("ingredientsTitle").textContent =
    "От какво се нуждаете (" + found.length + " съставки)";
  document.getElementById("ingredientsGrid").innerHTML = found
    .map((p) => window.GF.productCardHTML(p))
    .join("");

  document.getElementById("addAllBtn").addEventListener("click", () => {
    found.forEach((p) => {
      window.addToCart({
        id: p.id,
        name: p.name,
        price: p.priceEur,
        unit: p.unit,
        category: p.categorySlug,
        img: p.mainImage || window.GF.PLACEHOLDER_IMG,
      });
    });
    window.showToast(found.length + " съставки бяха добавени към заявката");
    window.openDrawer();
  });

  const related = RECIPES.filter((r) => r.slug !== recipe.slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  if (related.length) {
    document.getElementById("relatedRecipesSection").style.display = "";
    document.getElementById("relatedRecipesGrid").innerHTML = related.map(relatedCardHTML).join("");
  }
}

window.addEventListener("gf-ready", renderRecipePage, { once: true });
if (window.GF) renderRecipePage();
