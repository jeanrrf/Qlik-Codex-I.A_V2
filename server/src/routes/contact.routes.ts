import { Router } from "express";

import { logger } from "../lib/logger";
import { asyncHandler } from "../middleware/asyncHandler";
import { contactSchema } from "../validators/requestSchemas";

export const contactRouter = Router();

/**
 * POST /api/contact
 * Recebe formulário de contato básico.
 * Hoje apenas valida e loga; integrar com email/CRM depois.
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

    res.json({
      success: true,
      message: "Contato recebido. Retornaremos em breve."
    });
  })
);

export default contactRouter;
