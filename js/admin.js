/* Админ панел — вход, продукти, категории, качване и пренареждане на снимки. */
import "./store.js";

const { client, api, CONVEX_SITE_URL, PLACEHOLDER_IMG } = window.GF;
const TOKEN_KEY = "gf_admin_token";
const MAX_IMAGES = 12;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB / снимка

let token = localStorage.getItem(TOKEN_KEY) || null;
let categories = [];
let products = [];
let editingId = null;
let currentImages = []; // [{ key, ref, preview }]
let keyCounter = 0;

const $ = (id) => document.getElementById(id);
const esc = window.escapeHtml;

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg, kind) {
  const t = $("adminToast");
  t.textContent = msg;
  t.className = "admin-toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "admin-toast"), 3000);
}

/* ---------------- Вход ---------------- */
let lockTimer;
function showLoginError(html) {
  const el = $("loginError");
  el.innerHTML = html;
  el.style.display = "";
}
function clearLoginError() {
  $("loginError").style.display = "none";
}

function startLockCountdown(lockedUntil) {
  clearInterval(lockTimer);
  const tick = () => {
    const left = lockedUntil - Date.now();
    if (left <= 0) {
      clearInterval(lockTimer);
      clearLoginError();
      $("loginBtn").disabled = false;
      return;
    }
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    showLoginError(
      "Твърде много опити. Опитайте отново след <strong>" +
        m +
        " мин " +
        String(s).padStart(2, "0") +
        " сек</strong>.",
    );
  };
  $("loginBtn").disabled = true;
  tick();
  lockTimer = setInterval(tick, 1000);
}

async function doLogin(e) {
  e.preventDefault();
  clearLoginError();
  const password = $("pw").value;
  const remember = $("remember").checked;
  $("loginBtn").disabled = true;

  try {
    const res = await fetch(CONVEX_SITE_URL + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, remember }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 200 && data.token) {
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      $("pw").value = "";
      await enterDashboard();
      return;
    }
    if (res.status === 429 && data.lockedUntil) {
      startLockCountdown(data.lockedUntil);
      return;
    }
    if (res.status === 401) {
      const left = typeof data.attemptsLeft === "number" ? data.attemptsLeft : null;
      showLoginError(
        "Грешна парола." +
          (left !== null ? " Оставащи опити: <strong>" + left + "</strong>." : ""),
      );
      $("loginBtn").disabled = false;
      return;
    }
    showLoginError(esc(data.error || "Възникна грешка. Опитайте отново."));
    $("loginBtn").disabled = false;
  } catch (err) {
    showLoginError("Няма връзка със сървъра. Проверете интернет връзката.");
    $("loginBtn").disabled = false;
  }
}

async function tryRestoreSession() {
  if (!token) return false;
  try {
    const r = await client.query(api.auth.checkSession, { token });
    return !!(r && r.valid);
  } catch {
    return false;
  }
}

async function logout() {
  try {
    if (token) await client.mutation(api.auth.logout, { token });
  } catch {
    /* игнорираме */
  }
  token = null;
  localStorage.removeItem(TOKEN_KEY);
  $("dashboardView").style.display = "none";
  $("loginView").style.display = "";
}

/* ---------------- Данни ---------------- */
async function loadData() {
  [categories, products] = await Promise.all([
    window.GF.listCategories(),
    window.GF.listProducts({}),
  ]);
  fillCategorySelects();
  renderProducts();
  renderCategories();
}

function fillCategorySelects() {
  const filter = $("adminCatFilter");
  const modalSel = $("pCategory");
  filter.innerHTML =
    '<option value="all">Всички категории</option>' +
    categories.map((c) => '<option value="' + esc(c.slug) + '">' + esc(c.name) + "</option>").join("");
  modalSel.innerHTML = categories
    .map((c) => '<option value="' + esc(c.slug) + '">' + esc(c.name) + "</option>")
    .join("");
}

