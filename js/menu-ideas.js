/* Страница "Идеи за меню": статични рецепти, съставките се съпоставят с реални продукти от Convex,
   за да могат да се добавят в заявката с един клик. */
import "./store.js";

const RECIPES = [
  {
    slug: "horiatiki",
    badge: "Гръцка класика",
    title: "Хориатики",
    desc: "Най-разпознаваемото гръцко предястие — хрупкави зеленчуци, солена Фета и щедра доза зехтин. Задължително присъствие във всяко меню с гръцка кухня.",
    img: "images/recipes/horiatiki.jpg",
    ingredients: [
      { name: "Розови домати (Гърция)" },
      { name: "Гръцки краставици" },
      { name: "Чушки Керато" },
      { name: "Маслини Каламата (Едра селекция)" },
      { name: "Гръцко сирене Фета PDO (Papa Georgio)", unit: "Кутия 2кг" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
      { name: "Див гръцки риган (ронен)" },
    ],
  },
  {
    slug: "tzatziki",
    badge: "Студено предястие",
    title: "Дзадзики",
    desc: "Освежаващ крем сос от цедено кисело мляко и краставица — перфектно допълнение към скара или самостоятелно мезе.",
    img: "images/recipes/tzatziki.jpg",
    ingredients: [
      { name: "Цедено гръцко кисело мляко 10%" },
      { name: "Гръцки краставици" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
    ],
  },
  {
    slug: "saganaki",
    badge: "Топло предястие",
    title: "Саганаки",
    desc: "Запечена Фета с хрупкава коричка отвън и топяща се текстура отвътре. Бърза, ефектна позиция за менюто.",
    img: "images/recipes/saganaki.jpg",
    ingredients: [
      { name: "Гръцко сирене Фета PDO (Papa Georgio)", unit: "Кутия 2кг" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
      { name: "Див гръцки риган (ронен)" },
      { name: "Гръцки пити за гирос (18см)" },
    ],
  },
  {
    slug: "gyros-pork",
    badge: "Улична класика",
    title: "Гирос пита (свинско)",
    desc: "Топла пита, сочно свинско месо и хладен дзадзики сос — най-поръчваното улично ястие в гръцката кухня.",
    img: "images/recipes/gyros-pork.jpg",
    ingredients: [
      { name: "Гръцки пити за гирос (18см)" },
      { name: "Свински гирос (суров на конус)" },
      { name: "Цедено гръцко кисело мляко 10%" },
      { name: "Гръцки краставици" },
      { name: "Розови домати (Гърция)" },
    ],
  },
  {
    slug: "souvlaki-chicken",
    badge: "На скара",
    title: "Пилешко сувлаки",
    desc: "Сочни мариновани шишчета на скара, поднесени с прясна салата — лека и бърза позиция за менюто на скара.",
    img: "images/recipes/souvlaki-chicken.jpg",
    ingredients: [
      { name: "Пилешко сувлаки (сурово)" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
      { name: "Див гръцки риган (ронен)" },
      { name: "Розови домати (Гърция)" },
      { name: "Гръцки краставици" },
    ],
  },
  {
    slug: "octopus-grilled",
    badge: "От морето",
    title: "Октопод на скара",
    desc: "Крехък и ароматен октопод, овкусен със зехтин, риган и каперси — изискана позиция за менюта с морска кухня.",
    img: "images/recipes/octopus-grilled.jpg",
    ingredients: [
      { name: "Пипала от октопод (варени)" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
      { name: "Гръцки каперси в саламура" },
      { name: "Див гръцки риган (ронен)" },
    ],
  },
  {
    slug: "calamari-grilled",
    badge: "От морето",
    title: "Калмари на скара",
    desc: "Леко овъглени калмарени халки с каперси и билки — свежа и бърза морска позиция за менюто.",
    img: "images/recipes/calamari-grilled.jpg",
    ingredients: [
      { name: "Почистени калмари (U10)" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
      { name: "Гръцки каперси в саламура" },
      { name: "Див гръцки риган (ронен)" },
    ],
  },
  {
    slug: "shrimp-saganaki",
    badge: "Топло предястие",
    title: "Скариди Саганаки",
    desc: "Скариди, къкрещи в доматен сос с разтопена Фета — ефектно и ароматно ястие за менюто на всяко заведение.",
    img: "images/recipes/shrimp-saganaki.jpg",
    ingredients: [
      { name: "Кралски скариди (с глава, 20/30)" },
      { name: "Гръцко сирене Фета PDO (Papa Georgio)", unit: "Кутия 2кг" },
      { name: "Розови домати (Гърция)" },
      { name: "Зехтин Extra Virgin (Papa Georgio)", unit: "Бутилка 1л" },
      { name: "Див гръцки риган (ронен)" },
    ],
  },
];

const BADGE_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/></svg>';
const ADD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>';

function esc(s) {
  return window.escapeHtml(s);
}

function findProduct(products, name, unit) {
  const matches = products.filter((p) => p.name === name);
  if (matches.length <= 1) return matches[0] || null;
  if (unit) {
    const withUnit = matches.find((p) => p.unit === unit);
    if (withUnit) return withUnit;
  }
  return matches[0];
}

function recipeCardHTML(recipe, matched) {
  const chips = matched
    .map((p, i) => {
      const ing = recipe.ingredients[i];
      if (!p) {
        return (
          '<span class="ingredient-chip"><span class="dot"></span>' + esc(ing.name) + "</span>"
        );
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
    '" data-slug="' +
    esc(recipe.slug) +
    '">' +
    '<div class="recipe-figure">' +
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
    "</div>" +
    '<div class="recipe-body">' +
    "<h3>" +
    esc(recipe.title) +
    "</h3>" +
    '<p class="recipe-desc">' +
    esc(recipe.desc) +
    "</p>" +
    '<div class="ingredient-chips">' +
    chips +
    "</div>" +
    '<div class="recipe-foot">' +
    '<button type="button" class="btn btn-primary recipe-add-btn" data-slug="' +
    esc(recipe.slug) +
    '">' +
    ADD_ICON +
    "Добавете всички съставки в заявката</button>" +
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
      recipe.ingredients.map((ing) => findProduct(products, ing.name, ing.unit))
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

    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="catalog-loading">Грешка при зареждане на продуктите.</p>';
  }
}

window.addEventListener("gf-ready", initMenuIdeas, { once: true });
if (window.GF) initMenuIdeas();
