/**
 * Convex Mutations - Contact Form
 * Migrado de server/src/routes/contact.routes.ts
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendContact = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Validação básica
    if (!args.name.trim() || !args.email.trim() || !args.message.trim()) {
      throw new Error("Campos obrigatórios: name, email, message");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Email inválido");
    }

    // Salvar no banco Convex (tabela contacts)
    const contactId = await ctx.db.insert("contacts", {
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      subject: args.subject.trim() || "Contato via Qlik Codex",
      message: args.message.trim(),
      createdAt: Date.now(),
      status: "new",
    });

    return {
      success: true,
      message: "Mensagem enviada com sucesso!",
      contactId,
    };
  },
});

export const listContacts = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("contacts").order("desc").take(100);
    return contacts;
  },
});