/* ---------------- Списък продукти ---------------- */
function renderProducts() {
  const cat = $("adminCatFilter").value || "all";
  const sort = $("adminSort").value || "manual";
  let list = products.slice();
  if (cat !== "all") list = list.filter((p) => p.categorySlug === cat);
  list.sort((a, b) => {
    switch (sort) {
      case "price-asc": return a.priceEur - b.priceEur;
      case "price-desc": return b.priceEur - a.priceEur;
      case "name": return (a.name || "").localeCompare(b.name || "", "bg");
      case "newest": return b.createdAt - a.createdAt;
      default: return a.order - b.order || a.createdAt - b.createdAt;
    }
  });

  const wrap = $("adminProductList");
  if (!list.length) {
    wrap.innerHTML = '<p class="empty-note">Няма продукти. Добавете първия артикул.</p>';
    return;
  }
  const catName = (slug) => {
    const c = categories.find((x) => x.slug === slug);
    return c ? c.name : slug;
  };
  wrap.innerHTML = list
    .map(
      (p) =>
        '<div class="admin-prod">' +
        '<img src="' + esc(p.mainImage || PLACEHOLDER_IMG) + '" alt="">' +
        '<div class="prod-main">' +
        '<div class="prod-name">' + esc(p.name) + (p.tag ? ' <small>· ' + esc(p.tag) + "</small>" : "") + "</div>" +
        '<div class="prod-meta">' + esc(catName(p.categorySlug)) + " · " + esc(p.unit) + " · " + esc(p.images.length) + " снимки</div>" +
        "</div>" +
        '<div class="prod-price">' + esc(window.formatEur(p.priceEur)) + "<small>" + esc(window.formatBgn(p.priceEur)) + "</small></div>" +
        '<div class="prod-actions">' +
        '<button class="icon-btn edit" data-id="' + esc(p.id) + '" title="Редактирай">✎</button>' +
        '<button class="icon-btn del" data-id="' + esc(p.id) + '" title="Изтрий">🗑</button>' +
        "</div></div>",
    )
    .join("");
}

/* ---------------- Категории ---------------- */
function renderCategories() {
  const wrap = $("adminCatList");
  if (!categories.length) {
    wrap.innerHTML = '<p class="empty-note">Няма категории.</p>';
    return;
  }
  wrap.innerHTML = categories
    .map(
      (c) =>
        '<div class="admin-cat" data-id="' + esc(c.id) + '">' +
        '<div class="cat-name">' + esc(c.name) + '</div>' +
        '<div class="cat-slug">' + esc(c.slug) + "</div>" +
        '<button class="icon-btn edit-cat" data-id="' + esc(c.id) + '" data-name="' + esc(c.name) + '" title="Преименувай">✎</button>' +
        '<button class="icon-btn del del-cat" data-id="' + esc(c.id) + '" title="Изтрий">🗑</button>' +
        "</div>",
    )
    .join("");
}

async function addCategory() {
  const name = $("newCatName").value.trim();
  if (!name) return;
  try {
    await client.mutation(api.categories.create, { token, name, slug: name });
    $("newCatName").value = "";
    await loadData();
    toast("Категорията е добавена.", "ok");
  } catch (e) {
    toast(cleanErr(e), "error");
  }
}

async function renameCategory(id, currentName) {
  const name = prompt("Ново име на категорията:", currentName);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === currentName) return;
  try {
    await client.mutation(api.categories.update, { token, id, name: trimmed });
    await loadData();
    toast("Записано.", "ok");
  } catch (e) {
    toast(cleanErr(e), "error");
  }
}

async function deleteCategory(id) {
  if (!confirm("Да изтрия ли тази категория?")) return;
  try {
    await client.mutation(api.categories.remove, { token, id });
    await loadData();
    toast("Изтрито.", "ok");
  } catch (e) {
    toast(cleanErr(e), "error");
  }
}

function parseUnitString(unitStr) {
  unitStr = (unitStr || "").trim();
  const regex = /^(.*?)\s*([~0-9.,]+)?\s*(кг|бр|л|мл|г)$/i;
  const match = unitStr.match(regex);
  if (match) {
    return {
      pack: match[1] ? match[1].trim() : "",
      qty: match[2] ? match[2].trim() : "",
      unit: match[3] ? match[3].toLowerCase() : "кг"
    };
  }
  return {
    pack: unitStr,
    qty: "",
    unit: "кг"
  };
}

/* ---------------- Форма за продукт ---------------- */
function openProductModal(product) {
  editingId = product ? product.id : null;
  $("modalTitle").textContent = product ? "Редакция на артикул" : "Нов артикул";
  $("modalError").style.display = "none";
  $("deleteProductBtn").style.display = product ? "" : "none";

  $("pName").value = product ? product.name : "";
  $("pPrice").value = product ? product.priceEur : "";

  let unitParts = { pack: "", qty: "", unit: "кг" };
  if (product && product.unit) {
    unitParts = parseUnitString(product.unit);
  }
  $("pUnitPack").value = unitParts.pack;
  $("pUnitQty").value = unitParts.qty;
  $("pUnitType").value = unitParts.unit;

  $("pTag").value = product && product.tag ? product.tag : "";
  $("pDesc").value = product ? product.desc : "";
  $("pLongDesc").value = product ? product.longDesc : "";
  updatePricePreview();

  if (product) {
    $("pCategory").value = product.categorySlug;
    // Зареждаме съществуващите снимки: реф + преглед (в еднакъв ред).
    currentImages = (product.imageRefs || []).map((ref, i) => ({
      key: ++keyCounter,
      ref,
      preview: product.images[i] || PLACEHOLDER_IMG,
    }));
  } else {
    if (categories[0]) $("pCategory").value = categories[0].slug;
    currentImages = [];
  }
  renderImageList();

  $("productModal").style.display = "";
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  $("productModal").style.display = "none";
  document.body.style.overflow = "";
  currentImages = [];
  editingId = null;
}

