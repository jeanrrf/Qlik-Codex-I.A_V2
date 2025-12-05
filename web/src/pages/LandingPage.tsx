import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";

import QlikFormatterTool from "../components/QlikFormatterTool";
import { BrandMark } from "../components/BrandMark";

interface LandingPageProps {
  onStart: () => void;
}

type CopyFeedback = {
  message: string;
  variant: "success" | "error";
};

// Floating Particles Component
const FloatingParticles: React.FC = () => {
  return (
    <div className="particles-container">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}
        />
      ))}
    </div>
  );
};

// Animated Grid Background
const GridBackground: React.FC = () => (
  <div className="grid-bg">
    <div className="grid-lines" />
    <div className="grid-glow" />
  </div>
);

// Icons com animações
const Icons = {
  Radar: () => (
    <div className="icon-wrapper icon-radar">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" className="radar-circle" />
        <circle cx="12" cy="12" r="6" className="radar-circle-inner" />
        <circle cx="12" cy="12" r="2" className="radar-dot" />
        <path d="M12 2v4" className="radar-line" />
        <path d="M12 18v4" className="radar-line" />
        <path d="M2 12h4" className="radar-line" />
        <path d="M18 12h4" className="radar-line" />
      </svg>
      <div className="icon-glow cyan" />
    </div>
  ),
  Scanner: () => (
    <div className="icon-wrapper icon-scanner">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 12h10" className="scanner-line" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <div className="icon-glow pink" />
    </div>
  ),
  Docs: () => (
    <div className="icon-wrapper icon-docs">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M16 13H8" className="doc-line" />
        <path d="M16 17H8" className="doc-line" />
        <path d="M10 9H8" className="doc-line" />
      </svg>
      <div className="icon-glow green" />
    </div>
  ),
  Mentor: () => (
    <div className="icon-wrapper icon-mentor">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      <div className="icon-glow amber" />
    </div>
  ),
  ChevronDown: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Bolt: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Shield: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Code: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Brain: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
    </svg>
  )
};

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [contactOpen, setContactOpen] = useState(false);
  const [formatterOpen, setFormatterOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const copyTimeout = useRef<number | null>(null);

  // Contact Form State
  const [formState, setFormState] = useState({ name: "", email: "", company: "", message: "" });
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setFormError(null);

    try {
      await apiClient.post('/api/contact', formState);
      setIsSent(true);
      setFormState({ name: "", email: "", company: "", message: "" });
    } catch (err) {
      console.error(err);
      setFormError("Erro ao enviar mensagem. Tente novamente ou use o WhatsApp.");
    } finally {
      setIsSending(false);
    }
  };

  const CONTACT_EMAIL = "rosso.jeandasilva@gmail.com";
  const WHATSAPP_NUMBER = "+55 48 991937304";
  const WHATSAPP_URL =
    "https://api.whatsapp.com/send?phone=5548991937304&text=Quero%20conhecer%20o%20Qlik%20Codex%20IA";
  const contactCopyPayload = `Email: ${CONTACT_EMAIL}\nWhatsApp: ${WHATSAPP_NUMBER}`;

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const showCopyFeedback = (message: string, variant: CopyFeedback["variant"]) => {
    if (copyTimeout.current) {
      clearTimeout(copyTimeout.current);
    }
    setCopyFeedback({ message, variant });
    copyTimeout.current = window.setTimeout(() => setCopyFeedback(null), 3200);
  };

  useEffect(() => {
    return () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    };
  }, []);

  const handleCopyContact = async () => {
    try {
      await copyToClipboard(contactCopyPayload);
      showCopyFeedback("Contato copiado para a área de transferência.", "success");
    } catch {
      showCopyFeedback(
        "Não foi possível copiar automaticamente. Use Ctrl+C ou toque e segure.",
        "error"
      );
    }
  };


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const mailtoLink = encodeURI(
    `mailto:${CONTACT_EMAIL}?subject=Qlik%20Codex%20IA%20-%20Contato`
  );

  const handleEmail = () => {
    window.open(mailtoLink, "_self");
    setContactOpen(false);
  };

  const handleWhatsApp = () => {
    window.open(WHATSAPP_URL, "_blank");
    setContactOpen(false);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const feedbackMessage = copyFeedback ? (
    <p className={`copy-feedback ${copyFeedback.variant}`} aria-live="polite">
      {copyFeedback.message}
    </p>
  ) : null;

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <GridBackground />
      <FloatingParticles />

      {/* Cursor Glow Effect */}
      <div
        className="cursor-glow"
        style={{
          left: mousePos.x - 200,
          top: mousePos.y - 200,
        }}
      />

      {/* NAV */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <BrandMark
            variant="full"
            size="sm"
            showBeta
            className="nav-brand-mark"
            onClick={() => scrollToSection('how-it-works')}
          />
        </div>

        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollToSection('suite')}>
            Recursos
          </button>
          <button className="nav-link" onClick={() => scrollToSection('contact')}>
            Contato
          </button>
        </div>

        <div className="nav-actions">
          <button className="btn btn-nav-cta" onClick={onStart}>
            <Icons.Bolt />
            Começar teste gratuito
          </button>
        </div>
      </nav>

      <main className="landing-content" role="main">
        {/* HERO */}
        <section className="hero-section">
          {/* Hero Orb */}
          <div className="hero-orb">
            <div className="orb-ring orb-ring-1" />
            <div className="orb-ring orb-ring-2" />
            <div className="orb-ring orb-ring-3" />
            <div className="orb-core" />
          </div>

          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="eyebrow-icon">◆</span>
              <span>IA treinada para Qlik Sense & Qlik Cloud</span>
              <span className="eyebrow-icon">◆</span>
            </div>

            <h1 className="hero-title">
              <span className="title-line">Otimize scripts Qlik</span>
              <span className="title-line title-highlight">
                <span className="highlight-text">com IA em segundos</span>
                <span className="highlight-glow" />
              </span>
            </h1>

            {/* Badge AINEX - Compacto */}
            <div className="hero-ainex-compact">
              <span className="ainex-tag">AINEX ENGINE</span>
              <span className="ainex-separator">|</span>
              <span className="ainex-desc">Orquestração multi-IA especializada em scripts Qlik</span>
            </div>

            <p className="hero-description">
              Analise, refatore e documente scripts de Qlik Sense e Qlik Cloud com IA especializada, sem risco em produção.
            </p>

            <div className="hero-features">
              <div className="hero-feature">
                <Icons.Bolt />
                <span>IA treinada exclusivamente para Qlik</span>
              </div>
              <div className="hero-feature">
                <Icons.Brain />
                <span>Análises em segundos, não em horas</span>
              </div>
              <div className="hero-feature">
                <Icons.Code />
                <span>Sugestões compatíveis com o Qlik Engine</span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="btn btn-hero-primary" onClick={onStart}>
                <span className="btn-glow" />
                <span className="btn-content">
                  Começar teste gratuito
                  <span className="btn-badge">4 análises/dia</span>
                </span>
              </button>
              <button
                className="btn btn-hero-secondary"
                onClick={() => scrollToSection('how-it-works')}
              >
                Ver como funciona
                <Icons.ChevronDown />
              </button>
            </div>
          </div>

        </section>

        <div className="scroll-indicator" onClick={() => scrollToSection('suite')}>
          <Icons.ChevronDown />
        </div>

        {/* COMO FUNCIONA */}
        <section id="how-it-works" className="how-it-works-section">
          <div className="section-header">
            <span className="section-badge">COMO FUNCIONA</span>
            <h2 className="section-title">Como funciona o Qlik Codex I.A</h2>
            <p className="section-description">
              Veja, em 3 passos, como tirar valor do teste gratuito.
            </p>
          </div>

          <div className="how-it-works-grid">
            <div className="how-step">
              <h3 className="how-step-title">1. Cole seu script Qlik</h3>
              <p className="how-step-text">
                Cole o trecho mais crítico do seu script (carga, transformações, joins, etc.).
              </p>
            </div>
            <div className="how-step">
              <h3 className="how-step-title">2. A AINEX analisa e sugere melhorias</h3>
              <p className="how-step-text">
                O motor AINEX valida sintaxe, identifica riscos e propõe refatorações explicadas passo a passo.
              </p>
            </div>
            <div className="how-step">
              <h3 className="how-step-title">3. Aplique com segurança no seu ambiente</h3>
              <p className="how-step-text">
                Você recebe sugestões compatíveis com Qlik Sense e Qlik Cloud, prontas para revisão e implementação pelo seu time.
              </p>
            </div>
          </div>
        </section>

        {/* SUITE / FEATURES */}
        <section id="suite" className="suite-section">
          <div className="section-header">
            <span className="section-badge">SUITE COMPLETA</span>
            <h2 className="section-title">
              Suite de IA para<br />
              <span className="title-accent">times que vivem Qlik.</span>
            </h2>
            <p className="section-description">
              Durante o teste gratuito você já experimenta as mesmas ferramentas usadas nas contas Enterprise para auditar, otimizar e documentar Qlik Sense e Qlik Cloud.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card feature-card-radar">
              <div className="card-glow" />
              <div className="card-border" />
              <div className="card-content">
                <Icons.Radar />
                <h3 className="card-title">Radar de Performance</h3>
                <p className="card-description">
                  Encontre gargalos de recarga, joins explosivos e uso ineficiente de QVDs e memória antes que virem incidente em produção.
                </p>
                <div className="card-tags">
                  <span className="tag tag-cyan">Otimização</span>
                  <span className="tag tag-cyan">Speed</span>
                </div>
              </div>
            </div>

            <div className="feature-card feature-card-scanner">
              <div className="card-glow" />
              <div className="card-border" />
              <div className="card-content">
                <Icons.Scanner />
                <h3 className="card-title">Scanner de Risco</h3>
                <p className="card-description">
                  Detecte loops perigosos, chaves sintéticas e padrões que podem quebrar seus apps.
                </p>
                <div className="card-tags">
                  <span className="tag tag-pink">Segurança</span>
                  <span className="tag tag-pink">Audit</span>
                </div>
              </div>
            </div>

            <div className="feature-card feature-card-docs">
              <div className="card-glow" />
              <div className="card-border" />
              <div className="card-content">
                <Icons.Docs />
                <h3 className="card-title">Documentação Automática</h3>
                <p className="card-description">
                  Gere documentação técnica clara do script que você usou no teste.
                </p>
                <div className="card-tags">
                  <span className="tag tag-green">Docs</span>
                  <span className="tag tag-green">Governança</span>
                </div>
              </div>
            </div>

            <div className="feature-card feature-card-mentor">
              <div className="card-glow" />
              <div className="card-border" />
              <div className="card-content">
                <Icons.Mentor />
                <h3 className="card-title">Explicações Guiadas</h3>
                <p className="card-description">
                  Entenda o porquê de cada recomendação durante o teste, não só o “como”.
                </p>
                <div className="card-tags">
                  <span className="tag tag-amber">Ensino</span>
                  <span className="tag tag-amber">Upskilling</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DIFERENCIAL / COMPARATIVO */}
        <section className="why-ainex-section">
          <div className="section-header">
            <span className="section-badge">DIFERENCIAL AINEX</span>
            <h2 className="section-title">
              Mais que um chat: uma IA feita para Qlik
            </h2>
            <p className="section-description">
              Use o teste gratuito para sentir, na prática, a diferença entre uma IA genérica e uma engine desenhada para Qlik Script.
            </p>
          </div>

          <div className="comparison-grid">
            <div className="comparison-card chatgpt">
              <div className="comparison-header">
                <div className="comparison-icon">🤖</div>
                <h3>LLMs Genéricos</h3>
                <span className="comparison-sub">ChatGPT, Claude, etc.</span>
              </div>
              <ul className="comparison-list">
                <li className="neutral">Bons para responder dúvidas gerais e gerar textos</li>
                <li className="negative">Podem inventar funções que não existem no Qlik</li>
                <li className="negative">Não consideram performance de recarga, RAM ou QVDs</li>
              </ul>
            </div>

            <div className="comparison-card ainex">
              <div className="comparison-header">
                <div className="comparison-icon">🧠</div>
                <h3>Qlik Codex I.A</h3>
                <span className="comparison-sub">Engine desenhada para Qlik</span>
              </div>
              <ul className="comparison-list">
                <li className="positive">Treinada em padrões e boas práticas de Qlik</li>
                <li className="positive">Valida sintaxe e estrutura antes de sugerir mudanças</li>
                <li className="positive">Focada em desempenho, segurança e manutenção de scripts</li>
              </ul>
              <span className="featured-badge">AINEX</span>
            </div>
          </div>
        </section>
        <ul className="comparison-list">
          <li className="positive">Treinada em documentação técnica Qlik</li>
          <li className="positive">Valida sintaxe antes de sugerir</li>
          <li className="positive">Otimiza para Qlik Engine (RAM/CPU)</li>
          <li className="positive">Detecta gargalos de modelagem</li>
          <li className="positive">Gera documentação automática</li>
        </ul>

        {/* NVIDIA ACCELERATED SECTION - COMPUTING POWER */}
        <section className="nvidia-section">
          <div className="nvidia-river-effect" />
          <div className="nvidia-particles">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="nvidia-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          <div className="nvidia-content">
            <div className="nvidia-badge-hero">
              <svg className="nvidia-logo-hero" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span>NVIDIA ACCELERATED</span>
            </div>

            <h2 className="nvidia-title">
              Processamento <span className="nvidia-highlight">GPU-Powered</span><br />
              para Scripts Qlik.
            </h2>

            <p className="nvidia-description">
              O modo NVIDIA Fast utiliza inferência acelerada por GPU para entregar
              otimizações em <strong>segundos</strong>. Ideal para refatorações rápidas
              e iterações ágeis.
            </p>

            <div className="nvidia-stats">
              <div className="nvidia-stat">
                <span className="nvidia-stat-value">10x</span>
                <span className="nvidia-stat-label">Mais rápido</span>
              </div>
              <div className="nvidia-stat">
                <span className="nvidia-stat-value">&lt;5s</span>
                <span className="nvidia-stat-label">Tempo médio</span>
              </div>
              <div className="nvidia-stat">
                <span className="nvidia-stat-value">GPU</span>
                <span className="nvidia-stat-label">Inferência</span>
              </div>
            </div>

            <button className="btn btn-nvidia-cta" onClick={onStart}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Experimentar NVIDIA Fast
              <span className="nvidia-cta-badge">NOVO</span>
            </button>
          </div>

          <div className="nvidia-power-bar" />
        </section>

        {/* FREE TIER - TESTE GRATUITO */}
        <section id="free-tier" className="free-tier-section">
          <div className="section-header">
            <span className="section-badge free">ACESSO GRATUITO</span>
            <h2 className="section-title">
              Seu teste gratuito:<br />
              <span className="title-accent">Qlik Codex Community Edition</span>
            </h2>
            <p className="section-description">
              Comece agora, sem cartão de crédito e sem risco. Teste a mesma inteligência usada pelas contas pagas.
            </p>
          </div>

          <div className="free-tier-card">
            <div className="free-tier-glow" />
            <div className="free-tier-content">
              <div className="free-tier-header">
                <h3 className="free-tier-title">🚀 QLIK CODEX COMMUNITY EDITION</h3>
                <span className="free-tier-price">R$ 0<small>/mês</small></span>
              </div>

              <div className="free-tier-features">
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-text">
                    <strong>4 análises gratuitas por dia</strong>
                    <span>Créditos renovados a cada 24 horas para validar vários cenários.</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📝</div>
                  <div className="feature-text">
                    <strong>Até 200 linhas por análise</strong>
                    <span>Blocos de script completos, não só exemplos simples de documentação.</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🧠</div>
                  <div className="feature-text">
                    <strong>Mesmo motor usado pelas contas pagas</strong>
                    <span>Sem versão “light”. O teste já usa o modo Ultra-Expert.</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🛡️</div>
                  <div className="feature-text">
                    <strong>Validação de segurança</strong>
                    <span>Detecção de riscos e anti-patterns antes de chegar à produção.</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-free-start" onClick={onStart}>
                <span className="btn-icon">👉</span>
                Começar teste gratuito agora
              </button>

              <p className="free-tier-note">
                Não requer cartão de crédito. Acesso imediato.
              </p>
            </div>
          </div>
        </section>

        {/* CTA flutuante persistente */}
        <button
          className="floating-cta"
          aria-label="Botão fixo para começar teste gratuito"
          onClick={() => scrollToSection('free-tier')}
        >
          <span className="floating-cta-text">Começar teste gratuito</span>
          <span className="floating-cta-sub">4 análises/dia • sem cartão</span>
        </button>

        {/* QLIK FORMATTER TOOL - BOTÃO COMPACTO */}
        <section className="formatter-cta-section">
          <div className="formatter-cta-card">
            <div className="formatter-cta-glow" />
            <div className="formatter-cta-content">
              <div className="formatter-cta-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="formatter-cta-text">
                <h3 className="formatter-cta-title">Formatador de Script Qlik</h3>
                <p className="formatter-cta-description">
                  Organize e indente seus scripts Qlik automaticamente com IA
                </p>
              </div>
              <button
                className="btn btn-formatter-open"
                onClick={() => setFormatterOpen(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Abrir Ferramenta
              </button>
            </div>
          </div>
        </section>

        {/* Modal do Formatter */}
        < QlikFormatterTool isOpen={formatterOpen} onClose={() => setFormatterOpen(false)} />

        {/* CONTACT / CTA FINAL */}
        <section id="contact" className="contact-section">
          <div className="contact-card">
            <div className="contact-glow" />
            <div className="contact-content">
              <span className="contact-badge">FALE COM O CRIADOR</span>
              <h2 className="contact-title">
                Precisa de uma solução<br />
                <span className="text-gradient-cyan">Enterprise Personalizada?</span>
              </h2>
              <p className="contact-description">
                Vamos conversar sobre como a AINEX pode transformar a produtividade do seu time de dados.
              </p>

              {/* Contact Form */}
              <div className="contact-form-wrapper">
                {!isSent ? (
                  <form className="contact-form" onSubmit={handleContactSubmit}>
                    <div className="form-row">
                      <input
                        type="text"
                        className="contact-input"
                        placeholder="Nome"
                        required
                        value={formState.name}
                        onChange={e => setFormState({ ...formState, name: e.target.value })}
                      />
                      <input
                        type="email"
                        className="contact-input"
                        placeholder="E-mail Corporativo"
                        required
                        value={formState.email}
                        onChange={e => setFormState({ ...formState, email: e.target.value })}
                      />
                    </div>
                    <input
                      type="text"
                      className="contact-input"
                      placeholder="Empresa"
                      required
                      value={formState.company}
                      onChange={e => setFormState({ ...formState, company: e.target.value })}
                    />
                    <textarea
                      className="contact-input contact-textarea"
                      placeholder="Mensagem (opcional)"
                      rows={3}
                      value={formState.message}
                      onChange={e => setFormState({ ...formState, message: e.target.value })}
                    />
                    <button type="submit" className="btn btn-contact-submit" disabled={isSending}>
                      {isSending ? "Enviando..." : "Enviar Mensagem"}
                    </button>
                    {formError && <p className="form-error">{formError}</p>}
                  </form>
                ) : (
                  <div className="contact-success">
                    <div className="success-icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h3>Recebemos sua mensagem!</h3>
                    <p>Entraremos em contato em breve pelo e-mail informado.</p>
                    <button className="btn btn-ghost small" onClick={() => setIsSent(false)}>Nova mensagem</button>
                  </div>
                )}
              </div>

              <div className="contact-divider-text">
                <span>ou use nossos canais diretos</span>
              </div>

              <div className="contact-actions">
                <button className="btn btn-contact-primary" onClick={() => window.location.href = 'mailto:rosso.jeandasilva@gmail.com'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  Enviar E-mail
                </button>
                <button className="btn btn-contact-secondary" onClick={handleWhatsApp}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  WhatsApp
                </button>
                <button className="btn btn-contact-tertiary" onClick={handleCopyContact}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="7" width="12" height="12" rx="2" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />
                  </svg>
                  Copiar contato
                </button>
              </div>
              {!contactOpen && feedbackMessage}

              <div className="contact-decoration">
                <div className="decoration-line" />
                <div className="decoration-dot" />
                <div className="decoration-line" />
              </div>
            </div>
          </div>
        </section>
      </main >

      {/* FOOTER HORIZONTAL */}
      <footer className="landing-footer">
        <div className="footer-content">
          <BrandMark variant="wordmark" size="sm" showBeta className="footer-brand-mark" />
          <span className="footer-separator">•</span>
          <span className="footer-copy">&copy; 2025 SENTINNELL IA</span>
          <span className="footer-separator">•</span>
          <a href="https://github.com/jeanrrf" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitHub
          </a>
          <a href="https://api.whatsapp.com/send?phone=5548991937304" target="_blank" rel="noopener noreferrer" className="footer-link">
            WhatsApp
          </a>
        </div>
      </footer>

      {/* Contact Modal */}
      {
        contactOpen && (
          <div className="modal-overlay" onClick={() => setContactOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Escolha como quer falar</h3>
              <p className="text-secondary">
                Um clique abre seu e-mail ou WhatsApp com mensagem pronta.
              </p>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={handleEmail}>
                  Disparar e-mail
                </button>
                <button className="btn btn-glass" onClick={handleWhatsApp}>
                  Abrir WhatsApp
                </button>
                <button className="btn btn-contact-tertiary" onClick={handleCopyContact}>
                  Copiar contato
                </button>
                <button className="btn btn-ghost" onClick={() => setContactOpen(false)}>
                  Fechar
                </button>
              </div>
              {contactOpen && feedbackMessage}
            </div>
          </div>
        )
      }

      {/* Global Landing Styles */}
      <style>{`
        /* ===================== */
        /* LANDING PAGE STYLES   */
        /* ===================== */
        
        .landing-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background: #030508;
        }

        /* Grid Background */
        .grid-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .grid-lines {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
        }

        .grid-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          height: 600px;
          background: radial-gradient(ellipse at top, rgba(0, 242, 255, 0.08) 0%, transparent 60%);
        }

        /* Cursor Glow */
        .cursor-glow {
          position: fixed;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(0, 242, 255, 0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
          transition: left 0.1s ease-out, top 0.1s ease-out;
        }

        /* Floating CTA */
        .floating-cta {
          position: fixed;
          right: 24px;
          bottom: 24px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(7, 14, 24, 0.92);
          border: 1px solid rgba(0, 242, 255, 0.25);
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(10px);
          color: var(--text-primary);
          cursor: pointer;
          z-index: 18;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .floating-cta:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 255, 157, 0.6);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 255, 157, 0.3);
        }

        .floating-cta-text {
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: -0.01em;
        }

        .floating-cta-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        @media (max-width: 768px) {
          .floating-cta {
            left: 16px;
            right: 16px;
            bottom: 16px;
            justify-content: space-between;
            padding: 12px 14px;
            gap: 8px;
          }

          .floating-cta-text {
            font-size: 0.9rem;
          }

          .floating-cta-sub {
            font-size: 0.8rem;
          }
        }

        /* Particles */
        .particles-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          background: rgba(0, 242, 255, 0.5);
          border-radius: 50%;
          animation: float-particle linear infinite;
        }

        @keyframes float-particle {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }

        /* ===================== */
        /* NAVIGATION            */
        /* ===================== */
        
        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 60px;
          background: rgba(3, 5, 8, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Marca unificada */
        .nav-brand .brand-mark {
          background: rgba(8, 12, 20, 0.92);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .nav-brand .brand-mark:hover {
          border-color: rgba(0, 231, 255, 0.45);
        }

        .nav-brand .brand-wordmark__title {
          letter-spacing: 0.1em;
        }

        .nav-links {
          display: flex;
          gap: 8px;
        }

        .nav-link {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-link:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-actions {
          display: flex;
          gap: 12px;
        }

        .btn-nav-cta {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--primary);
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-nav-cta:hover {
          background: #fff;
          box-shadow: 0 0 30px rgba(0, 242, 255, 0.4);
          transform: translateY(-1px);
        }

        /* ===================== */
        /* HERO SECTION          */
        /* ===================== */
        
        .landing-content {
          position: relative;
          z-index: 2;
        }

        .hero-section {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 40px 80px;
          position: relative;
        }

        .hero-orb {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          pointer-events: none;
        }

        .orb-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(0, 242, 255, 0.1);
        }

        .orb-ring-1 {
          animation: orb-rotate 20s linear infinite;
        }

        .orb-ring-2 {
          inset: 50px;
          animation: orb-rotate 15s linear infinite reverse;
          border-color: rgba(112, 0, 255, 0.1);
        }

        .orb-ring-3 {
          inset: 100px;
          animation: orb-rotate 25s linear infinite;
        }

        .orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(0, 242, 255, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        @keyframes orb-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 900px;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--primary);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 24px;
          padding: 8px 20px;
          background: rgba(0, 242, 255, 0.08);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 999px;
        }

        .eyebrow-icon {
          font-size: 0.6rem;
          opacity: 0.6;
        }

        /* Badge Especialista Qlik */
        .hero-specialist-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 24px auto;
          padding: 16px 24px;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.08) 0%, rgba(0, 255, 157, 0.08) 100%);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 16px;
          max-width: 600px;
          backdrop-filter: blur(10px);
        }

        .hero-specialist-badge .badge-icon {
          font-size: 1.8rem;
          animation: pulse-badge 3s ease-in-out infinite;
        }

        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .hero-specialist-badge .badge-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .hero-specialist-badge .badge-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--primary);
          letter-spacing: -0.01em;
        }

        .hero-specialist-badge .badge-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .hero-title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
        }

        .title-line {
          display: block;
        }

        .title-highlight {
          position: relative;
          display: inline-block;
        }

        .highlight-text {
          position: relative;
          z-index: 1;
          color: var(--primary);
          text-shadow: 0 0 40px rgba(0, 242, 255, 0.5);
        }

        .highlight-glow {
          position: absolute;
          inset: -10px -20px;
          background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.1), transparent);
          border-radius: 8px;
          z-index: 0;
        }

        .hero-description {
          font-size: 1.25rem;
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 32px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-description strong {
          color: var(--text-main);
          font-weight: 500;
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 24px;
          margin-bottom: 48px;
        }

        .hero-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-secondary);
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }

        .hero-feature svg {
          width: 16px;
          height: 16px;
          color: var(--primary);
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
        }

        .btn-hero-primary {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, var(--primary) 0%, #00c8d4 100%);
          color: #000;
          border: none;
          padding: 18px 36px;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s;
        }

        .btn-hero-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 242, 255, 0.4);
        }

        .btn-glow {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: btn-shine 3s infinite;
        }

        @keyframes btn-shine {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }

        .btn-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .btn-hero-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: var(--text-main);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 18px 32px;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-hero-secondary svg {
          width: 20px;
          height: 20px;
        }

        .scroll-indicator {
          position: absolute;
          bottom: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .scroll-indicator:hover {
          opacity: 1;
        }

        .scroll-text {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--text-secondary);
        }

        .scroll-line {
          width: 1px;
          height: 60px;
          background: linear-gradient(to bottom, rgba(0, 242, 255, 0.5), transparent);
          position: relative;
        }

        .scroll-dot {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: var(--primary);
          border-radius: 50%;
          animation: scroll-dot 2s ease-in-out infinite;
        }

        @keyframes scroll-dot {
          0%, 100% { top: 0; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        /* ===================== */
        /* HOW IT WORKS SECTION  */
        /* ===================== */
        
        .how-it-works-section {
          position: relative;
          padding: 120px 60px 80px;
          max-width: 1200px;
          margin: 0 auto;
          overflow: hidden;
        }

        .how-it-works-section::after {
          content: "";
          position: absolute;
          inset: 40px;
          background: radial-gradient(ellipse at top, rgba(0, 242, 255, 0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        .how-it-works-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 56px;
        }

        .how-step {
          position: relative;
          padding: 28px;
          background: rgba(15, 20, 35, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .how-step::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.1), rgba(112, 0, 255, 0.04));
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }

        .how-step:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 242, 255, 0.18);
          box-shadow: 0 16px 60px rgba(0, 0, 0, 0.45);
        }

        .how-step:hover::before {
          opacity: 1;
        }

        .how-step-title {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .how-step-title::before {
          content: "";
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 18px var(--primary-glow);
        }

        .how-step-text {
          color: var(--text-secondary);
          line-height: 1.7;
          font-size: 1rem;
        }

        @media (max-width: 900px) {
          .how-it-works-section {
            padding: 100px 28px 60px;
          }

          .how-it-works-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .how-step {
            padding: 22px;
          }
        }

        /* ===================== */
        /* SUITE SECTION         */
        /* ===================== */
        
        .suite-section {
          padding: 120px 60px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 80px;
        }

        .section-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: var(--primary);
          padding: 6px 16px;
          background: rgba(0, 242, 255, 0.1);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 999px;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .title-accent {
          background: linear-gradient(135deg, var(--primary) 0%, #7000ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .section-description {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.7;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .feature-card {
          position: relative;
          padding: 40px;
          border-radius: 24px;
          background: rgba(15, 20, 35, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
          transition: all 0.4s ease;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .card-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 200px;
          opacity: 0;
          transition: opacity 0.4s;
          pointer-events: none;
        }

        .feature-card:hover .card-glow {
          opacity: 1;
        }

        .feature-card-radar .card-glow {
          background: radial-gradient(ellipse at top, rgba(0, 242, 255, 0.15) 0%, transparent 70%);
        }

        .feature-card-scanner .card-glow {
          background: radial-gradient(ellipse at top, rgba(255, 42, 109, 0.15) 0%, transparent 70%);
        }

        .feature-card-docs .card-glow {
          background: radial-gradient(ellipse at top, rgba(0, 255, 157, 0.15) 0%, transparent 70%);
        }

        .feature-card-mentor .card-glow {
          background: radial-gradient(ellipse at top, rgba(255, 184, 0, 0.15) 0%, transparent 70%);
        }

        .card-border {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .card-content {
          position: relative;
          z-index: 1;
        }

        .icon-wrapper {
          position: relative;
          display: inline-flex;
          margin-bottom: 24px;
        }

        .icon-wrapper svg {
          position: relative;
          z-index: 1;
        }

        .icon-glow {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          filter: blur(20px);
          opacity: 0.4;
        }

        .icon-glow.cyan { background: var(--primary); }
        .icon-glow.pink { background: var(--danger); }
        .icon-glow.green { background: var(--success); }
        .icon-glow.amber { background: var(--warning); }

        .icon-radar svg { color: var(--primary); }
        .icon-scanner svg { color: var(--danger); }
        .icon-docs svg { color: var(--success); }
        .icon-mentor svg { color: var(--warning); }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .feature-card-radar .card-title { color: var(--primary); }
        .feature-card-scanner .card-title { color: var(--danger); }
        .feature-card-docs .card-title { color: var(--success); }
        .feature-card-mentor .card-title { color: var(--warning); }

        .card-description {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 20px;
        }

        .card-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tag-cyan {
          background: rgba(0, 242, 255, 0.1);
          color: var(--primary);
          border: 1px solid rgba(0, 242, 255, 0.2);
        }

        .tag-pink {
          background: rgba(255, 42, 109, 0.1);
          color: var(--danger);
          border: 1px solid rgba(255, 42, 109, 0.2);
        }

        .tag-green {
          background: rgba(0, 255, 157, 0.1);
          color: var(--success);
          border: 1px solid rgba(0, 255, 157, 0.2);
        }

        .tag-amber {
          background: rgba(255, 184, 0, 0.1);
          color: var(--warning);
          border: 1px solid rgba(255, 184, 0, 0.2);
        }

        /* ===================== */
        /* WHY AINEX SECTION     */
        /* ===================== */
        
        .why-ainex-section {
          padding: 100px 60px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
          gap: 32px;
          margin-bottom: 48px;
        }

        .comparison-card {
          position: relative;
          padding: 40px;
          background: rgba(15, 20, 35, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          transition: all 0.3s;
        }

        .comparison-card.featured {
          border-color: var(--primary);
          box-shadow: 0 0 40px rgba(0, 242, 255, 0.15);
        }

        .comparison-card.chatgpt {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .comparison-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          position: relative;
        }

        .comparison-icon {
          font-size: 2.5rem;
        }

        .comparison-header h3 {
          font-size: 1.4rem;
          font-weight: 600;
          margin: 0;
        }

        .featured-badge {
          position: absolute;
          top: -10px;
          right: 0;
          background: var(--primary);
          color: #000;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .comparison-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comparison-list li {
          font-size: 0.95rem;
          line-height: 1.6;
          padding-left: 8px;
        }

        .comparison-list li.positive {
          color: var(--success);
        }

        .comparison-list li.negative {
          color: var(--text-tertiary);
        }

        .comparison-list li.neutral {
          color: var(--text-secondary);
        }

        .why-ainex-highlight {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 32px;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.06) 0%, rgba(0, 255, 157, 0.06) 100%);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .highlight-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .highlight-content {
          flex: 1;
        }

        .highlight-text {
          font-size: 1.05rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0;
        }

        .highlight-text strong {
          color: var(--primary);
          font-weight: 600;
        }

        .highlight-text em {
          color: var(--text-main);
          font-style: italic;
        }

        /* ===================== */
        /* FREE TIER SECTION     */
        /* ===================== */
        
        .free-tier-section {
          padding: 80px 60px;
          max-width: 900px;
          margin: 0 auto;
        }

        .section-badge.free {
          background: linear-gradient(135deg, rgba(0, 255, 157, 0.15), rgba(0, 242, 255, 0.15));
          color: var(--success);
          border: 1px solid rgba(0, 255, 157, 0.3);
        }

        .free-tier-card {
          position: relative;
          padding: 48px;
          background: rgba(15, 20, 35, 0.6);
          border: 1px solid rgba(0, 255, 157, 0.2);
          border-radius: 32px;
          overflow: hidden;
        }

        .free-tier-glow {
          position: absolute;
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(0, 255, 157, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .free-tier-content {
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .free-tier-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, var(--success) 0%, var(--primary) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .free-tier-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 40px;
        }

        .free-tier-features {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
          text-align: left;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(0, 255, 157, 0.2);
        }

        .feature-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .feature-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .feature-text strong {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .feature-text span {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .btn-free-start {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, var(--success) 0%, var(--primary) 100%);
          color: #000;
          border: none;
          padding: 18px 40px;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 16px;
        }

        .btn-free-start:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 255, 157, 0.3);
        }

        .btn-free-start .btn-icon {
          font-size: 1.3rem;
        }

        .free-tier-note {
          font-size: 0.9rem;
          color: var(--text-tertiary);
          margin: 0;
        }

        /* ===================== */
        /* CONTACT SECTION       */
        /* ===================== */
        
        .contact-section {
          padding: 80px 60px 120px;
          max-width: 900px;
          margin: 0 auto;
        }

        .contact-card {
          position: relative;
          padding: 60px;
          background: rgba(15, 20, 35, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          overflow: hidden;
          text-align: center;
        }

        .contact-glow {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(0, 242, 255, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .contact-content {
          position: relative;
          z-index: 1;
        }

        .contact-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }

        .contact-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 16px;
        }

        .text-gradient-cyan {
          background: linear-gradient(135deg, var(--primary) 0%, #00a8ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .contact-description {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto 32px;
          line-height: 1.7;
        }

        .contact-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          margin-bottom: 40px;
        }

        .btn-contact-primary {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--primary);
          color: #000;
          border: none;
          padding: 16px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-contact-primary:hover {
          background: #fff;
          box-shadow: 0 0 30px rgba(0, 242, 255, 0.4);
        }

        .btn-contact-secondary {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          color: var(--text-main);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 16px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-contact-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-contact-tertiary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
          border: 1px dashed rgba(255, 255, 255, 0.4);
          padding: 16px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-contact-tertiary:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(0, 242, 255, 0.4);
        }

        .copy-feedback {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 10px;
          min-height: 1.2rem;
          text-align: center;
        }

        .copy-feedback.success {
          color: var(--success);
        }

        .copy-feedback.error {
          color: var(--danger);
        }

        .contact-decoration {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .decoration-line {
          width: 60px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        }

        .decoration-dot {
          width: 6px;
          height: 6px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--primary);
        }

        /* ===================== */
        /* FOOTER HORIZONTAL     */
        /* ===================== */
        
        .landing-footer {
          border-top: 1px solid rgba(0, 242, 255, 0.15);
          padding: 16px 40px;
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.5), rgba(10, 14, 23, 0.6), rgba(0, 0, 0, 0.5));
          backdrop-filter: blur(16px);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        }

        .footer-content {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 0.75rem;
        }

        .footer-brand {
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--primary);
          letter-spacing: 0.08em;
          text-shadow: 0 0 12px rgba(0, 242, 255, 0.4);
        }

        .footer-brand-box {
          font-weight: 800;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          padding: 6px 12px;
          background: linear-gradient(135deg, 
            rgba(30, 35, 45, 0.95) 0%, 
            rgba(20, 24, 32, 0.98) 100%);
          border: 1px solid rgba(100, 116, 139, 0.4);
          border-radius: 6px;
          color: #e2e8f0;
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .footer-brand-mark .brand-mark {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: none;
          padding: 6px 10px;
        }

        .footer-brand-mark .brand-wordmark__title {
          font-size: 0.85rem;
        }

        .footer-brand-mark .brand-wordmark__beta {
          font-size: 0.55rem;
        }

        .footer-separator {
          color: rgba(255, 255, 255, 0.3);
          font-size: 1.2rem;
          line-height: 1;
        }

        .footer-copy {
          color: var(--text-secondary);
          font-weight: 500;
          margin: 0;
        }

        .footer-powered {
          color: var(--success);
          font-weight: 600;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }

        .footer-links {
          display: flex;
          gap: 12px;
        }

        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.3s;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid transparent;
        }

        .footer-link:hover {
          color: var(--primary);
          border-color: rgba(0, 242, 255, 0.3);
          background: rgba(0, 242, 255, 0.05);
          text-shadow: 0 0 8px rgba(0, 242, 255, 0.5);
          transform: translateY(-1px);
        }

        .footer-link:last-child:hover {
          color: var(--success);
          border-color: rgba(0, 255, 157, 0.3);
          background: rgba(0, 255, 157, 0.05);
          text-shadow: 0 0 8px rgba(0, 255, 157, 0.5);
        }

        /* ===================== */
        /* MODAL                 */
        /* ===================== */

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }

        .modal-content {
          background: rgba(15, 20, 35, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          text-align: center;
        }

        .modal-content h3 {
          font-size: 1.5rem;
          margin-bottom: 12px;
        }

        .modal-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
        }

        /* ===================== */
        /* NVIDIA SECTION        */
        /* ===================== */

        .nvidia-section {
          position: relative;
          padding: 100px 60px;
          background: linear-gradient(180deg, 
            rgba(0, 0, 0, 0) 0%, 
            rgba(57, 255, 20, 0.02) 20%,
            rgba(57, 255, 20, 0.05) 50%, 
            rgba(57, 255, 20, 0.02) 80%,
            rgba(0, 0, 0, 0) 100%
          );
          overflow: hidden;
        }

        .nvidia-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(57, 255, 20, 0.5) 50%, 
            transparent 100%
          );
        }

        .nvidia-section::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(57, 255, 20, 0.3) 50%, 
            transparent 100%
          );
        }

        /* River Effect */
        .nvidia-river-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 300%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(57, 255, 20, 0.02) 10%,
            rgba(57, 255, 20, 0.06) 25%,
            rgba(0, 255, 100, 0.1) 40%,
            rgba(57, 255, 20, 0.15) 50%,
            rgba(0, 255, 100, 0.1) 60%,
            rgba(57, 255, 20, 0.06) 75%,
            rgba(57, 255, 20, 0.02) 90%,
            transparent 100%
          );
          animation: river-flow 4s linear infinite;
          pointer-events: none;
        }

        @keyframes river-flow {
          0% { transform: translateX(0); }
          100% { transform: translateX(33.33%); }
        }

        /* Particles */
        .nvidia-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .nvidia-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #39ff14;
          border-radius: 50%;
          opacity: 0;
          animation: particle-float 3s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(57, 255, 20, 0.8);
        }

        @keyframes particle-float {
          0% { 
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          20% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { 
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        /* Content */
        .nvidia-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          text-align: left;
        }

        /* Badge Hero */
        .nvidia-badge-hero {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, 
            rgba(57, 255, 20, 0.12) 0%, 
            rgba(118, 185, 0, 0.08) 100%
          );
          border: 1px solid rgba(57, 255, 20, 0.35);
          border-radius: 24px;
          padding: 10px 20px;
          margin-bottom: 24px;
          animation: badge-glow 2s ease-in-out infinite;
        }

        @keyframes badge-glow {
          0%, 100% { 
            box-shadow: 0 0 15px rgba(57, 255, 20, 0.2);
            border-color: rgba(57, 255, 20, 0.35);
          }
          50% { 
            box-shadow: 0 0 30px rgba(57, 255, 20, 0.4);
            border-color: rgba(57, 255, 20, 0.6);
          }
        }

        .nvidia-logo-hero {
          width: 24px;
          height: 24px;
          color: #39ff14;
          filter: drop-shadow(0 0 8px rgba(57, 255, 20, 0.6));
        }

        .nvidia-badge-hero span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 800;
          color: #39ff14;
          letter-spacing: 0.1em;
          text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
        }

        /* Title */
        .nvidia-title {
          font-size: 2.8rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 20px;
        }

        .nvidia-highlight {
          background: linear-gradient(135deg, #39ff14 0%, #76b900 50%, #39ff14 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
          position: relative;
        }

        .nvidia-highlight::after {
          content: 'GPU-Powered';
          position: absolute;
          left: 0;
          top: 0;
          background: linear-gradient(135deg, #39ff14 0%, #76b900 50%, #39ff14 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: blur(20px);
          opacity: 0.5;
          z-index: -1;
        }

        /* Description */
        .nvidia-description {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.7;
          max-width: 600px;
          margin-bottom: 36px;
        }

        .nvidia-description strong {
          color: #39ff14;
          font-weight: 700;
        }

        /* Stats */
        .nvidia-stats {
          display: flex;
          gap: 24px;
          margin-bottom: 36px;
        }

        .nvidia-stat {
          padding: 20px 28px;
          background: linear-gradient(135deg, 
            rgba(57, 255, 20, 0.08) 0%, 
            rgba(57, 255, 20, 0.03) 100%
          );
          border: 1px solid rgba(57, 255, 20, 0.2);
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .nvidia-stat:hover {
          background: linear-gradient(135deg, 
            rgba(57, 255, 20, 0.15) 0%, 
            rgba(57, 255, 20, 0.06) 100%
          );
          border-color: rgba(57, 255, 20, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(57, 255, 20, 0.15);
        }

        .nvidia-stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #39ff14;
          line-height: 1;
          text-shadow: 0 0 20px rgba(57, 255, 20, 0.5);
        }

        .nvidia-stat-label {
          display: block;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 8px;
        }

        /* CTA Button */
        .btn-nvidia-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: linear-gradient(135deg, 
            rgba(20, 30, 20, 0.95) 0%, 
            rgba(30, 45, 30, 0.9) 100%
          );
          border: 1px solid rgba(57, 255, 20, 0.4);
          border-radius: 12px;
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-nvidia-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, 
            rgba(57, 255, 20, 0.1) 0%, 
            transparent 50%
          );
          opacity: 0;
          transition: opacity 0.3s;
        }

        .btn-nvidia-cta:hover {
          border-color: rgba(57, 255, 20, 0.7);
          box-shadow: 
            0 0 30px rgba(57, 255, 20, 0.3),
            inset 0 0 20px rgba(57, 255, 20, 0.05);
          transform: translateY(-2px);
        }

        .btn-nvidia-cta:hover::before {
          opacity: 1;
        }

        .btn-nvidia-cta svg {
          color: #39ff14;
          filter: drop-shadow(0 0 6px rgba(57, 255, 20, 0.5));
        }

        .nvidia-cta-badge {
          padding: 4px 10px;
          background: linear-gradient(135deg, #39ff14 0%, #00ff00 100%);
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 800;
          color: #000;
          letter-spacing: 0.05em;
        }

        /* Power Bar */
        .nvidia-power-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #39ff14 15%,
            #00ff00 35%,
            #39ff14 50%,
            #00ff00 65%,
            #39ff14 85%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: power-bar-anim 2s linear infinite;
          box-shadow: 
            0 0 10px rgba(57, 255, 20, 0.6),
            0 0 20px rgba(57, 255, 20, 0.4),
            0 0 40px rgba(57, 255, 20, 0.2);
        }

        @keyframes power-bar-anim {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ===================== */
        /* RESPONSIVE            */
        /* ===================== */
        
        @media (max-width: 1024px) {
          .landing-nav {
            padding: 0 30px;
          }

          .nav-links {
            display: none;
          }

          .hero-section {
            padding: 100px 30px 60px;
          }

          .suite-section,
          .contact-section {
            padding-left: 30px;
            padding-right: 30px;
          }

          .hero-orb {
            width: 400px;
            height: 400px;
          }

          /* NVIDIA Responsive - Tablet */
          .nvidia-section {
            padding: 60px 30px;
          }

          .nvidia-content {
            text-align: center;
          }

          .nvidia-stats {
            justify-content: center;
          }

          .nvidia-title {
            font-size: 2.2rem;
          }
        }

        @media (max-width: 640px) {
          .landing-nav {
            padding: 0 20px;
          }

          .brand-text {
            font-size: 0.9rem;
          }

          .brand-badge {
            display: none;
          }

          .hero-title {
            font-size: 2rem;
          }

          .hero-description {
            font-size: 1rem;
          }

          .hero-features {
            flex-direction: column;
            gap: 12px;
          }

          .btn-hero-primary,
          .btn-hero-secondary {
            width: 100%;
            justify-content: center;
          }

          .feature-card {
            padding: 30px;
          }

          .contact-card {
            padding: 40px 24px;
          }

          .footer-content {
            justify-content: center;
            text-align: center;
            gap: 16px;
          }

          /* NVIDIA Responsive - Mobile */
          .nvidia-section {
            padding: 40px 20px;
          }

          .nvidia-title {
            font-size: 1.8rem;
          }

          .nvidia-description {
            font-size: 0.95rem;
          }

          .nvidia-stats {
            flex-direction: column;
            gap: 12px;
          }

          .nvidia-stat {
            padding: 16px 24px;
          }

          .nvidia-stat-value {
            font-size: 1.6rem;
          }

          .btn-nvidia-cta {
            width: 100%;
            justify-content: center;
            padding: 14px 24px;
          }
        }

        /* ===================== */
        /* CONTACT FORM          */
        /* ===================== */
        
        .contact-form-wrapper {
          max-width: 500px;
          margin: 0 auto 32px;
          background: rgba(0, 0, 0, 0.2);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-row {
          display: flex;
          gap: 12px;
        }

        .form-row input {
          width: 50%;
        }

        .contact-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px 16px;
          color: #fff;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .contact-input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 2px rgba(0, 242, 255, 0.1);
        }

        .contact-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .btn-contact-submit {
          background: var(--primary);
          color: #000;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 4px;
        }

        .btn-contact-submit:hover:not(:disabled) {
          background: #fff;
          transform: translateY(-1px);
        }

        .btn-contact-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-error {
          color: var(--danger);
          font-size: 0.85rem;
          margin-top: 8px;
        }

        .contact-success {
          text-align: center;
          padding: 20px;
        }

        .success-icon {
          width: 48px;
          height: 48px;
          background: rgba(0, 255, 157, 0.2);
          color: var(--success);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto 16px;
        }

        .contact-success h3 {
          color: var(--success);
          margin-bottom: 8px;
        }

        .contact-divider-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .contact-divider-text::before,
        .contact-divider-text::after {
          content: '';
          height: 1px;
          width: 40px;
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 640px) {
          .form-row {
            flex-direction: column;
          }
          .form-row input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
