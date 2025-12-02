import type { ContactRequest, ContactResponse } from "../types/contact";

export async function sendContact(
  payload: ContactRequest
): Promise<ContactResponse> {
  const resp = await fetch("/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    let message = "Falha ao enviar contato.";
    try {
      const data = await resp.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = (await resp.json()) as ContactResponse;
  return data;
}

