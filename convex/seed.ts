import { internalMutation } from "./_generated/server";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./seedData";

// Еднократно попълване на базата с новите категории и продукти на едро.
// Пуска се от CLI: `npx convex run seed:seed`
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Изтриваме всички досегашни продукти и категории, за да заредим чисто новата B2B селекция.
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) {
      await ctx.db.delete(p._id);
    }

    const existingCategories = await ctx.db.query("categories").collect();
    for (const c of existingCategories) {
      await ctx.db.delete(c._id);
    }

    const now = Date.now();

    // Вкарваме новите категории
    for (const c of SEED_CATEGORIES) {
      await ctx.db.insert("categories", {
        name: c.name,
        slug: c.slug,
        order: c.order,
        createdAt: now,
      });
    }

    // Вкарваме новите продукти
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
