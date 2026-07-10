import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyPassword, generateToken, hashToken } from "./lib/crypto";

// CORS: позволяваме извикване от браузъра. Не използваме cookies (bearer токен е в тялото),
// затова е безопасно да отразяваме Origin. Входът е защитен със сървърен rate limit.
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}

const login = httpAction(async (ctx, req) => {
  const origin = req.headers.get("Origin");
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };

  let body: { password?: unknown; remember?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Невалидна заявка." }), { status: 400, headers });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  const ipHash = await hashToken(clientIp(req));

  // 1) Проверка за заключване (rate limit) — сървърна, не може да се заобиколи.
  const lock = await ctx.runQuery(internal.auth.getLockStatus, { ipHash });
  if (lock.lockedUntil > lock.now) {
    const retryAfterSec = Math.ceil((lock.lockedUntil - lock.now) / 1000);
    return new Response(
      JSON.stringify({ error: "Твърде много опити. Опитайте по-късно.", lockedUntil: lock.lockedUntil }),
      { status: 429, headers: { ...headers, "Retry-After": String(retryAfterSec) } },
    );
  }

  // 2) Проверка на паролата срещу хеша в environment variable.
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) {
    return new Response(JSON.stringify({ error: "Сървърът не е конфигуриран." }), { status: 500, headers });
  }
  const ok = password.length > 0 && password.length <= 256 && (await verifyPassword(password, stored));

  if (!ok) {
    const res = await ctx.runMutation(internal.auth.registerFailure, { ipHash });
    if (res.lockedUntil > Date.now()) {
      return new Response(
        JSON.stringify({ error: "Твърде много опити. Изчакайте 1 час.", lockedUntil: res.lockedUntil }),
        { status: 429, headers },
      );
    }
    return new Response(
      JSON.stringify({ error: "Грешна парола.", attemptsLeft: res.failuresLeft }),
      { status: 401, headers },
    );
  }

  // 3) Успех: издаваме сесиен токен и го пазим само като хеш.
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const { expiresAt } = await ctx.runMutation(internal.auth.registerSuccess, {
    ipHash,
    tokenHash,
    remember,
  });

  return new Response(JSON.stringify({ token, expiresAt }), { status: 200, headers });
});

const preflight = httpAction(async (_ctx, req) => {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("Origin")) });
});

const http = httpRouter();
http.route({ path: "/login", method: "POST", handler: login });
http.route({ path: "/login", method: "OPTIONS", handler: preflight });

export default http;
