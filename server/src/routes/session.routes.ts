/**
 * Rotas de API para gerenciamento de sessões ativas
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  saveActiveSession,
  getActiveSession,
  getUserActiveSessions,
  updateSessionStatus,
  deleteSession
} from "../services/sessionService";

const router = Router();

// Schema de validação (script NÃO é mais aceito)
const SaveSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  mode: z.enum(["analysis", "ultra-expert"]),
  // script: REMOVIDO - não persistimos scripts no servidor
  llmProvider: z.enum(["ainex", "google", "nvidia"]).optional(),
  llmModel: z.string().optional(),
  progressData: z.any().optional(),
  status: z.enum(["running", "paused", "completed", "error"])
});

/**
 * POST /api/sessions/save
 * Salva ou atualiza uma sessão ativa (sem o script)
 */
router.post(
  "/save",
  asyncHandler(async (req: Request, res: Response) => {
    const data = SaveSessionSchema.parse(req.body);

    saveActiveSession({
      id: data.sessionId,
      userId: data.userId,
      mode: data.mode,
      // script: NÃO é mais persistido
      llmProvider: data.llmProvider,
      llmModel: data.llmModel,
      progressData: data.progressData,
      status: data.status
    });

    res.json({ success: true, sessionId: data.sessionId });
  })
);

/**
 * GET /api/sessions/:sessionId
 * Recupera uma sessão ativa por ID
 */
router.get(
  "/:sessionId",
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = getActiveSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Sessão não encontrada ou expirada" });
    }

    res.json(session);
  })
);

/**
 * GET /api/sessions/user/:userId
 * Lista sessões ativas do usuário
 */
router.get(
  "/user/:userId?",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const sessions = getUserActiveSessions(userId);

    res.json({ sessions });
  })
);

/**
 * PATCH /api/sessions/:sessionId/status
 * Atualiza status de uma sessão
 */
router.patch(
  "/:sessionId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { status } = z.object({ status: z.enum(["running", "paused", "completed", "error"]) }).parse(req.body);

    updateSessionStatus(sessionId, status);

    res.json({ success: true });
  })
);

/**
 * DELETE /api/sessions/:sessionId
 * Remove uma sessão
 */
router.delete(
  "/:sessionId",
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    deleteSession(sessionId);

    res.json({ success: true });
  })
);

export default router;
