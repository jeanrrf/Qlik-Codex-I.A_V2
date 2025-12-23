/**
 * Clipboard Utility
 * Unified copy-to-clipboard functionality with fallback for older browsers
 */

/**
 * Copy text to clipboard with automatic fallback
 * @param text - Text to copy
 * @returns Promise that resolves when copy succeeds
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Modern Clipboard API (preferred)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers or insecure contexts (HTTP)
  fallbackCopy(text);
}

/**
 * Fallback copy method using textarea selection
 * @param text - Text to copy
 */
function fallbackCopy(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Copy text with visual feedback
 * @param text - Text to copy
 * @param onSuccess - Callback when copy succeeds
 * @param onError - Callback when copy fails
 */
export async function copyWithFeedback(
  text: string,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
): Promise<void> {
  try {
    await copyToClipboard(text);
    onSuccess?.("Copiado para a área de transferência!");
  } catch (error) {
    console.error("Copy failed:", error);
    onError?.("Não foi possível copiar. Use Ctrl+C ou toque e segure.");
  }
}
