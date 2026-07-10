/* Начална страница: препоръчани продукти от Convex (цени в €/лв). */
import "./store.js";

async function initFeatured() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;
  try {
    const all = await window.GF.listProducts({});
    // Първо показваме продуктите с етикет (напр. "Хит"), после допълваме до 8.
    const tagged = all.filter((p) => p.tag);
    const rest = all.filter((p) => !p.tag);
    const featured = tagged.concat(rest).slice(0, 8);
    grid.innerHTML = featured.map((p) => window.GF.productCardHTML(p)).join("");
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="catalog-loading">Грешка при зареждане на продуктите.</p>';
  }
}

window.addEventListener("gf-ready", initFeatured, { once: true });
if (window.GF) initFeatured();
