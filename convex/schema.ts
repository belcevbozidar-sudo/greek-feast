import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Категории продукти. `slug` е стабилен идентификатор, използван в URL-и и филтри.
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  // Продукти. Цената се пази САМО в евро (число). Левовете се смятат при показване.
  products: defineTable({
    name: v.string(),
    desc: v.string(), // кратко описание
    longDesc: v.string(), // дълго описание
    priceEur: v.number(), // цена в евро
    unit: v.string(), // напр. "450г", "2 бр."
    categorySlug: v.string(),
    tag: v.optional(v.string()), // напр. "Хит" (по избор)
    // Снимки — първата е главната. Поддържа качени в Convex storage (kind:"storage")
    // и вече съществуващи статични снимки от сайта (kind:"url").
    images: v.array(
      v.union(
        v.object({ kind: v.literal("storage"), id: v.id("_storage") }),
        v.object({ kind: v.literal("url"), url: v.string() }),
      ),
    ),
    order: v.number(), // ръчна подредба вътре в категорията
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categorySlug"])
    .index("by_order", ["order"]),

  // Активни сесии на админа. Пазим само SHA-256 хеш на токена, никога суровия токен.
  sessions: defineTable({
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_tokenHash", ["tokenHash"]),

  // Rate limiting за вход — по хеширан IP. Не може да се заобиколи от клиента.
  loginAttempts: defineTable({
    ipHash: v.string(),
    failures: v.number(),
    windowStart: v.number(),
    lockedUntil: v.number(),
  }).index("by_ip", ["ipHash"]),
});
