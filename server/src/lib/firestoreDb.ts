import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { logger } from "./logger";

let db: admin.firestore.Firestore;

export function initFirestore(): admin.firestore.Firestore {
  if (getApps().length === 0) {
    try {
      // Se estiver rodando no Firebase Functions, usa credenciais padrão
      // Se estiver rodando local ou em outro servidor, precisa de GOOGLE_APPLICATION_CREDENTIALS
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      logger.info("Firebase Admin initialized");
    } catch (error) {
      logger.error("Error initializing Firebase Admin", error);
      throw error;
    }
  }

  if (!db) {
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
  }

  return db;
}

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    return initFirestore();
  }
  return db;
}
