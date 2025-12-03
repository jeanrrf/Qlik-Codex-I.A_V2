import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Erro ao renderizar diagrama. Verifique a sintaxe.');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-error" style={{ color: '#ff6b6b', padding: '1rem', border: '1px solid #ff6b6b', borderRadius: '8px' }}>
        {error}
        <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>{chart}</pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram"
      ref={elementRef}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '8px',
        overflowX: 'auto'
      }}
    />
  );
};
