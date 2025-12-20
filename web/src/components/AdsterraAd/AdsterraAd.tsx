/**
 * Componente de Anúncio Adsterra
 * Exibe apenas para usuários não autenticados após otimização bem-sucedida
 */

import React, { useEffect, useRef, useState } from 'react';
import './AdsterraAd.css';

interface AdsterraAdProps {
  /** Formato do anúncio */
  format?: 'banner' | 'native';
  /** Título opcional acima do anúncio */
  title?: string;
  adKey?: string;
  lazyLoad?: boolean;
  lazyLoadMargin?: string;
}

export const AdsterraAd: React.FC<AdsterraAdProps> = ({
  format = 'banner',
  adKey = '1c2eff3d048b99101a6e6be6f41b5fb0',
  lazyLoad = true,
  lazyLoadMargin = '200px 0px',
  title = '🎯 Apoie o Qlik Codex I.A'
}) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isClosed || shouldLoad) return;

    const container = adContainerRef.current;
    if (!container) return;

    if (!lazyLoad || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
          observerRef.current = null;
        }
      },
      {
        root: null,
        rootMargin: lazyLoadMargin,
        threshold: 0.01
      }
    );

    observer.observe(container);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [isClosed, lazyLoad, lazyLoadMargin, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || isClosed) return;
    // Evitar carregar múltiplas vezes
    if (scriptLoadedRef.current) return;
    if (!adContainerRef.current) return;

    scriptLoadedRef.current = true;
    setIsLoading(true);

    // Configuração do anúncio Adsterra
    // Formato Banner 300x250
    const atOptions = {
      'key': adKey,
      'format': 'iframe',
      'height': 250,
      'width': 300,
      'params': {}
    };

    // Definir atOptions globalmente ANTES de carregar o script
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).atOptions = atOptions;

    // Criar elemento de invocação
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `https://www.highperformanceformat.com/${atOptions.key}/invoke.js`;
    invokeScript.async = false;
    invokeScript.setAttribute('data-cfasync', 'false');

    // Listeners de carregamento
    invokeScript.onload = () => {
      setIsLoading(false);
    };

    invokeScript.onerror = () => {
      setIsLoading(false);
      console.warn('Adsterra: Falha ao carregar anúncio');
    };

    // Timeout de segurança (5 segundos)
    const loadTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    // Adicionar script ao container
    const container = adContainerRef.current;
    container.innerHTML = '';
    container.appendChild(invokeScript);

    // Cleanup quando componente for desmontado
    return () => {
      clearTimeout(loadTimeout);
      if (container) {
        // Limpar conteúdo do container
        container.innerHTML = '';
      }
      scriptLoadedRef.current = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).atOptions;
    };
  }, [adKey, isClosed, shouldLoad]);

  // Se o usuário fechou o anúncio, não renderizar
  if (isClosed) return null;

  return (
    <div className="adsterra-ad-wrapper">
      {/* Botão de Fechar */}
      <button
        className="adsterra-ad-close"
        onClick={() => setIsClosed(true)}
        aria-label="Fechar anúncio"
        title="Fechar anúncio"
      >
        ✕
      </button>

      {title && (
        <div className="adsterra-ad-header">
          <p className="adsterra-ad-title">{title}</p>
          <p className="adsterra-ad-subtitle">
            Faça login para remover anúncios permanentemente
          </p>
        </div>
      )}

      <div
        ref={adContainerRef}
        className={`adsterra-ad-container adsterra-ad-${format} ${isLoading ? 'loading' : 'loaded'}`}
        aria-label="Anúncio"
        aria-busy={isLoading}
      />

      <div className="adsterra-ad-disclaimer">
        <small>💚 O Qlik Codex é gratuito graças aos patrocinadores</small>
      </div>
    </div>
  );
};

export default AdsterraAd;
