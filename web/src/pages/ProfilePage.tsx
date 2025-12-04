import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { UserRole } from "../types/auth";
import { OwnerKpiDashboard } from "../components/OwnerKpiDashboard";
import "./ProfilePage.css";

export function ProfilePage() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showUploadHint, setShowUploadHint] = useState(false);

  useEffect(() => {
    // Carregar avatar do localStorage ou Google
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setAvatarPreview(savedAvatar);
    } else if (user?.avatarUrl) {
      setAvatarPreview(user.avatarUrl);
    }
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo: 2MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens são permitidas');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      localStorage.setItem('userAvatar', dataUrl);
      setShowUploadHint(true);
      setTimeout(() => setShowUploadHint(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRequestPro = () => {
    const message = `Olá! Gostaria de solicitar upgrade para o modo PRO da AINEX. 

Email: ${user?.email}
Nome: ${user?.name}

Aguardo retorno!`;

    window.open(
      `https://api.whatsapp.com/send?phone=5548991937304&text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem('userAvatar');
    setAvatarPreview(user?.avatarUrl || null);
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-empty">
          <p>Você precisa estar autenticado para ver seu perfil.</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeInfo = () => {
    if (user.role === UserRole.OWNER) {
      return { label: 'PROPRIETÁRIO', color: 'var(--warning)', icon: '👑' };
    }
    return { label: 'FREE TIER', color: 'var(--primary)', icon: '🚀' };
  };

  const roleInfo = getRoleBadgeInfo();

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Botão Voltar */}
        <button className="btn-back" onClick={() => navigateTo('landing')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Voltar
        </button>

        {/* Header */}
        <div className="profile-header">
          <h1 className="profile-title">
            <span className="profile-icon">👤</span>
            Meu Perfil
          </h1>
          <p className="profile-subtitle">Gerencie suas informações e configurações</p>
        </div>

        <div className="profile-grid">

          {/* Avatar Section */}
          <div className="profile-card avatar-card">
            <h3 className="card-title">Foto de Perfil</h3>

            <div className="avatar-preview-container">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar-preview" />
              ) : (
                <div className="avatar-placeholder">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="avatar-actions">
              <label className="btn btn-secondary">
                📷 Alterar Foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
              </label>
              {avatarPreview && avatarPreview !== user.avatarUrl && (
                <button className="btn btn-ghost" onClick={handleRemoveAvatar}>
                  Remover
                </button>
              )}
            </div>

            {showUploadHint && (
              <p className="avatar-hint success">✓ Foto atualizada!</p>
            )}
            <p className="avatar-hint">
              A foto é salva apenas no seu navegador (localStorage)
            </p>
          </div>

          {/* User Info */}
          <div className="profile-card info-card">
            <h3 className="card-title">Informações</h3>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Nome:</span>
                <span className="info-value">{user.name || 'Não informado'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Plano:</span>
                <div className="info-value-badge">
                  <span className="plan-badge" style={{
                    background: `${roleInfo.color}20`,
                    borderColor: roleInfo.color,
                    color: roleInfo.color
                  }}>
                    {roleInfo.icon} {roleInfo.label}
                  </span>
                </div>
              </div>
              {user.createdAt && (
                <div className="info-item">
                  <span className="info-label">Membro desde:</span>
                  <span className="info-value">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Welcome Section */}
        <div className="profile-card welcome-card">
          <div className="welcome-icon">👋</div>
          <div className="welcome-content">
            <h3 className="welcome-title">Bem-vindo ao Qlik Codex I.A!</h3>
            <p className="welcome-text">
              Você está usando a <strong>primeira IA especializada em Qlik Sense do Brasil</strong>.
              A AINEX foi treinada por especialistas Qlik para oferecer análises profundas e
              otimizações reais no seu código. Cada sugestão é validada contra a arquitetura
              real da plataforma Qlik.
            </p>
          </div>
        </div>

        {/* Owner KPIs (apenas para PROPRIETÁRIO) */}
        {user.role === UserRole.OWNER && <OwnerKpiDashboard />}

        {/* Upgrade to PRO (apenas para FREE TIER) */}
        {user.role === UserRole.USER && (
          <div className="profile-card upgrade-card">
            <div className="upgrade-badge">⚡ UPGRADE</div>
            <h3 className="upgrade-title">Desbloqueie todo o potencial da AINEX</h3>
            <p className="upgrade-subtitle">
              Leve sua análise Qlik para o próximo nível com o modo PRO
            </p>

            <div className="benefits-grid">
              <div className="benefit-item">
                <div className="benefit-icon">📁</div>
                <div className="benefit-text">
                  <strong>Múltiplos Arquivos</strong>
                  <span>Analise projetos completos</span>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">∞</div>
                <div className="benefit-text">
                  <strong>Sem Limites</strong>
                  <span>Otimizações e linhas ilimitadas</span>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">⚡</div>
                <div className="benefit-text">
                  <strong>Ultra Expert ∞</strong>
                  <span>Execuções ilimitadas</span>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">🎯</div>
                <div className="benefit-text">
                  <strong>Suporte Priority</strong>
                  <span>Atendimento especializado</span>
                </div>
              </div>
            </div>

            <button className="btn btn-upgrade" onClick={handleRequestPro}>
              <span className="btn-icon">💬</span>
              Falar com a Sentinel
            </button>
            <p className="upgrade-cta-note">
              Envie uma mensagem e receba uma proposta personalizada
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
