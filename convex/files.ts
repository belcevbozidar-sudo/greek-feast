import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";

// Генерира кратко-живущ URL за качване на снимка. Само за оторизиран админ.
// Клиентът POST-ва файла на този URL и получава storageId, който после се записва в продукта.
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAuth(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});
