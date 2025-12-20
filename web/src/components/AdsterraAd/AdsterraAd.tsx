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
}

export const AdsterraAd: React.FC<AdsterraAdProps> = ({
  format = 'banner',
  title = '🎯 Apoie o Qlik Codex I.A'
}) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Evitar carregar múltiplas vezes
    if (scriptLoadedRef.current) return;
    if (!adContainerRef.current) return;

    scriptLoadedRef.current = true;

    // Configuração do anúncio Adsterra
    // Formato Banner 300x250
    const atOptions = {
      'key': '1c2eff3d048b99101a6e6be6f41b5fb0',
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
    invokeScript.async = true;
    invokeScript.defer = true;
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
  }, []);

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
        className={`adsterra-ad-container adsterra-ad-${format}`}
        aria-label="Anúncio"
      />

      <div className="adsterra-ad-disclaimer">
        <small>💚 O Qlik Codex é gratuito graças aos patrocinadores</small>
      </div>
    </div>
  );
};

export default AdsterraAd;
