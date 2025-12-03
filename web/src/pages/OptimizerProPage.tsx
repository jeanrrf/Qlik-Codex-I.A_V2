import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOptimizationProgress } from '../hooks/useOptimizationProgress';
import { UserMenu } from '../components/UserMenu';
import ConsultancyDocumentViewer from '../components/ConsultancyDocumentViewer';
import { OptimizeMode } from '../types/api';
import '../styles.css'; // Mantemos os estilos base por enquanto

// Icons
const Icons = {
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Play: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Zap: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Search: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Upload: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
};

// Novos componentes visuais para a versão PRO
const PersonaCard = ({
  title,
  description,
  icon,
  color,
  features,
  selected,
  onClick
}: any) => (
  <div
    onClick={onClick}
    className={`persona-card ${selected ? 'selected' : ''}`}
    style={{
      border: `1px solid ${selected ? color : 'rgba(255,255,255,0.1)'}`,
      background: selected ? `linear-gradient(145deg, ${color}10, rgba(10,10,10,0.8))` : 'rgba(20,20,25,0.6)',
      padding: '2rem',
      borderRadius: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
      minWidth: '300px'
    }}
  >
    {selected && <div className="glow-effect" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color, boxShadow: `0 0 20px ${color}` }} />}

    <div className="persona-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
      <div style={{
        width: '50px', height: '50px', borderRadius: '12px',
        background: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{title}</h3>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>AINEX AGENT</span>
      </div>
    </div>

    <p style={{ color: '#ccc', lineHeight: '1.6', marginBottom: '1.5rem', minHeight: '60px' }}>
      {description}
    </p>

    <div className="persona-features">
      {features.map((feat: string, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
          <span style={{ color: color }}>✓</span> {feat}
        </div>
      ))}
    </div>
  </div>
);

export function OptimizerProPage() {
  const { user, signOut } = useAuth();
  const [script, setScript] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook de otimização (reutilizando a lógica robusta do V2)
  const optimization = useOptimizationProgress();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setScript(text);

    // Start optimization using Ultra Expert mode
    optimization.startOptimization({
      script: text,
      mode: 'ultra-expert',
      llmProvider: 'google',
      llmModel: 'gemini-2.5-flash'
    });
  };

  // Se tiver resultado, mostrar o visualizador de documento
  if (optimization.result && optimization.consultancyDoc) {
    return (
      <div className="app-container" style={{ background: '#050508', height: '100vh', overflow: 'hidden' }}>
        <ConsultancyDocumentViewer
          document={optimization.consultancyDoc}
          onClose={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="app-container" style={{ background: '#050508', minHeight: '100vh' }}>
      {/* Header PRO */}
      <header className="app-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1rem 2rem' }}>
        <div className="header-left">
          <div className="logo-container">
            <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #00f2ff 0%, #0066ff 100%)' }}>
              <Icons.Zap />
            </div>
            <div className="logo-text">
              <span className="brand-name">AINEX</span>
              <span className="brand-suffix" style={{ color: '#00f2ff' }}>PRO EVOLUTION</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <UserMenu user={user} onLogout={signOut} />
        </div>
      </header>

      <main className="pro-main" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

        {/* Progress View */}
        {optimization.isRunning ? (
          <div className="pro-progress-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div className="spinner-large" style={{
              width: '80px', height: '80px', border: '4px solid rgba(255,255,255,0.1)',
              borderTopColor: selectedPersona === 'engineer' ? '#ffb800' : '#00f2ff',
              borderRadius: '50%', margin: '0 auto 2rem', animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              {selectedPersona === 'engineer' ? 'Engenheiro Trabalhando...' : 'Arquiteto Analisando...'}
            </h2>

            <div className="progress-steps" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
              {optimization.progress.stages.filter(s => s.visible !== false).map(stage => (
                <div key={stage.id} style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${stage.status === 'success' ? '#00ff9d' : stage.status === 'running' ? (selectedPersona === 'engineer' ? '#ffb800' : '#00f2ff') : 'transparent'}`,
                  opacity: stage.status === 'pending' ? 0.5 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>{stage.name}</span>
                    <span>{stage.status === 'running' ? 'Em andamento...' : stage.status === 'success' ? 'Concluído' : ''}</span>
                  </div>
                  {stage.subSteps?.map(sub => (
                    <div key={sub.id} style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.5rem', paddingLeft: '1rem' }}>
                      {sub.name} {sub.status === 'running' && '...'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="pro-hero" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>
                Escolha seu Especialista
              </h1>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>
                A inteligência artificial da AINEX atua com diferentes personalidades para resolver seu problema.
              </p>
            </div>

            {/* Persona Selection */}
            <div className="persona-grid" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem' }}>

              <PersonaCard
                title="The Architect"
                description="Foco total em documentação, mapeamento de dados e análise de riscos. Ideal para entender legados e auditar projetos."
                icon={<Icons.Search />}
                color="#00f2ff"
                selected={selectedPersona === 'architect'}
                onClick={() => setSelectedPersona('architect')}
                features={[
                  "Documentação Técnica Completa (Markdown)",
                  "Diagramas de Linhagem (Mermaid.js)",
                  "Dicionário de Dados Automático",
                  "Análise de Riscos & Compliance",
                  "Zero alterações no código (Read-Only)"
                ]}
              />

              <PersonaCard
                title="Lead Engineer"
                description="O pacote completo. Realiza a auditoria do Arquiteto e aplica refatoração profunda para performance e boas práticas."
                icon={<Icons.Zap />}
                color="#ffb800"
                selected={selectedPersona === 'engineer'}
                onClick={() => setSelectedPersona('engineer')}
                features={[
                  "Tudo do modo Architect incluso",
                  "Refatoração de Código (Performance)",
                  "Correção de Anti-Patterns",
                  "Explicação Educacional ('Por que mudei?')",
                  "Código pronto para Produção"
                ]}
              />
            </div>

            {/* Upload Area */}
            <div
              className="upload-section-pro"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '3rem',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".qvs,.txt,.qvw"
              />
              <div style={{ marginBottom: '1rem', color: selectedPersona === 'engineer' ? '#ffb800' : '#00f2ff' }}>
                <Icons.Upload />
              </div>
              <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Carregar Script Qlik (.qvs ou .txt)</h3>
              <p style={{ color: '#666' }}>
                Arraste seu arquivo ou clique para selecionar.
                O agente <strong>{selectedPersona === 'engineer' ? 'Lead Engineer' : 'Architect'}</strong> irá processá-lo.
              </p>
              <button className="btn-primary" style={{
                marginTop: '1.5rem',
                background: selectedPersona === 'engineer' ? '#ffb800' : '#00f2ff',
                color: '#000',
                border: 'none',
                padding: '0.8rem 2rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                Selecionar Arquivo
              </button>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
