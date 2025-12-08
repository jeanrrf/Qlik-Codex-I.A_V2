/**
 * Essential Metrics Hook - Tracking minimalista
 * Registra apenas: 1 visita por sessão (sem pageviews repetidos)
 */

import { useEffect, useRef } from 'react';

// Session ID persistente
const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem('metrics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('metrics_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Hook que registra 1 visita única por sessão (sem tracking de páginas individuais)
 */
export function useEssentialMetrics() {
  const tracked = useRef(false);
  const sessionId = useRef(getOrCreateSessionId());

  useEffect(() => {
    // Registra apenas 1x por sessão
    if (!tracked.current) {
      tracked.current = true;

      // Envia visita ao backend (silencioso, não bloqueia UI)
      fetch('/api/metrics/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: sessionId.current })
      }).catch(() => {
        // Ignora erros silenciosamente
      });
    }
  }, []);

  return { sessionId: sessionId.current };
}
