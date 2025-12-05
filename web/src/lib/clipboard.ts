/**
 * Utilitário para copiar texto para a área de transferência
 * com suporte a fallback e normalização de quebras de linha.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Normalizar quebras de linha para garantir compatibilidade (Windows prefere \r\n)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

  try {
    // Tentar API moderna primeiro
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(normalizedText);
      return true;
    }
    throw new Error('Clipboard API unavailable');
  } catch (err) {
    // Fallback para método antigo (textarea hack)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = normalizedText;

      // Garantir que o elemento não seja visível mas faça parte do DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      return successful;
    } catch (fallbackErr) {
      console.error('Falha ao copiar texto:', fallbackErr);
      return false;
    }
  }
}
