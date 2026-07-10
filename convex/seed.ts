import { internalMutation } from "./_generated/server";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./seedData";

// Еднократно попълване на базата със съществуващите категории и продукти.
// Пуска се от CLI: `npx convex run seed:seed`
// Безопасно е — ако вече има продукти, не прави нищо.
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").take(1);
    if (existing.length > 0) {
      return { skipped: true, reason: "Вече има продукти в базата." };
    }
    const now = Date.now();

    for (const c of SEED_CATEGORIES) {
      const dup = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", c.slug))
        .unique();
      if (!dup) {
        await ctx.db.insert("categories", {
          name: c.name,
          slug: c.slug,
          order: c.order,
          createdAt: now,
        });
      }
    }

    let count = 0;
    for (const p of SEED_PRODUCTS) {
      await ctx.db.insert("products", {
        name: p.name,
        desc: p.desc,
        longDesc: p.longDesc,
        priceEur: p.priceEur,
        unit: p.unit,
        categorySlug: p.categorySlug,
        tag: p.tag || undefined,
        images: [{ kind: "url" as const, url: p.imageUrl }],
        order: p.order,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { skipped: false, categories: SEED_CATEGORIES.length, products: count };
  },
});
