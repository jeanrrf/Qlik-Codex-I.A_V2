// web/src/components/OptimizationFeedback.tsx
import React, { useState } from 'react';
import { getAuthHeaders } from '../api/client';
import './OptimizationFeedback.css';

export interface OptimizationFeedbackProps {
  optimizationId: string;
  onFeedbackSubmit?: (type: 'approve' | 'reject', comment?: string) => Promise<void>;
  disabled?: boolean;
}

export const OptimizationFeedback: React.FC<OptimizationFeedbackProps> = ({
  optimizationId,
  onFeedbackSubmit,
  disabled = false,
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<'approve' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFeedback = async (type: 'approve' | 'reject') => {
    if (isSubmitting || feedbackGiven) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (onFeedbackSubmit) {
        await onFeedbackSubmit(type, comment || undefined);
      } else {
        // Default implementation: call API directly
        const response = await fetch('/api/rag/feedback', {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            optimizationId,
            feedbackType: type,
            comment: comment || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao enviar feedback');
        }
      }

      setFeedbackGiven(type);
      setShowCommentBox(false);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar feedback');
      console.error('Feedback submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedbackGiven) {
    return (
      <div className={`optimization-feedback feedback-given feedback-${feedbackGiven}`}>
        <div className="feedback-icon">
          {feedbackGiven === 'approve' ? '✅' : '❌'}
        </div>
        <div className="feedback-message">
          <strong>
            {feedbackGiven === 'approve'
              ? 'Obrigado! Esta otimização ajudará a melhorar futuras sugestões.'
              : 'Feedback registrado. Esta otimização não será usada como referência.'}
          </strong>
          {comment && (
            <p className="feedback-comment-preview">
              <em>"{comment}"</em>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="optimization-feedback">
      <div className="feedback-header">
        <h3>🎯 Esta otimização atendeu suas expectativas?</h3>
        <p className="feedback-subtitle">
          Seu feedback ajuda o sistema a aprender e melhorar futuras otimizações
        </p>
      </div>

      {error && (
        <div className="feedback-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="feedback-actions">
        <button
          className="feedback-btn feedback-btn-approve"
          onClick={() => handleFeedback('approve')}
          disabled={disabled || isSubmitting}
          title="Aprovar otimização (aumenta score de recompensa)"
        >
          <span className="btn-icon">✅</span>
          <span className="btn-text">
            Aprovar
            <small>+10 pontos de recompensa</small>
          </span>
        </button>

        <button
          className="feedback-btn feedback-btn-reject"
          onClick={() => handleFeedback('reject')}
          disabled={disabled || isSubmitting}
          title="Rejeitar otimização (remove do histórico de aprendizado)"
        >
          <span className="btn-icon">❌</span>
          <span className="btn-text">
            Rejeitar
            <small>Não usar como referência</small>
          </span>
        </button>

        <button
          className="feedback-btn feedback-btn-comment"
          onClick={() => setShowCommentBox(!showCommentBox)}
          disabled={disabled || isSubmitting}
          title="Adicionar comentário (opcional)"
        >
          <span className="btn-icon">💬</span>
          <span className="btn-text">Comentar</span>
        </button>
      </div>

      {showCommentBox && (
        <div className="feedback-comment-box">
          <label htmlFor={`comment-${optimizationId}`}>
            Comentário opcional (será armazenado com o feedback):
          </label>
          <textarea
            id={`comment-${optimizationId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: 'Excelente otimização, reduziu queries em 50%' ou 'Alterou a lógica de negócio incorretamente'"
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
            aria-label="Comentário sobre a otimização"
          />
          <small className="char-counter">
            {comment.length}/500 caracteres
          </small>
        </div>
      )}

      {isSubmitting && (
        <div className="feedback-loading">
          <span className="spinner">⏳</span>
          Enviando feedback...
        </div>
      )}
    </div>
  );
};

export default OptimizationFeedback;
