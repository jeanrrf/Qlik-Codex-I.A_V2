import React, { useEffect, useRef, useState } from "react";

import QlikFormatterTool from "../components/QlikFormatterTool";

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
          <div className="brand-icon">
            <div className="brand-pulse" />
            <div className="brand-core" />
          </div>
          <span className="brand-text">QLIK CODEX I.A</span>
          <span className="brand-badge">BETA</span>
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
            Iniciar Análise
          </button>
        </div>
      </nav>

      <div className="landing-content">
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
              <span>Inteligência Artificial especializada em Qlik</span>
              <span className="eyebrow-icon">◆</span>
            </div>

            <h1 className="hero-title">
              <span className="title-line">Plataforma de</span>
              <span className="title-line title-highlight">
                <span className="highlight-text">Engenharia de Dados Qlik</span>
                <span className="highlight-glow" />
              </span>
              <span className="title-line">para times de BI e Dados.</span>
            </h1>

            {/* Badge AINEX - Compacto */}
            <div className="hero-ainex-compact">
              <span className="ainex-tag">AINEX ENGINE</span>
              <span className="ainex-separator">|</span>
              <span className="ainex-desc">Otimização Neural para Qlik Sense & SaaS</span>
            </div>

            <p className="hero-description">
              Plataforma de IA especializada em Qlik para engenharia de dados. Analisa, refatora e documenta seus scripts com foco em desempenho, segurança e padronização.
            </p>

            <div className="hero-features">
              <div className="hero-feature">
                <Icons.Bolt />
                <span>Análise em segundos</span>
              </div>
              <div className="hero-feature">
                <Icons.Shield />
                <span>Zero riscos em produção</span>
              </div>
              <div className="hero-feature">
                <Icons.Code />
                <span>Código otimizado</span>
              </div>
              <div className="hero-feature">
                <Icons.Brain />
                <span>IA Especializada</span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="btn btn-hero-primary" onClick={onStart}>
                <span className="btn-glow" />
                <span className="btn-content">
                  Experimentar Agora
                  <span className="btn-badge">Grátis</span>
                </span>
              </button>
              <button
                className="btn btn-hero-secondary"
                onClick={() => scrollToSection('suite')}
              >
                Ver demonstração
                <Icons.ChevronDown />
              </button>
            </div>
          </div>

          <div className="scroll-indicator" onClick={() => scrollToSection('suite')}>
            <span className="scroll-text">Explore</span>
            <div className="scroll-line">
              <div className="scroll-dot" />
            </div>
          </div>
        </section>

        {/* SUITE / FEATURES */}
        <section id="suite" className="suite-section">
            <div className="section-header">
              <span className="section-badge">SUITE COMPLETA</span>
              <h2 className="section-title">
                Suite de ferramentas para<br />
                <span className="title-accent">Desenvolvedores Qlik.</span>
              </h2>
              <p className="section-description">
                Conjunto de ferramentas para auditar, otimizar e documentar seus projetos Qlik Sense e SaaS.
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
                  Identifica gargalos de carga, joins explosivos e uso ineficiente de memória RAM.
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
                  Auditoria de segurança e boas práticas. Detecta loops, chaves sintéticas e vulnerabilidades.
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
                  Gera documentação técnica detalhada do seu script, incluindo linhagem e regras de negócio.
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
                  Explicações objetivas para cada recomendação de melhoria, ajudando o time a entender e padronizar o código.
                </p>
                <div className="card-tags">
                  <span className="tag tag-amber">Ensino</span>
                  <span className="tag tag-amber">Upskilling</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ✨ POR QUE AINEX? - DIFERENCIAL COMERCIAL */}
        <section className="why-ainex-section">
          <div className="section-header">
            <span className="section-badge">DIFERENCIAL AINEX</span>
            <h2 className="section-title">
              Por que a AINEX se destaca?
            </h2>
            <p className="section-description">
              IAs genéricas podem gerar sintaxe incorreta; a AINEX foi desenhada para entender a engenharia do Qlik.
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
                <li className="neutral">? Adequados para textos gerais</li>
                <li className="negative">? Podem sugerir fun??es inexistentes</li>
                <li className="negative">? N?o consideram performance de QVD e modelo</li>
                <li className="negative">? N?o avaliam impacto de loops e chaves sint?ticas</li>
                <li className="negative">? N?o entendem particularidades como "Preceding Load"</li>
              </ul>
            </div>

            <div className="comparison-card ainex featured">
              <div className="comparison-header">
                <div className="comparison-icon">⚡</div>
                <h3>AINEX Engine</h3>
                <span className="featured-badge">Qlik Native</span>
              </div>
              <ul className="comparison-list">
                <li className="positive">✓ Treinada em documentação técnica Qlik</li>
                <li className="positive">✓ Valida sintaxe antes de sugerir</li>
                <li className="positive">✓ Otimiza para Qlik Engine (RAM/CPU)</li>
                <li className="positive">✓ Detecta gargalos de modelagem</li>
                <li className="positive">✓ Gera documentação automática</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ✨ FREE TIER - EXPERIMENTE AGORA */}
        <section className="free-tier-section">
          <div className="section-header">
            <span className="section-badge free">ACESSO GRATUITO</span>
            <h2 className="section-title">
              Potência Enterprise.<br />
              <span className="title-accent">Custo Zero.</span>
            </h2>
            <p className="section-description">
              Experimente o poder do motor AINEX sem barreiras. Ideal para validações rápidas e aprendizado.
            </p>
          </div>

          <div className="free-tier-card">
            <div className="free-tier-glow" />
            <div className="free-tier-content">
              <div className="free-tier-header">
                <h3 className="free-tier-title">🚀 COMMUNITY EDITION</h3>
                <span className="free-tier-price">R$ 0<small>/mês</small></span>
              </div>

              <div className="free-tier-features">
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-text">
                    <strong>4 Otimizações Diárias</strong>
                    <span>Renovadas a cada 24h automaticamente</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📝</div>
                  <div className="feature-text">
                    <strong>Até 200 Linhas de Código</strong>
                    <span>Análise profunda de blocos lógicos</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🧠</div>
                  <div className="feature-text">
                    <strong>Modo Ultra-Expert</strong>
                    <span>O mesmo motor da versão Enterprise</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🛡️</div>
                  <div className="feature-text">
                    <strong>Validação de Segurança</strong>
                    <span>Detecção de riscos e anti-patterns</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-free-start" onClick={onStart}>
                <span className="btn-icon">👉</span>
                Iniciar Agora
              </button>

              <p className="free-tier-note">
                Não requer cartão de crédito. Acesso imediato.
              </p>
            </div>
          </div>
        </section>

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
        <QlikFormatterTool isOpen={formatterOpen} onClose={() => setFormatterOpen(false)} />

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

              <div className="contact-actions">
                <button className="btn btn-contact-primary" onClick={handleEmail}>
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
      </div>

      {/* FOOTER HORIZONTAL */}
      <footer className="landing-footer">
        <div className="footer-content">
          <span className="footer-brand">
            ⚡ QLIK CODEX I.A
          </span>
          <span className="footer-separator">•</span>
          <span className="footer-copy">
            &copy; 2025 SENTINNELL IA
          </span>
          <span className="footer-separator">•</span>
          <span className="footer-powered">
            Powered by AINEX
          </span>
          <span className="footer-separator">•</span>
          <a href="https://github.com/jeanrrf" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitHub
          </a>
          <a href="https://api.whatsapp.com/send?phone=5548999373041" target="_blank" rel="noopener noreferrer" className="footer-link">
            WhatsApp
          </a>
        </div>
      </footer>

      {/* Contact Modal */}
      {contactOpen && (
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
      )}

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

        .brand-icon {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-icon.small {
          width: 20px;
          height: 20px;
        }

        .brand-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(0, 242, 255, 0.2);
          animation: brand-pulse 2s ease-in-out infinite;
        }

        .brand-core {
          width: 12px;
          height: 12px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 0 0 20px var(--primary);
        }

        .brand-icon.small .brand-core {
          width: 8px;
          height: 8px;
        }

        @keyframes brand-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0; }
        }

        .brand-text {
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          background: rgba(0, 242, 255, 0.15);
          color: var(--primary);
          border-radius: 4px;
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

        /* ✨ Badge Especialista Qlik */
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
        }
      `}</style>
    </div>
  );
};

export default LandingPage;