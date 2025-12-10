import { Router } from "express";

import { asyncHandler } from "../middleware/asyncHandler";
import { AuthRequest, optionalAuth } from "../middleware/authMiddleware";
import { recordVisit } from "../services/analyticsService";
import { UserRole } from "../types/auth";

const router = Router();

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const asMetadata = (
  value: unknown
): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;

router.post(
  "/visit",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown>;
    await recordVisit({
      sessionId: asString(body.sessionId),
      userId: asString(body.userId) ?? req.user?.id,
      metadata: asMetadata(body.metadata),
      isOwner: req.user?.role === UserRole.OWNER
    });
    res.status(201).json({ success: true });
  })
);

export { router as metricsRouter };
export default router;
