/* Каталог: динамично зареждане от Convex с филтър по категория, сортиране и търсене. */
import "./store.js";

const state = { category: "all", sort: "manual", search: "" };
let allProducts = [];
let categories = [];

function sortProducts(list) {
  const s = state.sort;
  const arr = list.slice();
  arr.sort((a, b) => {
    switch (s) {
      case "price-asc":
        return a.priceEur - b.priceEur;
      case "price-desc":
        return b.priceEur - a.priceEur;
      case "name":
        return (a.name || "").localeCompare(b.name || "", "bg");
      case "newest":
        return b.createdAt - a.createdAt;
      default:
        return a.order - b.order || a.createdAt - b.createdAt;
    }
  });
  return arr;
}

function render() {
  const grid = document.getElementById("catalogGrid");
  const empty = document.getElementById("catalogEmpty");
  if (!grid) return;

  let list = allProducts;
  if (state.category !== "all") list = list.filter((p) => p.categorySlug === state.category);
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter((p) => (p.name || "").toLowerCase().includes(q));
  }
  list = sortProducts(list);

  grid.innerHTML = list.map((p) => window.GF.productCardHTML(p)).join("");
  if (empty) empty.style.display = list.length ? "none" : "";
}

function renderChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;
  const chips = ['<button class="filter-chip active" data-target="all">Всички</button>'];
  for (const c of categories) {
    chips.push(
      '<button class="filter-chip" data-target="' +
        window.escapeHtml(c.slug) +
        '">' +
        window.escapeHtml(c.name) +
        "</button>",
    );
  }
  bar.innerHTML = chips.join("");
}

function setupEvents() {
  const bar = document.getElementById("filterBar");
  if (bar) {
    bar.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      bar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.category = chip.dataset.target;
      render();
    });
  }

  const sortSel = document.getElementById("sortSelect");
  if (sortSel) {
    sortSel.addEventListener("change", () => {
      state.sort = sortSel.value;
      render();
    });
  }

  const search = document.getElementById("catalogSearch");
  if (search) {
    search.addEventListener("input", () => {
      state.search = search.value.trim();
      // При търсене нулираме категорийния филтър за по-широки резултати.
      if (state.search) {
        state.category = "all";
        document.querySelectorAll("#filterBar .filter-chip").forEach((c) => c.classList.remove("active"));
        document.querySelector('#filterBar .filter-chip[data-target="all"]')?.classList.add("active");
      }
      render();
    });
  }
}

function applyHashCategory() {
  const hash = decodeURIComponent(window.location.hash.replace("#", ""));
  if (hash && categories.some((c) => c.slug === hash)) {
    state.category = hash;
    const bar = document.getElementById("filterBar");
    if (bar) {
      bar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      bar.querySelector('.filter-chip[data-target="' + CSS.escape(hash) + '"]')?.classList.add("active");
    }
  }
}

async function init() {
  const grid = document.getElementById("catalogGrid");
  if (grid) grid.innerHTML = '<p class="catalog-loading">Зареждане…</p>';
  try {
    [categories, allProducts] = await Promise.all([
      window.GF.listCategories(),
      window.GF.listProducts({}),
    ]);
    renderChips();
    applyHashCategory();
    setupEvents();
    render();
  } catch (e) {
    if (grid) grid.innerHTML = '<p class="catalog-loading">Грешка при зареждане. Опитайте отново.</p>';
    console.error(e);
  }
}

window.addEventListener("gf-ready", init, { once: true });
if (window.GF) init();
