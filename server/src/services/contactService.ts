import { randomUUID } from "node:crypto";

import { logger } from "../lib/logger";
import { getSqliteDb } from "../lib/sqliteDb";
import type { ContactRecord, ContactRequest } from "../types/contact";

class ContactService {
  async createContact(payload: ContactRequest): Promise<ContactRecord> {
    const record: ContactRecord = {
      id: randomUUID(),
      name: payload.name,
      email: payload.email,
      company: payload.company,
      message: payload.message,
      createdAt: new Date().toISOString()
    };

    logger.info("Contato recebido via landing page", {
      id: record.id,
      name: record.name,
      email: record.email,
      company: record.company
    });

    try {
      const db = getSqliteDb();

      const stmt = db.prepare(`
        INSERT INTO contact_messages (id, name, email, company, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        record.id,
        record.name,
        record.email,
        record.company,
        record.message ?? null,
        record.createdAt
      );

      logger.info("Contato persistido no SQLite", { id: record.id });
    } catch (err) {
      logger.warn("Falha ao persistir contato no banco. Registro apenas em log.", {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return record;
  }
}

export const contactService = new ContactService();

