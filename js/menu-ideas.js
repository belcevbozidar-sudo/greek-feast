/* Страница "Идеи за меню" (списък): съставките се съпоставят с реални продукти от Convex,
   всяка карта води към собствената страница на рецептата (recipe.html?slug=...). */
import "./store.js";
import { RECIPES, findProduct } from "./recipes-data.js";

const BADGE_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/></svg>';
const ADD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>';

function esc(s) {
  return window.escapeHtml(s);
}

function recipeCardHTML(recipe, matched) {
  const href = "recipe.html?slug=" + esc(recipe.slug);
  const chips = matched
    .map((p, i) => {
      const ing = recipe.ingredients[i];
      if (!p) {
        return '<span class="ingredient-chip"><span class="dot"></span>' + esc(ing.name) + "</span>";
      }
      return (
        '<a class="ingredient-chip" href="product.html?id=' +
        esc(p.id) +
        '"><span class="dot"></span>' +
        esc(p.name) +
        "</a>"
      );
    })
    .join("");

  return (
    '<div class="recipe-card" id="' +
    esc(recipe.slug) +
    '">' +
    '<a href="' +
    href +
    '" class="recipe-figure">' +
    '<img src="' +
    esc(recipe.img) +
    '" alt="' +
    esc(recipe.title) +
    '" loading="lazy">' +
    '<span class="recipe-badge">' +
    BADGE_ICON +
    esc(recipe.badge) +
    "</span>" +
    '<span class="recipe-count-badge">' +
    matched.filter(Boolean).length +
    " съставки</span>" +
    "</a>" +
    '<div class="recipe-body">' +
    '<h3><a href="' +
    href +
    '">' +
    esc(recipe.title) +
    "</a></h3>" +
    '<p class="recipe-desc">' +
    esc(recipe.desc) +
    "</p>" +
    '<div class="ingredient-chips">' +
    chips +
    "</div>" +
    '<div class="recipe-foot">' +
    '<a href="' +
    href +
    '" class="btn btn-outline recipe-view-btn">Виж рецептата</a>' +
    '<button type="button" class="btn btn-primary recipe-add-btn" data-slug="' +
    esc(recipe.slug) +
    '">' +
    ADD_ICON +
    "Добавете всички съставки</button>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

async function initMenuIdeas() {
  const grid = document.getElementById("recipeGrid");
  if (!grid) return;
  try {
    const products = await window.GF.listProducts({});
    const matchedByRecipe = RECIPES.map((recipe) =>
      recipe.ingredients.map((ing) => findProduct(products, ing.name, ing.unit)),
    );

    grid.innerHTML = RECIPES.map((recipe, i) => recipeCardHTML(recipe, matchedByRecipe[i])).join("");

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".recipe-add-btn");
      if (!btn) return;
      const idx = RECIPES.findIndex((r) => r.slug === btn.dataset.slug);
      if (idx === -1) return;
      const matched = matchedByRecipe[idx].filter(Boolean);
      matched.forEach((p) => {
        window.addToCart({
          id: p.id,
          name: p.name,
          price: p.priceEur,
          unit: p.unit,
          category: p.categorySlug,
          img: p.mainImage || window.GF.PLACEHOLDER_IMG,
        });
      });
      window.showToast(matched.length + " съставки бяха добавени към заявката");
      window.openDrawer();
    });
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="catalog-loading">Грешка при зареждане на продуктите.</p>';
  }
}

window.addEventListener("gf-ready", initMenuIdeas, { once: true });
if (window.GF) initMenuIdeas();
