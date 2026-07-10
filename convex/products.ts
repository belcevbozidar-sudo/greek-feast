import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

const MAX_IMAGES = 12;

type ImageRef =
  | { kind: "storage"; id: Id<"_storage"> }
  | { kind: "url"; url: string };

const imageValidator = v.union(
  v.object({ kind: v.literal("storage"), id: v.id("_storage") }),
  v.object({ kind: v.literal("url"), url: v.string() }),
);

function validateProductInput(input: {
  name: string;
  desc: string;
  longDesc: string;
  priceEur: number;
  unit: string;
  categorySlug: string;
  tag?: string;
  images: ImageRef[];
}) {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 120) throw new Error("Името трябва да е между 1 и 120 символа.");
  const desc = input.desc.trim();
  if (desc.length > 600) throw new Error("Краткото описание е твърде дълго (макс. 600 символа).");
  const longDesc = input.longDesc.trim();
  if (longDesc.length > 4000) throw new Error("Дългото описание е твърде дълго (макс. 4000 символа).");
  if (!Number.isFinite(input.priceEur) || input.priceEur < 0 || input.priceEur > 1000000)
    throw new Error("Невалидна цена.");
  const unit = input.unit.trim();
  if (unit.length > 40) throw new Error("Мерната единица е твърде дълга.");
  const tag = input.tag?.trim() || undefined;
  if (tag && tag.length > 30) throw new Error("Етикетът е твърде дълъг.");
  if (!Array.isArray(input.images) || input.images.length > MAX_IMAGES)
    throw new Error(`Максимум ${MAX_IMAGES} снимки.`);
  const slug = input.categorySlug.trim();
  if (!slug) throw new Error("Изберете категория.");
  // Закръгляме цената до 2 знака.
  const priceEur = Math.round(input.priceEur * 100) / 100;
  return { name, desc, longDesc, priceEur, unit, categorySlug: slug, tag, images: input.images };
}

async function resolveImages(ctx: any, images: ImageRef[]): Promise<string[]> {
  const urls: string[] = [];
  for (const img of images) {
    if (img.kind === "url") {
      urls.push(img.url);
    } else {
      const url = await ctx.storage.getUrl(img.id);
      if (url) urls.push(url);
    }
  }
  return urls;
}

async function serialize(ctx: any, p: Doc<"products">) {
  const imageUrls = await resolveImages(ctx, p.images);
  return {
    id: p._id,
    name: p.name,
    desc: p.desc,
    longDesc: p.longDesc,
    priceEur: p.priceEur,
    unit: p.unit,
    categorySlug: p.categorySlug,
    tag: p.tag,
    order: p.order,
    createdAt: p.createdAt,
    images: imageUrls,
    mainImage: imageUrls[0] || null,
    imageRefs: p.images, // сурови референции, нужни на админа за редакция/пренареждане
  };
}

// ---- Публичен списък с продукти (филтър по категория + сортиране) ----
export const list = query({
  args: {
    categorySlug: v.optional(v.string()),
    sort: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("price-asc"),
        v.literal("price-desc"),
        v.literal("name"),
        v.literal("newest"),
      ),
    ),
  },
  handler: async (ctx, { categorySlug, sort }) => {
    let items: Doc<"products">[];
    if (categorySlug && categorySlug !== "all") {
      items = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categorySlug", categorySlug))
        .collect();
    } else {
      items = await ctx.db.query("products").collect();
    }

    const s = sort || "manual";
    items.sort((a, b) => {
      switch (s) {
        case "price-asc":
          return a.priceEur - b.priceEur;
        case "price-desc":
          return b.priceEur - a.priceEur;
        case "name":
          return a.name.localeCompare(b.name, "bg");
        case "newest":
          return b.createdAt - a.createdAt;
        default:
          return a.order - b.order || a.createdAt - b.createdAt;
      }
    });

    return await Promise.all(items.map((p) => serialize(ctx, p)));
  },
});

// ---- Единичен продукт ----
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) return null;
    return await serialize(ctx, p);
  },
});

// ---- Създаване ----
export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    desc: v.string(),
    longDesc: v.string(),
    priceEur: v.number(),
    unit: v.string(),
    categorySlug: v.string(),
    tag: v.optional(v.string()),
    images: v.array(imageValidator),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const clean = validateProductInput(args);

    const cat = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", clean.categorySlug))
      .unique();
    if (!cat) throw new Error("Избраната категория не съществува.");

    const all = await ctx.db.query("products").collect();
    const maxOrder = all.reduce((m, p) => Math.max(m, p.order), 0);
    const now = Date.now();
    return await ctx.db.insert("products", {
      ...clean,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ---- Редакция ----
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("products"),
    name: v.string(),
    desc: v.string(),
    longDesc: v.string(),
    priceEur: v.number(),
    unit: v.string(),
    categorySlug: v.string(),
    tag: v.optional(v.string()),
    images: v.array(imageValidator),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Продуктът не е намерен.");
    const clean = validateProductInput(args);

    const cat = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", clean.categorySlug))
      .unique();
    if (!cat) throw new Error("Избраната категория не съществува.");

    // Изтриваме от storage качените снимки, които вече не се използват.
    const keptStorageIds = new Set(
      clean.images.filter((i) => i.kind === "storage").map((i) => (i as { id: Id<"_storage"> }).id),
    );
    for (const old of existing.images) {
      if (old.kind === "storage" && !keptStorageIds.has(old.id)) {
        try {
          await ctx.storage.delete(old.id);
        } catch {
          /* игнорираме, ако вече е изтрита */
        }
      }
    }

    await ctx.db.patch(args.id, { ...clean, updatedAt: Date.now() });
    return { ok: true };
  },
});

// ---- Изтриване (заедно със снимките) ----
export const remove = mutation({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, { token, id }) => {
    await requireAuth(ctx, token);
    const p = await ctx.db.get(id);
    if (!p) return { ok: true };
    for (const img of p.images) {
      if (img.kind === "storage") {
        try {
          await ctx.storage.delete(img.id);
        } catch {
          /* игнорираме */
        }
      }
    }
    await ctx.db.delete(id);
    return { ok: true };
  },
});
