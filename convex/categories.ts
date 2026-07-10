import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";

function normSlug(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s;
}

function cleanName(raw: string): string {
  const s = raw.trim();
  if (s.length < 1 || s.length > 80) throw new Error("Името на категорията трябва да е между 1 и 80 символа.");
  return s;
}

// ---- Публичен списък с категории ----
export const list = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db.query("categories").withIndex("by_order").collect();
    return cats.map((c) => ({ id: c._id, name: c.name, slug: c.slug, order: c.order }));
  },
});

// ---- Добавяне ----
export const create = mutation({
  args: { token: v.string(), name: v.string(), slug: v.string() },
  handler: async (ctx, { token, name, slug }) => {
    await requireAuth(ctx, token);
    const cleanNameVal = cleanName(name);
    const slugVal = normSlug(slug || name);
    if (!slugVal) throw new Error("Невалиден идентификатор (slug) на категория.");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slugVal))
      .unique();
    if (existing) throw new Error("Категория с този идентификатор вече съществува.");

    const all = await ctx.db.query("categories").collect();
    const maxOrder = all.reduce((m, c) => Math.max(m, c.order), 0);
    return await ctx.db.insert("categories", {
      name: cleanNameVal,
      slug: slugVal,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

// ---- Редакция ----
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, name, slug, order }) => {
    await requireAuth(ctx, token);
    const cat = await ctx.db.get(id);
    if (!cat) throw new Error("Категорията не е намерена.");

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = cleanName(name);
    if (order !== undefined) patch.order = order;

    if (slug !== undefined) {
      const slugVal = normSlug(slug);
      if (!slugVal) throw new Error("Невалиден идентификатор (slug).");
      if (slugVal !== cat.slug) {
        const dup = await ctx.db
          .query("categories")
          .withIndex("by_slug", (q) => q.eq("slug", slugVal))
          .unique();
        if (dup) throw new Error("Друга категория вече използва този идентификатор.");
        // Преместваме всички продукти към новия slug.
        const prods = await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categorySlug", cat.slug))
          .collect();
        for (const p of prods) await ctx.db.patch(p._id, { categorySlug: slugVal });
        patch.slug = slugVal;
      }
    }

    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

// ---- Изтриване (само ако е празна) ----
export const remove = mutation({
  args: { token: v.string(), id: v.id("categories") },
  handler: async (ctx, { token, id }) => {
    await requireAuth(ctx, token);
    const cat = await ctx.db.get(id);
    if (!cat) return { ok: true };
    const prods = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categorySlug", cat.slug))
      .take(1);
    if (prods.length > 0) {
      throw new Error("Категорията съдържа продукти. Първо преместете или изтрийте продуктите.");
    }
    await ctx.db.delete(id);
    return { ok: true };
  },
});
