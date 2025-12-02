/**
 * Tests for sessionService
 * Validates session persistence with nullable progress_data
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveActiveSession,
  getActiveSession,
  getUserActiveSessions,
  deleteSession
} from "../../src/services/sessionService";
import { getSqliteDb } from "../../src/lib/sqliteDb";

describe("sessionService", () => {
  const testSessionId = "test-session-null-progress";

  afterEach(() => {
    // Cleanup test sessions
    try {
      deleteSession(testSessionId);
    } catch (e) {
      // Ignore if not exists
    }
  });

  describe("saveActiveSession", () => {
    it("should save session with null progressData without error", () => {
      expect(() => {
        saveActiveSession({
          id: testSessionId,
          mode: "ultra-expert",
          script: "LOAD * FROM test;",
          progressData: null as any,
          status: "running"
        });
      }).not.toThrow();
    });

    it("should save session with undefined progressData without error", () => {
      expect(() => {
        saveActiveSession({
          id: testSessionId + "-undefined",
          mode: "analysis",
          script: "LOAD * FROM test;",
          progressData: undefined,
          status: "running"
        });
      }).not.toThrow();

      // Cleanup
      deleteSession(testSessionId + "-undefined");
    });

    it("should save session with valid progressData object", () => {
      expect(() => {
        saveActiveSession({
          id: testSessionId + "-valid",
          mode: "ultra-expert",
          script: "LOAD * FROM test;",
          progressData: { step: 1, progress: 50 },
          status: "running"
        });
      }).not.toThrow();

      // Cleanup
      deleteSession(testSessionId + "-valid");
    });
  });

  describe("getActiveSession", () => {
    it("should return empty object for progressData when null in database", () => {
      // Save with null progress
      saveActiveSession({
        id: testSessionId,
        mode: "ultra-expert",
        script: "LOAD * FROM test;",
        progressData: null as any,
        status: "running"
      });

      const session = getActiveSession(testSessionId);

      expect(session).not.toBeNull();
      expect(session?.progressData).toEqual({});
    });

    it("should return actual progressData when present", () => {
      const progressData = { step: 2, substep: "opt_001_main", progress: 75 };

      saveActiveSession({
        id: testSessionId + "-with-data",
        mode: "ultra-expert",
        script: "LOAD * FROM test;",
        progressData,
        status: "running"
      });

      const session = getActiveSession(testSessionId + "-with-data");

      expect(session).not.toBeNull();
      expect(session?.progressData).toEqual(progressData);

      // Cleanup
      deleteSession(testSessionId + "-with-data");
    });
  });

  describe("getUserActiveSessions", () => {
    it("should handle sessions with null progressData", () => {
      saveActiveSession({
        id: testSessionId + "-list-1",
        userId: "test-user",
        mode: "analysis",
        script: "LOAD * FROM test1;",
        progressData: null as any,
        status: "running"
      });

      saveActiveSession({
        id: testSessionId + "-list-2",
        userId: "test-user",
        mode: "ultra-expert",
        script: "LOAD * FROM test2;",
        progressData: { step: 1 },
        status: "paused"
      });

      const sessions = getUserActiveSessions("test-user");

      expect(sessions.length).toBeGreaterThanOrEqual(2);

      const session1 = sessions.find(s => s.id === testSessionId + "-list-1");
      const session2 = sessions.find(s => s.id === testSessionId + "-list-2");

      expect(session1?.progressData).toEqual({});
      expect(session2?.progressData).toEqual({ step: 1 });

      // Cleanup
      deleteSession(testSessionId + "-list-1");
      deleteSession(testSessionId + "-list-2");
    });
  });

  describe("database constraint", () => {
    it("should not throw SQLITE_CONSTRAINT_NOTNULL error", () => {
      const db = getSqliteDb();

      expect(() => {
        const stmt = db.prepare(`
          INSERT INTO active_sessions (
            id, user_id, mode, script, llm_provider, llm_model,
            progress_data, status, created_at, updated_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          testSessionId + "-direct",
          null,
          "analysis",
          "LOAD * FROM test;",
          null,
          null,
          null, // Explicitly null - should be allowed now
          "running",
          new Date().toISOString(),
          new Date().toISOString(),
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        );
      }).not.toThrow();

      // Cleanup
      deleteSession(testSessionId + "-direct");
    });
  });
});
