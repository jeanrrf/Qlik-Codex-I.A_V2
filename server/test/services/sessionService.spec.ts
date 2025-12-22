/**
 * Tests for sessionService
 * Validates session persistence with nullable progress_data
 */

import dotenv from "dotenv";
dotenv.config();

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveActiveSession,
  getActiveSession,
  getUserActiveSessions,
  deleteSession
} from "../../src/services/sessionService";
import { DbAdapter } from "../../src/lib/dbAdapter";

describe("sessionService", () => {
  const testSessionId = "test-session-null-progress";

  afterEach(async () => {
    // Cleanup test sessions
    try {
      await deleteSession(testSessionId);
    } catch (e) {
      // Ignore if not exists
    }
  });

  describe("saveActiveSession", () => {
    it("should save session with null progressData without error", async () => {
      await expect(async () => {
        await saveActiveSession({
          id: testSessionId,
          mode: "ultra-expert",
          // script: REMOVIDO - não é mais persistido
          progressData: null as any,
          status: "running"
        });
      }).not.toThrow();
    });

    it("should save session with undefined progressData without error", async () => {
      await expect(async () => {
        await saveActiveSession({
          id: testSessionId + "-undefined",
          mode: "ultra-expert",
          // script: REMOVIDO
          progressData: undefined,
          status: "running"
        });
      }).not.toThrow();

      // Cleanup
      await deleteSession(testSessionId + "-undefined");
    });

    it("should save session with valid progressData object", async () => {
      await expect(async () => {
        await saveActiveSession({
          id: testSessionId + "-valid",
          mode: "ultra-expert",
          // script: REMOVIDO
          progressData: { step: 1, progress: 50 },
          status: "running"
        });
      }).not.toThrow();

      // Cleanup
      await deleteSession(testSessionId + "-valid");
    });
  });

  describe("getActiveSession", () => {
    it("should return empty object for progressData when null in database", async () => {
      // Save with null progress
      await saveActiveSession({
        id: testSessionId,
        mode: "ultra-expert",
        // script: REMOVIDO
        progressData: null as any,
        status: "running"
      });

      const session = await getActiveSession(testSessionId);

      expect(session).not.toBeNull();
      expect(session?.progressData).toEqual({});
    });

    it("should return actual progressData when present", async () => {
      const progressData = { step: 2, substep: "opt_001_main", progress: 75 };

      await saveActiveSession({
        id: testSessionId + "-with-data",
        mode: "ultra-expert",
        // script: REMOVIDO
        progressData,
        status: "running"
      });

      const session = await getActiveSession(testSessionId + "-with-data");

      expect(session).not.toBeNull();
      expect(session?.progressData).toEqual(progressData);

      // Cleanup
      await deleteSession(testSessionId + "-with-data");
    });
  });

  describe("getUserActiveSessions", () => {
    it("should handle sessions with null progressData", async () => {
      await saveActiveSession({
        id: testSessionId + "-list-1",
        userId: "test-user",
        mode: "ultra-expert",
        // script: REMOVIDO
        progressData: null as any,
        status: "running"
      });

      await saveActiveSession({
        id: testSessionId + "-list-2",
        userId: "test-user",
        mode: "ultra-expert",
        // script: REMOVIDO
        progressData: { step: 1 },
        status: "paused"
      });

      const sessions = await getUserActiveSessions("test-user");

      expect(sessions.length).toBeGreaterThanOrEqual(2);

      const session1 = sessions.find(s => s.id === testSessionId + "-list-1");
      const session2 = sessions.find(s => s.id === testSessionId + "-list-2");

      expect(session1?.progressData).toEqual({});
      expect(session2?.progressData).toEqual({ step: 1 });

      // Cleanup
      await deleteSession(testSessionId + "-list-1");
      await deleteSession(testSessionId + "-list-2");
    });
  });

  describe("database constraint", () => {
    it("should not throw SQLITE_CONSTRAINT_NOTNULL error", async () => {
      const db = new DbAdapter();

      await expect(async () => {
        // NOTA: coluna 'script' foi removida do schema por segurança
        await db.run(`
          INSERT INTO active_sessions (
            id, user_id, mode, llm_provider, llm_model,
            progress_data, status, created_at, updated_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testSessionId + "-direct",
          null,
          "ultra-expert",
          null,
          null,
          null, // Explicitly null - should be allowed now
          "running",
          new Date().toISOString(),
          new Date().toISOString(),
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        ]);
      }).not.toThrow();

      // Cleanup
      await deleteSession(testSessionId + "-direct");
    });
  });
});
