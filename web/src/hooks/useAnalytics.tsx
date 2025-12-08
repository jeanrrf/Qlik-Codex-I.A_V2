/**
 * useAnalytics Hook
 * Sistema automático de tracking de eventos e page views
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsConfig {
  apiUrl?: string;
  enablePageTracking?: boolean;
  enableEventTracking?: boolean;
  debug?: boolean;
}

interface TrackEventOptions {
  eventType: string;
  eventCategory: string;
  eventLabel?: string;
  eventValue?: number;
  metadata?: Record<string, unknown>;
}

const envEnable = (import.meta.env.VITE_ENABLE_ANALYTICS || '').toString().toLowerCase() === 'true';
const DEFAULT_CONFIG: AnalyticsConfig = {
  apiUrl: '/api/analytics',
  // Disabled by default — set VITE_ENABLE_ANALYTICS=true to re-enable
  enablePageTracking: envEnable,
  enableEventTracking: envEnable,
  debug: (import.meta.env.VITE_ENABLE_ANALYTICS_DEBUG || '').toString().toLowerCase() === 'true'
};

// Session ID persistente no sessionStorage
const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export function useAnalytics(config: AnalyticsConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { user, isOwner } = useAuth();
  const sessionId = useRef(getOrCreateSessionId());
  const lastPageRef = useRef<string>('');

  const getLocationSnapshot = () => {
    const { pathname, search, hash } = window.location;
    return {
      pathname: pathname || '/',
      search: search || '',
      hash: hash || ''
    };
  };

  /**
   * Envia evento para o backend
   */
  const sendToBackend = useCallback(
    async (endpoint: string, data: unknown) => {
      try {
        await fetch(`${mergedConfig.apiUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });

        if (mergedConfig.debug) {
          console.warn('[Analytics]', endpoint, data);
        }
      } catch (error) {
        if (mergedConfig.debug) {
          console.error('[Analytics] Error:', error);
        }
      }
    },
    [mergedConfig.apiUrl, mergedConfig.debug]
  );

  /**
   * Rastreia visualização de página
   */
  const trackPageView = useCallback(
    (page?: string) => {
      if (!mergedConfig.enablePageTracking) return;

      const loc = getLocationSnapshot();
      const currentPage = page || loc.pathname;
      const referrer = lastPageRef.current || document.referrer;

      if (currentPage === lastPageRef.current) return; // skip duplicate sequential pageviews

      sendToBackend('/pageview', {
        userId: user?.id,
        sessionId: sessionId.current,
        page: currentPage,
        referrer,
        isOwner: isOwner(),
        metadata: {
          search: loc.search,
          hash: loc.hash
        }
      });

      lastPageRef.current = currentPage;
    },
    [user, isOwner, sendToBackend, mergedConfig.enablePageTracking]
  );

  /**
   * Rastreia evento customizado
   */
  const trackEvent = useCallback(
    (options: TrackEventOptions) => {
      if (!mergedConfig.enableEventTracking) return;

      sendToBackend('/event', {
        userId: user?.id,
        sessionId: sessionId.current,
        eventType: options.eventType,
        eventCategory: options.eventCategory,
        eventLabel: options.eventLabel,
        eventValue: options.eventValue,
        isOwner: isOwner(),
        metadata: options.metadata
      });
    },
    [user, isOwner, sendToBackend, mergedConfig.enableEventTracking]
  );

  /**
   * Inicializa sessão no backend
   */
  const startSession = useCallback(() => {
    const loc = getLocationSnapshot();
    sendToBackend('/session/start', {
      userId: user?.id,
      sessionId: sessionId.current,
      isOwner: isOwner(),
      landingPage: loc.pathname
    });
  }, [user, isOwner, sendToBackend]);

  /**
   * Tracking automático de page view na mudança de rota
   */
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  // Track browser navigation changes (back/forward/hash)
  useEffect(() => {
    const handleNavChange = () => trackPageView();
    window.addEventListener('popstate', handleNavChange);
    window.addEventListener('hashchange', handleNavChange);
    return () => {
      window.removeEventListener('popstate', handleNavChange);
      window.removeEventListener('hashchange', handleNavChange);
    };
  }, [trackPageView]);

  /**
   * Inicializa sessão no mount
   */
  useEffect(() => {
    startSession();
  }, [startSession]);

  /**
   * Atalhos para eventos comuns
   */
  const trackClick = useCallback(
    (label: string, value?: number, metadata?: Record<string, unknown>) => {
      trackEvent({
        eventType: 'click',
        eventCategory: 'user_interaction',
        eventLabel: label,
        eventValue: value,
        metadata
      });
    },
    [trackEvent]
  );

  const trackFormSubmit = useCallback(
    (formName: string, success: boolean, metadata?: Record<string, unknown>) => {
      trackEvent({
        eventType: 'form_submit',
        eventCategory: 'conversion',
        eventLabel: formName,
        eventValue: success ? 1 : 0,
        metadata
      });
    },
    [trackEvent]
  );

  const trackError = useCallback(
    (errorMessage: string, metadata?: Record<string, unknown>) => {
      trackEvent({
        eventType: 'error',
        eventCategory: 'system',
        eventLabel: errorMessage,
        metadata
      });
    },
    [trackEvent]
  );

  const trackOptimization = useCallback(
    (mode: string, success: boolean, metadata?: Record<string, unknown>) => {
      trackEvent({
        eventType: 'optimization',
        eventCategory: 'ai_execution',
        eventLabel: mode,
        eventValue: success ? 1 : 0,
        metadata
      });
    },
    [trackEvent]
  );

  const trackFeatureUse = useCallback(
    (featureName: string, metadata?: Record<string, unknown>) => {
      trackEvent({
        eventType: 'feature_use',
        eventCategory: 'engagement',
        eventLabel: featureName,
        metadata
      });
    },
    [trackEvent]
  );

  return {
    trackPageView,
    trackEvent,
    trackClick,
    trackFormSubmit,
    trackError,
    trackOptimization,
    trackFeatureUse,
    sessionId: sessionId.current
  };
}

/**
 * HOC para componentes que precisam de analytics
 */
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  eventType: string
) {
  return function WithAnalyticsComponent(props: P) {
    const { trackFeatureUse } = useAnalytics();

    useEffect(() => {
      trackFeatureUse(eventType);
    }, [trackFeatureUse]);

    return <Component {...props} />;
  };
}