function updatePricePreview() {
  const v = parseFloat($("pPrice").value);
  $("pricePreview").textContent = isFinite(v) && v >= 0 ? "= " + window.formatBgn(v) + " (по курс 1.95583)" : "";
}

/* ----- Снимки: качване ----- */
async function handleFiles(files) {
  const list = Array.from(files);
  if (!list.length) return;
  for (const file of list) {
    if (currentImages.length >= MAX_IMAGES) {
      toast("Максимум " + MAX_IMAGES + " снимки.", "error");
      break;
    }
    if (!file.type.startsWith("image/")) {
      toast("Файлът „" + file.name + "“ не е снимка.", "error");
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast("„" + file.name + "“ е твърде голяма (макс. 8 MB).", "error");
      continue;
    }
    $("uploadStatus").textContent = "Качване на „" + file.name + "“…";
    try {
      const uploadUrl = await client.mutation(api.files.generateUploadUrl, { token });
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("upload failed");
      const json = await res.json();
      currentImages.push({
        key: ++keyCounter,
        ref: { kind: "storage", id: json.storageId },
        preview: URL.createObjectURL(file),
      });
      renderImageList();
    } catch (e) {
      toast("Грешка при качване на „" + file.name + "“.", "error");
    }
  }
  $("uploadStatus").textContent = "";
  $("imageInput").value = "";
}

/* ----- Снимки: рендиране + пренареждане (mouse + touch чрез Pointer Events) ----- */
const HANDLE_SVG =
  '<svg viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/></svg>';

function renderImageList() {
  const wrap = $("imageList");
  wrap.innerHTML = currentImages
    .map(
      (im, i) =>
        '<div class="img-item" data-key="' + im.key + '">' +
        '<span class="img-handle" data-key="' + im.key + '" title="Плъзни за пренареждане">' + HANDLE_SVG + "</span>" +
        '<img src="' + esc(im.preview) + '" alt="">' +
        '<span class="img-label">' + (i === 0 ? '<span class="main-badge">Главна</span>' : "Снимка " + (i + 1)) + "</span>" +
        '<button type="button" class="img-remove" data-key="' + im.key + '" aria-label="Премахни">✕</button>' +
        "</div>",
    )
    .join("");

  wrap.querySelectorAll(".img-handle").forEach((h) => {
    h.addEventListener("pointerdown", onDragStart);
  });
  wrap.querySelectorAll(".img-remove").forEach((b) => {
    b.addEventListener("click", () => {
      const key = +b.dataset.key;
      currentImages = currentImages.filter((x) => x.key !== key);
      renderImageList();
    });
  });
}

function onDragStart(e) {
  e.preventDefault();
  const wrap = $("imageList");
  const item = e.currentTarget.closest(".img-item");
  if (!item) return;
  item.classList.add("dragging");

  const move = (ev) => {
    const y = ev.clientY;
    const others = Array.from(wrap.querySelectorAll(".img-item:not(.dragging)"));
    let placed = false;
    for (const el of others) {
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        wrap.insertBefore(item, el);
        placed = true;
        break;
      }
    }
    if (!placed) wrap.appendChild(item);
  };

  const up = () => {
    item.classList.remove("dragging");
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    const order = Array.from(wrap.querySelectorAll(".img-item")).map((el) => +el.dataset.key);
    currentImages.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    renderImageList();
  };

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}

