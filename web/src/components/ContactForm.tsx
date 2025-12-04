import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { sendContact } from "../api/contactClient";
import { USE_CONVEX } from "../lib/config";
import type { ContactRequest, ContactResponse } from "../types/contact";

const initialForm: ContactRequest = {
  name: "",
  email: "",
  company: "",
  message: ""
};

const ContactForm: React.FC = () => {
  const [form, setForm] = useState<ContactRequest>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ContactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convex mutation para contato
  const convexSendContact = useMutation(api.contact.sendContact);

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: ContactRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        message: form.message?.trim() || undefined
      };

      if (USE_CONVEX) {
        // Usar Convex
        const resp = await convexSendContact({
          name: payload.name,
          email: payload.email,
          subject: payload.company || "Contato via Qlik Codex",
          message: payload.message || "Solicitação de demo"
        });
        setSuccess({
          success: true,
          message: resp.message,
          id: resp.contactId as unknown as string
        });
      } else {
        // Usar Express
        const resp = await sendContact(payload);
        setSuccess(resp);
      }
      setForm(initialForm);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Falha inesperada ao enviar contato.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Contato</p>
          <h3 className="panel-title">Solicitar demonstração</h3>
          <p className="panel-subtitle">
            Envie seus dados para receber uma demo personalizada do QLIK CODEX I.A
            I.A com AINEX.
          </p>
        </div>
      </div>

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Nome completo</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email profissional</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="company">Empresa</label>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            required
            value={form.company}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="message">Mensagem (opcional)</label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={form.message}
            onChange={handleChange}
            placeholder="Conte rapidamente seu contexto de Qlik ou o tipo de ambiente que deseja otimizar."
          />
        </div>

        <button
          type="submit"
          className="primary-btn"
          disabled={submitting}
        >
          {submitting ? "Enviando..." : "Enviar solicitacao"}
        </button>

        {error && <div className="alert error">{error}</div>}
        {success && (
          <div className="alert">
            Recebemos sua solicitacao. ID de referencia:{" "}
            <strong>{success.id}</strong>.
          </div>
        )}
      </form>
    </div>
  );
};

export default ContactForm;

