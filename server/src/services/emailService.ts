import nodemailer from "nodemailer";

import { config } from "../lib/config";
import { logger } from "../lib/logger";

interface ContactEmailPayload {
  name: string;
  email: string;
  company?: string;
  message?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  async sendContactEmail(payload: ContactEmailPayload): Promise<boolean> {
    if (!config.email.host || !config.email.user) {
      logger.warn("[EmailService] SMTP not configured. Skipping email sending.");
      return false;
    }

    try {
      const mailOptions = {
        from: `"${payload.name}" <${config.email.from}>`, // Sender address (must be verified in some providers)
        replyTo: payload.email, // Reply to the user's email
        to: config.email.to, // Receiver address
        subject: `[Qlik Codex] Novo contato de ${payload.name}`,
        text: `
Nome: ${payload.name}
Email: ${payload.email}
Empresa: ${payload.company || "N/A"}

Mensagem:
${payload.message || "Sem mensagem"}
        `,
        html: `
<h3>Novo contato recebido via Qlik Codex I.A</h3>
<p><strong>Nome:</strong> ${payload.name}</p>
<p><strong>Email:</strong> ${payload.email}</p>
<p><strong>Empresa:</strong> ${payload.company || "N/A"}</p>
<br/>
<p><strong>Mensagem:</strong></p>
<p>${(payload.message || "Sem mensagem").replace(/\n/g, "<br/>")}</p>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info("[EmailService] Email sent", { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error("[EmailService] Failed to send email", { error });
      return false;
    }
  }
}

export const emailService = new EmailService();