/* ----- Снимки: запис ----- */
async function saveProduct(e) {
  e.preventDefault();
  $("modalError").style.display = "none";
  const name = $("pName").value.trim();
  const priceEur = parseFloat($("pPrice").value);
  const categorySlug = $("pCategory").value;

  if (!name) return showModalError("Въведете име.");
  if (!isFinite(priceEur) || priceEur < 0) return showModalError("Въведете валидна цена в евро.");
  if (!categorySlug) return showModalError("Изберете категория.");

  const pack = $("pUnitPack").value.trim();
  const qty = $("pUnitQty").value.trim();
  const unitType = $("pUnitType").value;
  let compiledUnit = "";
  if (pack) {
    compiledUnit = pack + (qty ? " " + qty : "") + unitType;
  } else {
    compiledUnit = (qty ? qty + " " : "") + unitType;
  }
  compiledUnit = compiledUnit.trim();

  const payload = {
    token,
    name,
    desc: $("pDesc").value.trim(),
    longDesc: $("pLongDesc").value.trim(),
    priceEur,
    unit: compiledUnit,
    categorySlug,
    tag: $("pTag").value.trim() || undefined,
    images: currentImages.map((i) => i.ref),
  };

  $("saveProductBtn").disabled = true;
  try {
    if (editingId) {
      await client.mutation(api.products.update, { ...payload, id: editingId });
      toast("Промените са записани.", "ok");
    } else {
      await client.mutation(api.products.create, payload);
      toast("Артикулът е добавен.", "ok");
    }
    closeProductModal();
    await loadData();
  } catch (err) {
    showModalError(cleanErr(err));
  } finally {
    $("saveProductBtn").disabled = false;
  }
}

async function deleteProduct() {
  if (!editingId) return;
  if (!confirm("Сигурни ли сте, че искате да изтриете този артикул?")) return;
  try {
    await client.mutation(api.products.remove, { token, id: editingId });
    closeProductModal();
    await loadData();
    toast("Артикулът е изтрит.", "ok");
  } catch (e) {
    showModalError(cleanErr(e));
  }
}

function showModalError(msg) {
  const el = $("modalError");
  el.textContent = msg;
  el.style.display = "";
}

function cleanErr(e) {
  let m = (e && e.message) || String(e);
  // Convex обвива съобщенията; вадим четимата част след "Uncaught Error:".
  const idx = m.indexOf("Uncaught Error:");
  if (idx >= 0) m = m.slice(idx + "Uncaught Error:".length);
  m = m.split("\n")[0].trim();
  return m || "Възникна грешка.";
}

/* ---------------- Стартиране / събития ---------------- */
async function enterDashboard() {
  $("loginView").style.display = "none";
  $("dashboardView").style.display = "";
  try {
    await loadData();
  } catch (e) {
    toast("Грешка при зареждане на данните.", "error");
  }
}

function setupEvents() {
  $("loginForm").addEventListener("submit", doLogin);
  $("pwToggle").addEventListener("click", () => {
    const pw = $("pw");
    pw.type = pw.type === "password" ? "text" : "password";
  });
  $("logoutBtn").addEventListener("click", logout);

  // Табове
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      $("panel-products").style.display = which === "products" ? "" : "none";
      $("panel-categories").style.display = which === "categories" ? "" : "none";
    });
  });

  // Филтри продукти
  $("adminCatFilter").addEventListener("change", renderProducts);
  $("adminSort").addEventListener("change", renderProducts);

  // Списък продукти — делегирани клика
  $("adminProductList").addEventListener("click", (e) => {
    const edit = e.target.closest(".edit");
    const del = e.target.closest(".del");
    if (edit) {
      const p = products.find((x) => x.id === edit.dataset.id);
      if (p) openProductModal(p);
    } else if (del) {
      const p = products.find((x) => x.id === del.dataset.id);
      if (p) {
        editingId = p.id;
        deleteProduct();
      }
    }
  });

  // Категории — делегирани клика
  $("adminCatList").addEventListener("click", (e) => {
    const edit = e.target.closest(".edit-cat");
    const del = e.target.closest(".del-cat");
    if (edit) renameCategory(edit.dataset.id, edit.dataset.name);
    else if (del) deleteCategory(del.dataset.id);
  });
  $("addCatBtn").addEventListener("click", addCategory);
  $("newCatName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addCategory();
  });

  // Продуктов модал
  $("addProductBtn").addEventListener("click", () => openProductModal(null));
  $("modalClose").addEventListener("click", closeProductModal);
  $("cancelBtn").addEventListener("click", closeProductModal);
  $("modalOverlay").addEventListener("click", closeProductModal);
  $("productForm").addEventListener("submit", saveProduct);
  $("deleteProductBtn").addEventListener("click", deleteProduct);
  $("pPrice").addEventListener("input", updatePricePreview);

  // Снимки
  $("imageAddBtn").addEventListener("click", () => $("imageInput").click());
  $("imageInput").addEventListener("change", (e) => handleFiles(e.target.files));
}

async function init() {
  setupEvents();
  if (await tryRestoreSession()) {
    await enterDashboard();
  } else {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    $("loginView").style.display = "";
  }
}

if (window.GF) init();
else window.addEventListener("gf-ready", init, { once: true });
