/**
 * Exemplos de Integração do Analytics
 * Como adicionar tracking em componentes existentes
 */

// ============================================================
// EXEMPLO 1: Tracking em Página Simples
// ============================================================

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

function MyPage() {
  const { trackPageView, trackFeatureUse } = useAnalytics();

  useEffect(() => {
    // Tracking automático já funciona via App.tsx
    // Mas você pode adicionar metadata customizada:
    trackPageView('/my-custom-page');

    // Ou rastrear uso de feature
    trackFeatureUse('advanced_feature', {
      section: 'tools',
      complexity: 'high'
    });
  }, []);

  return <div>My Page Content</div>;
}

// ============================================================
// EXEMPLO 2: Tracking de Cliques em Botões
// ============================================================

function MyButton() {
  const { trackClick } = useAnalytics();

  const handleClick = () => {
    // Rastrear o clique
    trackClick('export_button', 1, {
      format: 'pdf',
      source: 'dashboard'
    });

    // Sua lógica do botão
    exportData();
  };

  return <button onClick={handleClick}>Exportar PDF</button>;
}

// ============================================================
// EXEMPLO 3: Tracking de Formulários
// ============================================================

function ContactForm() {
  const { trackFormSubmit, trackError } = useAnalytics();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await submitForm(formData);

      // Sucesso
      trackFormSubmit('contact_form', true, {
        fields: Object.keys(formData).length,
        time_to_fill: calculateTime()
      });
    } catch (error) {
      // Erro
      trackFormSubmit('contact_form', false, {
        error: error.message
      });

      trackError(`Form submission failed: ${error.message}`, {
        form: 'contact_form'
      });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// ============================================================
// EXEMPLO 4: Tracking de Otimizações IA
// ============================================================

function OptimizeButton() {
  const { trackOptimization, trackError } = useAnalytics();

  const handleOptimize = async () => {
    const startTime = Date.now();

    try {
      const result = await optimizeScript({
        mode: 'ultra-expert',
        script: myScript
      });

      // Sucesso
      trackOptimization('ultra-expert', true, {
        duration_ms: Date.now() - startTime,
        original_lines: result.originalLines,
        optimized_lines: result.optimizedLines,
        provider: result.provider
      });
    } catch (error) {
      // Erro
      trackOptimization('ultra-expert', false, {
        error: error.message,
        duration_ms: Date.now() - startTime
      });

      trackError(`Optimization failed: ${error.message}`, {
        mode: 'ultra-expert'
      });
    }
  };

  return <button onClick={handleOptimize}>Otimizar</button>;
}

// ============================================================
// EXEMPLO 5: Tracking com HOC (High Order Component)
// ============================================================

import { withAnalytics } from '@/hooks/useAnalytics';

// Componente que será rastreado automaticamente
function AdvancedEditor() {
  return <div>Editor Content</div>;
}

// Export com tracking automático
// Toda vez que o componente montar, trackFeatureUse será chamado
export default withAnalytics(AdvancedEditor, 'advanced_editor');

// ============================================================
// EXEMPLO 6: Tracking de Navegação
// ============================================================

function NavigationMenu() {
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();

  const handleNavigate = (route: string) => {
    // Rastrear navegação
    trackEvent({
      eventType: 'navigation',
      eventCategory: 'menu',
      eventLabel: route,
      metadata: {
        from: window.location.pathname
      }
    });

    navigate(route);
  };

  return (
    <nav>
      <button onClick={() => handleNavigate('/dashboard')}>Dashboard</button>
      <button onClick={() => handleNavigate('/settings')}>Settings</button>
    </nav>
  );
}

// ============================================================
// EXEMPLO 7: Tracking de Erros Globais
// ============================================================

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

function ErrorBoundaryWrapper() {
  const { trackError } = useAnalytics();

  useEffect(() => {
    // Capturar erros não tratados
    const handleError = (event: ErrorEvent) => {
      trackError(event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    // Capturar promises rejeitadas
    const handleRejection = (event: PromiseRejectionEvent) => {
      trackError(`Unhandled Promise Rejection: ${event.reason}`, {
        type: 'promise_rejection'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [trackError]);

  return <>{/* Your App */}</>;
}

// ============================================================
// EXEMPLO 8: Tracking de Performance
// ============================================================

function PerformanceTracker() {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Rastrear tempo de carregamento
    if (window.performance) {
      const perfData = window.performance.timing;
      const loadTime = perfData.loadEventEnd - perfData.navigationStart;

      trackEvent({
        eventType: 'performance',
        eventCategory: 'timing',
        eventLabel: 'page_load',
        eventValue: loadTime,
        metadata: {
          dns_time: perfData.domainLookupEnd - perfData.domainLookupStart,
          connect_time: perfData.connectEnd - perfData.connectStart,
          render_time: perfData.loadEventEnd - perfData.responseEnd
        }
      });
    }
  }, []);

  return null;
}

// ============================================================
// EXEMPLO 9: Tracking de Downloads
// ============================================================

function DownloadButton({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const { trackEvent } = useAnalytics();

  const handleDownload = () => {
    // Rastrear download
    trackEvent({
      eventType: 'download',
      eventCategory: 'content',
      eventLabel: fileName,
      metadata: {
        url: fileUrl,
        timestamp: new Date().toISOString()
      }
    });

    // Iniciar download
    window.open(fileUrl, '_blank');
  };

  return <button onClick={handleDownload}>Download {fileName}</button>;
}

// ============================================================
// EXEMPLO 10: Tracking de Scroll
// ============================================================

function ScrollTracker() {
  const { trackEvent } = useAnalytics();
  const [tracked, setTracked] = useState({
    '25%': false,
    '50%': false,
    '75%': false,
    '100%': false
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      // Rastrear marcos de scroll
      if (scrollPercent >= 25 && !tracked['25%']) {
        trackEvent({
          eventType: 'scroll',
          eventCategory: 'engagement',
          eventLabel: '25%',
          eventValue: 25
        });
        setTracked(prev => ({ ...prev, '25%': true }));
      }

      if (scrollPercent >= 50 && !tracked['50%']) {
        trackEvent({
          eventType: 'scroll',
          eventCategory: 'engagement',
          eventLabel: '50%',
          eventValue: 50
        });
        setTracked(prev => ({ ...prev, '50%': true }));
      }

      // ... 75% e 100%
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tracked, trackEvent]);

  return null;
}

// ============================================================
// EXEMPLO 11: Tracking de Pesquisas
// ============================================================

function SearchBar() {
  const { trackEvent } = useAnalytics();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Rastrear pesquisa
    trackEvent({
      eventType: 'search',
      eventCategory: 'engagement',
      eventLabel: query,
      metadata: {
        query_length: query.length,
        timestamp: new Date().toISOString()
      }
    });

    // Executar pesquisa
    performSearch(query);
  };

  return (
    <form onSubmit={handleSearch}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquisar..."
      />
      <button type="submit">Buscar</button>
    </form>
  );
}

// ============================================================
// EXEMPLO 12: Tracking de Vídeos
// ============================================================

function VideoPlayer({ videoId }: { videoId: string }) {
  const { trackEvent } = useAnalytics();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      trackEvent({
        eventType: 'video_play',
        eventCategory: 'media',
        eventLabel: videoId
      });
    };

    const handlePause = () => {
      trackEvent({
        eventType: 'video_pause',
        eventCategory: 'media',
        eventLabel: videoId,
        eventValue: Math.floor(video.currentTime)
      });
    };

    const handleEnded = () => {
      trackEvent({
        eventType: 'video_complete',
        eventCategory: 'media',
        eventLabel: videoId,
        eventValue: Math.floor(video.duration)
      });
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoId, trackEvent]);

  return <video ref={videoRef} src={`/videos/${videoId}`} controls />;
}

// ============================================================
// MELHORES PRÁTICAS
// ============================================================

/**
 * 1. USE METADATA para contexto adicional
 * 2. EVITE tracking excessivo (pode gerar muito tráfego)
 * 3. USE eventValue para métricas numéricas (tempo, tamanho, etc.)
 * 4. CATEGORIZE eventos de forma consistente
 * 5. TESTE em dev antes de produção (ative debug: true)
 * 6. DOCUMENTE eventos customizados para time
 * 7. RESPEITE privacidade: não rastreie dados sensíveis
 */
