import { query, mutation, internalQuery, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { hashToken } from "./lib/crypto";

const MAX_FAILURES = 3; // 3 неуспешни опита...
const LOCK_MS = 60 * 60 * 1000; // ...след което 1 час заключване
const SESSION_MS = 12 * 60 * 60 * 1000; // обикновена сесия: 12 часа
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // "запомни ме": 30 дни

// Глобален предпазител срещу заобикаляне на IP-лимита чрез сменяне на IP адреси
// (напр. подправяне на x-forwarded-for). Ограничава ОБЩИЯ брой неуспешни опити.
const GLOBAL_KEY = "__GLOBAL__";
const GLOBAL_MAX_FAILURES = 15;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000; // в рамките на 1 час
const GLOBAL_LOCK_MS = 60 * 60 * 1000; // заключване за 1 час

// Обновява запис за опити (IP или глобален) и връща lockedUntil.
async function bumpFailure(
  ctx: MutationCtx,
  key: string,
  maxFailures: number,
  windowMs: number | null,
  lockMs: number,
): Promise<number> {
  const now = Date.now();
  const rec = await ctx.db
    .query("loginAttempts")
    .withIndex("by_ip", (q) => q.eq("ipHash", key))
    .unique();

  if (!rec) {
    await ctx.db.insert("loginAttempts", { ipHash: key, failures: 1, windowStart: now, lockedUntil: 0 });
    return 0;
  }
  if (rec.lockedUntil > now) return rec.lockedUntil;

  let failures = rec.failures;
  let windowStart = rec.windowStart;
  // Плъзгащ прозорец (само за глобалния брояч).
  if (windowMs !== null && now - windowStart > windowMs) {
    failures = 0;
    windowStart = now;
  }
  failures += 1;

  if (failures >= maxFailures) {
    const lockedUntil = now + lockMs;
    await ctx.db.patch(rec._id, { failures: 0, lockedUntil, windowStart: now });
    return lockedUntil;
  }
  await ctx.db.patch(rec._id, { failures, windowStart });
  return 0;
}

// ---- Помощник за оторизация, използван от всички защитени функции ----
// Хвърля грешка, ако токенът липсва, е невалиден или е изтекъл.
export async function requireAuth(ctx: QueryCtx | MutationCtx, token: unknown): Promise<void> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    throw new Error("Не сте оторизирани.");
  }
  const tokenHash = await hashToken(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Сесията е изтекла. Влезте отново.");
  }
}

// ---- Rate limiting: статус на заключване по IP (извиква се преди проверка на паролата) ----
export const getLockStatus = internalQuery({
  args: { ipHash: v.string() },
  handler: async (ctx, { ipHash }) => {
    const now = Date.now();
    const [ipRec, globalRec] = await Promise.all([
      ctx.db.query("loginAttempts").withIndex("by_ip", (q) => q.eq("ipHash", ipHash)).unique(),
      ctx.db.query("loginAttempts").withIndex("by_ip", (q) => q.eq("ipHash", GLOBAL_KEY)).unique(),
    ]);
    const ipLock = ipRec && ipRec.lockedUntil > now ? ipRec.lockedUntil : 0;
    const globalLock = globalRec && globalRec.lockedUntil > now ? globalRec.lockedUntil : 0;
    return { lockedUntil: Math.max(ipLock, globalLock), now };
  },
});

// ---- Записва неуспешен опит и при нужда заключва за 1 час ----
export const registerFailure = internalMutation({
  args: { ipHash: v.string() },
  handler: async (ctx, { ipHash }) => {
    // По-IP лимит (основен) + глобален предпазител (срещу смяна на IP).
    const ipLock = await bumpFailure(ctx, ipHash, MAX_FAILURES, null, LOCK_MS);
    const globalLock = await bumpFailure(ctx, GLOBAL_KEY, GLOBAL_MAX_FAILURES, GLOBAL_WINDOW_MS, GLOBAL_LOCK_MS);
    const lockedUntil = Math.max(ipLock, globalLock);

    // Оставащи опити за този IP (за съобщението към потребителя).
    const ipRec = await ctx.db
      .query("loginAttempts")
      .withIndex("by_ip", (q) => q.eq("ipHash", ipHash))
      .unique();
    const failuresLeft = ipRec && ipRec.lockedUntil <= Date.now() ? Math.max(0, MAX_FAILURES - ipRec.failures) : 0;

    return { lockedUntil, failuresLeft };
  },
});

// ---- Успешен вход: изчиства опитите и създава сесия ----
export const registerSuccess = internalMutation({
  args: { ipHash: v.string(), tokenHash: v.string(), remember: v.boolean() },
  handler: async (ctx, { ipHash, tokenHash, remember }) => {
    const now = Date.now();

    // Успешен вход изчиства както IP брояча, така и глобалния предпазител.
    for (const key of [ipHash, GLOBAL_KEY]) {
      const rec = await ctx.db
        .query("loginAttempts")
        .withIndex("by_ip", (q) => q.eq("ipHash", key))
        .unique();
      if (rec) await ctx.db.delete(rec._id);
    }

    const expiresAt = now + (remember ? REMEMBER_MS : SESSION_MS);
    await ctx.db.insert("sessions", { tokenHash, expiresAt, createdAt: now });

    // Опортюнистично чистим няколко изтекли сесии.
    const expired = await ctx.db.query("sessions").take(50);
    for (const s of expired) {
      if (s.expiresAt < now) await ctx.db.delete(s._id);
    }
    return { expiresAt };
  },
});

// ---- Публична проверка дали токен от "запомни ме" още е валиден ----
export const checkSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 20 || token.length > 200) return { valid: false };
    const tokenHash = await hashToken(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    return { valid: !!session && session.expiresAt >= Date.now() };
  },
});

// ---- Изход: изтрива сесията ----
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return { ok: true };
  },
});
