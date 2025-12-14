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
  private transporter: nodemailer.Transporter | null = null;
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = config.email.enabled && Boolean(config.email.host) && Boolean(config.email.user);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        // Connection timeout to avoid long waits (30 seconds)
        connectionTimeout: 30000,
        // Socket timeout for data transfer (60 seconds)
        socketTimeout: 60000,
        // Greeting timeout (30 seconds)
        greetingTimeout: 30000
      });
      logger.info("[EmailService] SMTP transporter initialized");
    } else {
      logger.info("[EmailService] Email disabled or SMTP not configured. Email features will be skipped.");
    }
  }

  async sendContactEmail(payload: ContactEmailPayload): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.debug("[EmailService] SMTP not configured. Skipping email sending.");
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
