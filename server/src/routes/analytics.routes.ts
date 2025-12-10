import { Router } from "express";

import { analyticsEmitter } from "../lib/analyticsEmitter";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  AuthRequest,
  optionalAuth,
  requireAuth,
  requireRole
} from "../middleware/authMiddleware";
import {
  cleanupAnalyticsRecords,
  getAnalyticsSummary,
  logEvent,
  logPageView,
  startSession
} from "../services/analyticsService";
import { UserRole } from "../types/auth";

const analyticsRouter = Router();

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
  value === true || (typeof value === "string" && value.toLowerCase() === "true")
    ? true
    : fallback;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const asMetadata = (
  value: unknown
): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;

analyticsRouter.post(
  "/pageview",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown>;
    await logPageView({
      sessionId: asString(body.sessionId),
      userId: asString(body.userId) ?? req.user?.id,
      page: asString(body.page),
      referrer: asString(body.referrer),
      landingPage: asString(body.landingPage),
      metadata: asMetadata(body.metadata),
      isOwner: normalizeBoolean(body.isOwner, req.user?.role === UserRole.OWNER)
    });
    res.status(201).json({ success: true });
  })
);

analyticsRouter.post(
  "/event",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const eventType = asString(body.eventType);
    if (!eventType) {
      res.status(400).json({ error: "eventType is required" });
      return;
    }

    const parsedValue =
      typeof body.eventValue === "number"
        ? body.eventValue
        : Number(body.eventValue ?? NaN);

    await logEvent({
      sessionId: asString(body.sessionId),
      userId: asString(body.userId) ?? req.user?.id,
      eventType,
      eventCategory: asString(body.eventCategory),
      eventLabel: asString(body.eventLabel),
      eventValue: Number.isFinite(parsedValue) ? parsedValue : undefined,
      metadata: asMetadata(body.metadata),
      isOwner: normalizeBoolean(body.isOwner, req.user?.role === UserRole.OWNER),
      details: asString(body.details)
    });

    res.status(201).json({ success: true });
  })
);

analyticsRouter.post(
  "/session/start",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown>;
    await startSession({
      sessionId: asString(body.sessionId),
      userId: asString(body.userId) ?? req.user?.id,
      landingPage: asString(body.landingPage),
      isOwner: normalizeBoolean(body.isOwner, req.user?.role === UserRole.OWNER)
    });
    res.status(201).json({ success: true });
  })
);

analyticsRouter.get(
  "/summary",
  requireAuth,
  requireRole(UserRole.OWNER),
  asyncHandler(async (_req, res) => {
    const summary = await getAnalyticsSummary();
    res.json(summary);
  })
);

analyticsRouter.delete(
  "/cleanup",
  requireAuth,
  requireRole(UserRole.OWNER),
  asyncHandler(async (req, res) => {
    const daysQuery = req.query.days as string | undefined;
    const parsedDays = Number(daysQuery);
    const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 90;
    const deleted = await cleanupAnalyticsRecords(days);
    res.json({ success: true, deleted, days });
  })
);

analyticsRouter.get(
  "/realtime",
  requireAuth,
  requireRole(UserRole.OWNER),
  (req, res) => {
    analyticsEmitter.addClient(res);
    req.on("close", () => {
      // No-op here, emitter already removes clients
    });
  }
);

export { analyticsRouter };
export default analyticsRouter;
