import { Router } from "express";

import { logger } from "../lib/logger";
import { asyncHandler } from "../middleware/asyncHandler";
import { emailService } from "../services/emailService";
import { contactSchema } from "../validators/requestSchemas";

export const contactRouter = Router();

/**
 * POST /api/contact
 * Recebe formulário de contato básico.
 * Envia email e loga a mensagem.
 */
contactRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = contactSchema.parse(req.body);

    logger.info("[CONTACT] Mensagem recebida", {
      name: payload.name,
      email: payload.email,
      company: payload.company,
      hasMessage: Boolean(payload.message && payload.message.trim())
    });

    // Tenta enviar o email (não bloqueia a resposta se falhar, mas loga erro)
    const emailSent = await emailService.sendContactEmail(payload);

    res.json({
      success: true,
      message: "Contato recebido. Retornaremos em breve.",
      emailSent
    });
  })
);

export default contactRouter;
