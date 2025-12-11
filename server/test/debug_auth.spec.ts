
import { describe, it, expect } from 'vitest';
import { createAuthSession, getSessionById, createOrUpdateUserFromGoogle } from "../src/services/authService";
import { initTursoDb } from "../src/lib/tursoDb";
import { v4 as uuidv4 } from "uuid";

describe('Auth Debug', () => {
  it('should create and retrieve a session', async () => {
    console.log("Initializing DB...");
    await initTursoDb();

    const mockProfile = {
      id: "google-test-" + uuidv4(),
      email: "test-" + uuidv4() + "@example.com",
      name: "Test User",
      picture: "http://example.com/pic.jpg"
    };

    console.log("Creating user...", mockProfile.email);
    const user = await createOrUpdateUserFromGoogle(mockProfile);
    console.log("User created:", user.id);

    console.log("Creating session...");
    const { session, tokens } = await createAuthSession(user, "127.0.0.1", "TestScript");
    console.log("Session created:", session.id);
    console.log("Token:", tokens.accessToken.substring(0, 20) + "...");

    console.log("Retrieving session by ID:", session.id);
    const retrievedSession = await getSessionById(session.id);

    if (retrievedSession) {
      console.log("✅ Session found!");
      console.log("Retrieved ID:", retrievedSession.id);
      console.log("Expires At:", retrievedSession.expiresAt);
    } else {
      console.error("❌ Session NOT found!");
    }

    expect(retrievedSession).toBeDefined();
    expect(retrievedSession?.id).toBe(session.id);
  });
});
