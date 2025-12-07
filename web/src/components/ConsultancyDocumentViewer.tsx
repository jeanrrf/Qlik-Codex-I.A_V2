/**
 * Qlik Codex I.A - Componente de Documento de Consultoria
 * Visualização profissional do relatório de consultoria
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { copyToClipboard } from "../lib/clipboard";
import type { ConsultancyDocument } from '../types/consultancy';
import { highlightQlikCode } from '../lib/qlikSyntaxHighlighter';
import { formatDuration } from '../lib/formatTime';

// Simple Markdown Renderer Component
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  lines.forEach((line, index) => {
    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <pre key={`code-${index}`} className="cd-md-code-block" style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '12px',
            borderRadius: '8px',
            overflowX: 'auto',
            fontFamily: 'monospace',
            margin: '12px 0'
          }}>
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="cd-md-h1" style={{ fontSize: '1.8rem', margin: '24px 0 16px', color: 'var(--primary)' }}>{line.substring(2)}</h1>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="cd-md-h2" style={{ fontSize: '1.5rem', margin: '20px 0 12px', color: 'var(--text-main)' }}>{line.substring(3)}</h2>);
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="cd-md-h3" style={{ fontSize: '1.2rem', margin: '16px 0 8px', color: 'var(--text-secondary)' }}>{line.substring(4)}</h3>);
      return;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.trim().substring(2);
      const parts = text.split(/(\*\*.*?\*\*)/g);
      const renderedText = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--text-main)' }}>{part.substring(2, part.length - 2)}</strong>;
        }
        return part;
      });

      elements.push(
        <li key={index} className="cd-md-li" style={{ marginLeft: '20px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          {renderedText}
        </li>
      );
      return;
    }

    // Paragraphs (with bold support)
    if (line.trim().length > 0) {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--text-main)' }}>{part.substring(2, part.length - 2)}</strong>;
        }
        return part;
      });
      elements.push(<p key={index} className="cd-md-p" style={{ marginBottom: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{renderedLine}</p>);
    } else {
      // Empty line
      elements.push(<div key={index} style={{ height: '8px' }} />);
    }
  });

  return <div className="cd-simple-markdown">{elements}</div>;
};

interface ConsultancyDocumentViewerProps {
  document: ConsultancyDocument;
  onClose?: () => void;
}

// Ícones
const Icons = {
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Clipboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <rect x="5" y="5" width="14" height="17" rx="2" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

// Level bar component
const LevelBar: React.FC<{ level: string; color: string }> = ({ level, color }) => {
  const levels = ['critical', 'low', 'medium', 'good', 'excellent'];
  const index = levels.indexOf(level);
  const percentage = ((index + 1) / levels.length) * 100;

  return (
    <div className="level-bar-container">
      <div className="level-bar-track">
        <div
          className="level-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="level-bar-label">{level}</span>
    </div>
  );
};

// Tab component
type TabId = 'summary' | 'discoveries' | 'gains' | 'timeline' | 'code' | 'actions';
type ConsultancyTip = ConsultancyDocument['tips'][number];

const ConsultancyDocumentViewer: React.FC<ConsultancyDocumentViewerProps> = ({
  document: doc,
  onClose
}) => {
  // Abas inteligentes - só mostrar se tiver conteúdo relevante
  const availableTabs = useMemo(() => {
    const tabs: { id: TabId; label: string; icon: string }[] = [
      { id: 'summary', label: 'Resumo', icon: '[R]' }
    ];

    // Discoveries: só se tiver mudanças ou descobertas relevantes
    const hasDiscoveries = (doc.codeComparison?.markers?.length || 0) > 0 ||
      (doc.warnings?.length || 0) > 0 ||
      (doc.executiveSummary?.criticalAlerts?.length || 0) > 0;
    if (hasDiscoveries) {
      tabs.push({ id: 'discoveries', label: 'Descobertas', icon: '[D]' });
    }

    // Gains: só se tiver ganhos reais (não placeholders)
    const hasRealGains = (doc.qualitativeGains?.length || 0) > 0 &&
      !doc.qualitativeGains[0]?.description.includes('já seguia boas práticas');
    if (hasRealGains) {
      tabs.push({ id: 'gains', label: 'Ganhos', icon: '[G]' });
    }

    // Timeline: só para modo ultra-expert ou se tiver timeline real
    const hasTimeline = (doc.timeline?.length || 0) > 2; // Mais de 2 entradas = timeline relevante
    if (hasTimeline) {
      tabs.push({ id: 'timeline', label: 'Timeline', icon: '[T]' });
    }

    // Code: só se houver comparação de código
    const hasCodeChanges = (doc.codeComparison?.diffStats?.linesAdded || 0) > 0 ||
      (doc.codeComparison?.diffStats?.linesRemoved || 0) > 0 ||
      (doc.codeComparison?.diffStats?.linesModified || 0) > 0;
    if (hasCodeChanges) {
      tabs.push({ id: 'code', label: 'Código', icon: '[C]' });
    }

    // Actions: sempre mostrar se houver recomendações
    if ((doc.recommendations?.length || 0) > 0) {
      tabs.push({ id: 'actions', label: 'Plano de Ação', icon: '[A]' });
    }

    return tabs;
  }, [doc]);

  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['keyFindings']));
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [expandedDiscovery, setExpandedDiscovery] = useState<number | null>(null);
  const copyTimeout = useRef<number | null>(null);
  const originalCodeRef = useRef<HTMLDivElement | null>(null);
  const optimizedCodeRef = useRef<HTMLDivElement | null>(null);
  const alignedCodeRef = useRef<HTMLDivElement | null>(null);

  // Auto-ajustar activeTab se a aba atual não estiver disponível
  useEffect(() => {
    const tabIds = availableTabs.map(t => t.id);
    if (!tabIds.includes(activeTab)) {
      setActiveTab('summary');
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    const left = originalCodeRef.current;
    const right = optimizedCodeRef.current;
    if (!left || !right) {
      return;
    }

    let syncing = false;
    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (syncing) {
        return;
      }
      syncing = true;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const handleLeftScroll = () => syncScroll(left, right);
    const handleRightScroll = () => syncScroll(right, left);

    left.addEventListener('scroll', handleLeftScroll);
    right.addEventListener('scroll', handleRightScroll);

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
    };
  }, [doc.codeComparison.originalCode, doc.codeComparison.optimizedCode]);

  const copyTextToClipboard = async (text: string, context: string) => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
      setCopyFeedback(`${context} copiado para a area de transferencia.`);
    } catch {
      fallbackCopy();
      setCopyFeedback(
        `Não foi possivel usar o atalho automatico para ${context}. Use Ctrl+C ou toque longo para colar.`
      );
    } finally {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
      copyTimeout.current = window.setTimeout(() => setCopyFeedback(null), 3200);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Color mappings
  const healthColors: Record<string, string> = {
    excellent: '#00ff9d',
    good: '#00f2ff',
    fair: '#ffb800',
    poor: '#ff6b35',
    critical: '#ff2a6d'
  };

  const riskColors: Record<string, string> = {
    none: '#00ff9d',
    low: '#00f2ff',
    medium: '#ffb800',
    high: '#ff2a6d'
  };

  const priorityColors: Record<string, string> = {
    critical: '#ff2a6d',
    high: '#ff6b35',
    medium: '#ffb800',
    low: '#00f2ff'
  };

  const levelColors: Record<string, string> = {
    critical: '#ff2a6d',
    low: '#ff6b35',
    medium: '#ffb800',
    good: '#00f2ff',
    excellent: '#00ff9d'
  };



  const actionLabels: Record<string, { text: string; color: string }> = {
    apply: { text: 'Aplicar', color: '#00ff9d' },
    review: { text: 'Revisar', color: '#ffb800' },
    caution: { text: 'Cuidado', color: '#ff6b35' },
    reject: { text: 'Rejeitar', color: '#ff2a6d' }
  };

  const tipsByCategory = useMemo<Record<string, ConsultancyTip[]>>(() => {
    const grouped: Record<string, ConsultancyTip[]> = {};
    doc.tips.forEach(tip => {
      if (!grouped[tip.category]) {
        grouped[tip.category] = [];
      }
      grouped[tip.category].push(tip);
    });
    return grouped;
  }, [doc.tips]);

  const standaloneTips = useMemo<ConsultancyTip[]>(() => {
    return doc.tips.filter(
      tip => !doc.recommendations.some(rec => rec.category === tip.category)
    );
  }, [doc.tips, doc.recommendations]);

  const originalLines = useMemo(() => {
    return (doc.codeComparison?.originalCode || '').split(/\r?\n/);
  }, [doc.codeComparison]);

  const optimizedLines = useMemo(() => {
    return (doc.codeComparison?.optimizedCode || '').split(/\r?\n/);
  }, [doc.codeComparison]);

  // Helper: simple Levenshtein distance
  const levenshtein = (a: string, b: string): number => {
    const n = a.length;
    const m = b.length;
    if (n === 0) return m;
    if (m === 0) return n;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[n][m];
  };

  const lineSimilarity = (a: string, b: string): number => {
    if (!a && !b) return 1;
    const maxLen = Math.max(a.length, b.length, 1);
    const d = levenshtein(a, b);
    return 1 - (d / maxLen);
  };

  // Escape HTML helper
  const escapeHtml = (str: string) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Char-level LCS-based intraline diff -> returns { leftHtml, rightHtml }
  const intralineDiff = (left: string, right: string) => {
    const a = left || '';
    const b = right || '';
    const n = a.length;
    const m = b.length;
    if (n === 0 && m === 0) return { leftHtml: '', rightHtml: '' };

    // Build dp
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    // Backtrack to produce segments
    let i = 0; let j = 0;
    const leftParts: string[] = [];
    const rightParts: string[] = [];

    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) {
        leftParts.push(escapeHtml(a[i]));
        rightParts.push(escapeHtml(b[j]));
        i++; j++; continue;
      }

      if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
        // insertion in right
        let buf = '';
        while (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) { buf += escapeHtml(b[j]); j++; }
        rightParts.push(`<span class="cd-ins">${buf}</span>`);
        continue;
      }

      if (i < n) {
        let buf = '';
        while (i < n && (j === m || dp[i + 1][j] >= dp[i][j + 1])) { buf += escapeHtml(a[i]); i++; }
        leftParts.push(`<span class="cd-del">${buf}</span>`);
        continue;
      }
    }

    return { leftHtml: leftParts.join('') || escapeHtml(left), rightHtml: rightParts.join('') || escapeHtml(right) };
  };

  // Generate unified diff (simple) for export
  const generateUnifiedDiff = (rows: any[], fileA = 'original', fileB = 'optimized') => {
    const header = `--- ${fileA}\n+++ ${fileB}\n`;
    const hunks: string[] = [];
    let oldStart = 0, oldCount = 0, newStart = 0, newCount = 0;
    const lines: string[] = [];
    for (const r of rows) {
      if (r.type === 'unchanged') {
        lines.push(' ' + (r.leftText || r.rightText || ''));
      } else if (r.type === 'removed') {
        lines.push('-' + (r.leftText || ''));
      } else if (r.type === 'added') {
        lines.push('+' + (r.rightText || ''));
      } else if (r.type === 'modified') {
        lines.push('-' + (r.leftText || ''));
        lines.push('+' + (r.rightText || ''));
      }
    }
    return header + lines.join('\n');
  };

  // Compute an aligned, line-by-line diff (git-like) between originalLines and optimizedLines
  const alignedRows = useMemo(() => {
    // LCS dynamic programming approach to align lines
    const A = originalLines;
    const B = optimizedLines;
    const n = A.length;
    const m = B.length;

    // dp table sized (n+1)x(m+1)
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        if (A[i] === B[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    // Backtrack to produce aligned rows
    let i = 0;
    let j = 0;
    type RowType = 'unchanged' | 'removed' | 'added' | 'modified';
    const rows: { leftLine?: number; leftText: string; rightLine?: number; rightText: string; type: RowType }[] = [];

    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) {
        rows.push({ leftLine: i + 1, leftText: A[i], rightLine: j + 1, rightText: B[j], type: 'unchanged' });
        i++; j++;
        continue;
      }

      // Prefer additions when dp suggests so; otherwise removals
      if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
        rows.push({ leftText: '', rightLine: j + 1, rightText: B[j], type: 'added' });
        j++;
        continue;
      }

      if (i < n) {
        rows.push({ leftLine: i + 1, leftText: A[i], rightText: '', type: 'removed' });
        i++;
        continue;
      }
    }

    // Post-process to combine consecutive removed+added sequences into modified pairs when possible
    const merged: typeof rows = [];
    let idx = 0;
    while (idx < rows.length) {
      const r = rows[idx];
      if (r.type === 'removed') {
        // collect consecutive removed
        const removedSeq: typeof rows = [];
        let k = idx;
        while (k < rows.length && rows[k].type === 'removed') { removedSeq.push(rows[k]); k++; }

        // then collect consecutive added
        const addedSeq: typeof rows = [];
        let kk = k;
        while (kk < rows.length && rows[kk].type === 'added') { addedSeq.push(rows[kk]); kk++; }

        if (removedSeq.length > 0 && addedSeq.length > 0) {
          // attempt to pair removed lines with best matching added lines using similarity
          const usedAdded = new Set<number>();
          for (let rIndex = 0; rIndex < removedSeq.length; rIndex++) {
            let bestScore = 0;
            let bestIdx = -1;
            for (let aIndex = 0; aIndex < addedSeq.length; aIndex++) {
              if (usedAdded.has(aIndex)) continue;
              const leftText = removedSeq[rIndex].leftText || '';
              const rightText = addedSeq[aIndex].rightText || '';
              const score = lineSimilarity(leftText, rightText);
              if (score > bestScore) { bestScore = score; bestIdx = aIndex; }
            }
            if (bestIdx >= 0 && bestScore >= 0.38) {
              // treat as modified pair
              usedAdded.add(bestIdx);
              const left = removedSeq[rIndex];
              const right = addedSeq[bestIdx];
              merged.push({ leftLine: left.leftLine, leftText: left.leftText || '', rightLine: right.rightLine, rightText: right.rightText || '', type: 'modified' });
            } else {
              // no good match -> keep removed
              const left = removedSeq[rIndex];
              merged.push({ leftLine: left.leftLine, leftText: left.leftText || '', rightText: '', type: 'removed' });
            }
          }

          // remaining unmatched addedSeq entries become 'added'
          for (let aIndex = 0; aIndex < addedSeq.length; aIndex++) {
            if (!usedAdded.has(aIndex)) {
              const right = addedSeq[aIndex];
              merged.push({ leftText: '', rightLine: right.rightLine, rightText: right.rightText || '', type: 'added' });
            }
          }

          idx = kk; // skip removed + added sequences
          continue;
        }
      }

      merged.push(r);
      idx++;
    }

    return merged;
  }, [originalLines, optimizedLines]);

  const originalHighlights = useMemo(() => {
    const allowed = new Set(['removed', 'modified', 'warning']);
    const map = new Map<number, string>();
    (doc.codeComparison?.markers || []).forEach(marker => {
      if (!allowed.has(marker.type)) {
        return;
      }
      for (let line = marker.lineStart; line <= marker.lineEnd; line += 1) {
        map.set(line, marker.type);
      }
    });
    return map;
  }, [doc.codeComparison]);

  const optimizedHighlights = useMemo(() => {
    const allowed = new Set(['added', 'modified', 'improvement', 'warning']);
    const map = new Map<number, string>();
    (doc.codeComparison?.markers || []).forEach(marker => {
      if (!allowed.has(marker.type)) {
        return;
      }
      for (let line = marker.lineStart; line <= marker.lineEnd; line += 1) {
        map.set(line, marker.type);
      }
    });
    return map;
  }, [doc.codeComparison]);

  const renderCodeLines = (
    lines: string[],
    highlights: Map<number, string>,
    keyPrefix: string
  ) => (
    <table className="code-table">
      <tbody>
        {lines.map((line, idx) => {
          const lineNumber = idx + 1;
          const highlight = highlights.get(lineNumber);
          const highlightedLine = highlightQlikCode(line);
          return (
            <tr
              key={`${keyPrefix}-${lineNumber}`}
              className={`cd-code-line ${highlight ? `code-${highlight}` : ''}`}
            >
              <td className="line-number-cell" data-line-number={lineNumber}></td>
              <td className="code-cell">
                <div
                  className="code-line-content code-content qlik-syntax"
                  dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // Format duration with HH:MM:SS - usando função importada
  // Removida duplicata local

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render Summary Tab
  const renderSummaryTab = () => {
    if (!doc.executiveSummary) return <div className="cd-tab-content">Dados do sumário indisponíveis</div>;

    return (
      <div className="cd-tab-content">
        {/* Executive Summary Header */}
        <div className="cd-exec-header">
          <div className="cd-exec-title-row">
            <h2>{doc.executiveSummary.title}</h2>
            <div
              className="cd-action-badge"
              style={{
                backgroundColor: `${actionLabels[doc.executiveSummary.recommendedAction].color}20`,
                borderColor: actionLabels[doc.executiveSummary.recommendedAction].color,
                color: actionLabels[doc.executiveSummary.recommendedAction].color
              }}
            >
              {actionLabels[doc.executiveSummary.recommendedAction].text}
            </div>
          </div>
          <div className="cd-exec-meta">
            <span>📅 {formatDate(doc.executiveSummary.date)}</span>
            <span>🤖 {doc.executiveSummary.analyst}</span>
            <span>⏱️ {formatDuration(doc.processingTimeMs)}</span>
          </div>
        </div>

        {/* Health & Risk Indicators */}
        <div className="cd-indicators-row">
          <div className="cd-indicator-card">
            <span className="cd-indicator-label">Saúde Geral</span>
            <div
              className="cd-indicator-value"
              style={{ color: healthColors[doc.executiveSummary?.overallHealth || 'fair'] }}
            >
              {(doc.executiveSummary?.overallHealth || 'fair').toUpperCase()}
            </div>
            <div className="cd-indicator-bar">
              <div
                className="cd-indicator-bar-fill"
                style={{
                  width: `${(['critical', 'poor', 'fair', 'good', 'excellent'].indexOf(doc.executiveSummary.overallHealth) + 1) * 20}%`,
                  backgroundColor: healthColors[doc.executiveSummary.overallHealth]
                }}
              />
            </div>
          </div>
          <div className="cd-indicator-card">
            <span className="cd-indicator-label">Risco Geral</span>
            <div
              className="cd-indicator-value"
              style={{ color: riskColors[doc.executiveSummary?.overallRisk || 'medium'] }}
            >
              {(doc.executiveSummary?.overallRisk || 'medium').toUpperCase()}
            </div>
            <div className="cd-indicator-bar">
              <div
                className="cd-indicator-bar-fill"
                style={{
                  width: `${(4 - ['none', 'low', 'medium', 'high'].indexOf(doc.executiveSummary.overallRisk)) * 25}%`,
                  backgroundColor: riskColors[doc.executiveSummary.overallRisk]
                }}
              />
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="cd-section">
          <p className="cd-overview">{doc.executiveSummary.overview}</p>
        </div>

        {/* Critical Alerts */}
        {doc.executiveSummary?.criticalAlerts && doc.executiveSummary.criticalAlerts.length > 0 && (
          <div className="cd-alerts-section">
            <h4 className="cd-section-title danger">
              <Icons.AlertTriangle />
              Alertas Críticos
            </h4>
            <div className="cd-alerts-list">
              {doc.executiveSummary.criticalAlerts.map((alert, i) => (
                <div key={i} className="cd-alert-item">
                  {alert}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Findings */}
        <div className="cd-collapsible">
          <button
            className="cd-collapsible-header"
            onClick={() => toggleSection('keyFindings')}
          >
            <span className="cd-collapsible-icon">
              {expandedSections.has('keyFindings') ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
            </span>
            <h4>🔍 Principais Descobertas</h4>
            <span className="cd-badge">{doc.executiveSummary?.keyFindings?.length || 0}</span>
          </button>
          {expandedSections.has('keyFindings') && (
            <div className="cd-collapsible-content">
              <ul className="cd-findings-list">
                {(doc.executiveSummary?.keyFindings || []).map((finding, i) => (
                  <li key={i}>
                    <Icons.Check />
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Diff Stats */}
        <div className="cd-stats-grid">
          <div className="cd-stat-card added">
            <div className="cd-stat-value">+{doc.codeComparison?.diffStats?.linesAdded || 0}</div>
            <div className="cd-stat-label">Linhas Adicionadas</div>
          </div>
          <div className="cd-stat-card removed">
            <div className="cd-stat-value">-{doc.codeComparison?.diffStats?.linesRemoved || 0}</div>
            <div className="cd-stat-label">Linhas Removidas</div>
          </div>
          <div className="cd-stat-card modified">
            <div className="cd-stat-value">~{doc.codeComparison?.diffStats?.linesModified || 0}</div>
            <div className="cd-stat-label">Linhas Modificadas</div>
          </div>
          <div className="cd-stat-card total">
            <div className="cd-stat-value">
              {doc.codeComparison?.diffStats?.totalOriginal || 0} → {doc.codeComparison?.diffStats?.totalOptimized || 0}
            </div>
            <div className="cd-stat-label">Total de Linhas</div>
          </div>
        </div>

        {/* Warnings */}
        {doc.warnings && doc.warnings.length > 0 && (
          <div className="cd-warnings-section">
            <h4 className="cd-section-title warn">⚠️ Avisos</h4>
            {doc.warnings.map((warning, i) => (
              <div key={i} className="cd-warning-item">{warning}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Discoveries Tab (Nova aba com descobertas clicáveis)
  const renderDiscoveriesTab = () => {
    // Verificação de segurança
    if (!doc.executiveSummary?.keyFindings || doc.executiveSummary.keyFindings.length === 0) {
      return (
        <div className="cd-tab-content">
          <h3 className="cd-tab-title">🔍 Principais Descobertas</h3>
          <p className="cd-tab-subtitle">Nenhuma descoberta disponível.</p>
        </div>
      );
    }

    return (
      <div className="cd-tab-content">
        <h3 className="cd-tab-title">🔍 Principais Descobertas</h3>
        <p className="cd-tab-subtitle">
          Pontos críticos identificados durante a análise. Clique para ver detalhes completos.
        </p>

        <div className="cd-discoveries-grid">
          {doc.executiveSummary.keyFindings.map((finding, i) => {
            const isExpanded = expandedDiscovery === i;

            // Buscar mudanças relacionadas a esta descoberta
            const relatedChanges = (doc.codeComparison?.markers || []).filter(marker =>
              finding.toLowerCase().includes(marker.category.toLowerCase()) ||
              marker.description.toLowerCase().includes(finding.toLowerCase().split(' ').slice(0, 3).join(' ').toLowerCase())
            );

            return (
              <div key={i} className="cd-discovery-card">
                <button
                  className="cd-discovery-header"
                  onClick={() => setExpandedDiscovery(isExpanded ? null : i)}
                >
                  <div className="cd-discovery-number">{i + 1}</div>
                  <div className="cd-discovery-title">
                    {finding}
                  </div>
                  <span className={`cd-discovery-icon ${isExpanded ? 'expanded' : ''}`}>
                    {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="cd-discovery-content">
                    {relatedChanges.length > 0 ? (
                      <>
                        <h5 className="cd-discovery-subtitle">📍 Locais afetados no código:</h5>
                        <div className="cd-discovery-markers">
                          {relatedChanges.map((marker, idx) => (
                            <div key={idx} className={`cd-discovery-marker ${marker.type}`}>
                              <span className="cd-marker-badge-small">
                                L{marker.lineStart}-{marker.lineEnd}
                              </span>
                              <span className="cd-marker-type-small">{marker.type}</span>
                              <p className="cd-marker-desc-small">{marker.description}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="cd-discovery-empty">
                        Esta descoberta é uma observação geral sem marcadores específicos no código.
                      </p>
                    )}

                    {/* Recomendações relacionadas */}
                    {doc.recommendations.filter(rec =>
                      finding.toLowerCase().includes(rec.category.toLowerCase())
                    ).map((rec, idx) => (
                      <div key={idx} className="cd-discovery-recommendation">
                        <h5>💡 Recomendação relacionada:</h5>
                        <div className="cd-discovery-rec-card">
                          <div className="cd-discovery-rec-title">{rec.title}</div>
                          <div className="cd-discovery-rec-priority" style={{
                            backgroundColor: priorityColors[rec.priority || 'medium']
                          }}>
                            {(rec.priority || 'medium').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Gains Tab
  const renderGainsTab = () => {
    // Verificação de segurança
    if (!doc.qualitativeGains || doc.qualitativeGains.length === 0) {
      return (
        <div className="cd-tab-content">
          <h3 className="cd-tab-title">📈 Ganhos Qualitativos</h3>
          <p className="cd-tab-subtitle">Nenhum ganho qualitativo disponível.</p>
        </div>
      );
    }

    return (
      <div className="cd-tab-content">
        <h3 className="cd-tab-title">📈 Ganhos Qualitativos</h3>
        <p className="cd-tab-subtitle">
          Métricas de melhoria identificadas pela análise. Valores qualitativos, não percentuais exatos.
        </p>

        <div className="cd-gains-grid">
          {doc.qualitativeGains.map((gain, i) => (
            <div key={i} className="cd-gain-card">
              <div className="cd-gain-header">
                <span className="cd-gain-icon">{gain.icon}</span>
                <div className="cd-gain-title-wrap">
                  <h4>{gain.title}</h4>
                  <span className="cd-gain-category">{gain.category}</span>
                </div>
                <div
                  className="cd-confidence-badge"
                  style={{
                    backgroundColor: gain.confidence === 'high' ? 'rgba(0, 255, 157, 0.15)' :
                      gain.confidence === 'medium' ? 'rgba(255, 184, 0, 0.15)' :
                        'rgba(255, 42, 109, 0.15)',
                    color: gain.confidence === 'high' ? '#00ff9d' :
                      gain.confidence === 'medium' ? '#ffb800' : '#ff2a6d'
                  }}
                >
                  {gain.confidence === 'high' ? 'Alta' : gain.confidence === 'medium' ? 'Média' : 'Baixa'} confiança
                </div>
              </div>

              <p className="cd-gain-desc">{gain.description}</p>

              <div className="cd-gain-comparison">
                <div className="cd-gain-level">
                  <span className="cd-gain-level-label">Antes</span>
                  <LevelBar level={gain.beforeLevel} color={levelColors[gain.beforeLevel]} />
                </div>
                <div className="cd-gain-arrow">→</div>
                <div className="cd-gain-level">
                  <span className="cd-gain-level-label">Depois</span>
                  <LevelBar level={gain.afterLevel} color={levelColors[gain.afterLevel]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Mapeamento de nomes de fases para PT-BR
  const phaseNames: Record<string, string> = {
    'ingestion': 'Ingestão de Dados',
    'validation': 'Validação',
    'analysis': 'Análise de Código',
    'optimization': 'Otimização AINEX',
    'review': 'Revisão e Métricas',
    'documentation': 'Documentação',
    'delivery': 'Entrega Final'
  };

  const phaseIcons: Record<string, string> = {
    'ingestion': '📥',
    'validation': '🔍',
    'analysis': '📊',
    'optimization': '⚡',
    'review': '🔎',
    'documentation': '📝',
    'delivery': '📦'
  };

  // Render Timeline Tab - MELHORADO
  const renderTimelineTab = () => {
    // Verificação de segurança
    if (!doc?.cronogram || !doc?.phases || doc.phases.length === 0) {
      return (
        <div className="cd-tab-content">
          <h3 className="cd-tab-title">⏱️ Pipeline de Processamento</h3>
          <p className="cd-tab-subtitle">Nenhum dado de timeline disponível.</p>
        </div>
      );
    }

    return (
      <div className="cd-tab-content">
        <h3 className="cd-tab-title">⏱️ Pipeline de Processamento</h3>

        {/* Stats do Cronograma */}
        <div className="cd-cronogram-stats">
          <div className="cd-cron-stat highlight">
            <div className="cd-cron-label">⏱️ Tempo Total</div>
            <div className="cd-cron-value">{formatDuration(doc.cronogram.totalDuration)}</div>
          </div>
          <div className="cd-cron-stat">
            <div className="cd-cron-label">🚀 Mais Rápida</div>
            <div className="cd-cron-value">{phaseNames[doc.cronogram.fastestPhase] || doc.cronogram.fastestPhase}</div>
          </div>
          <div className="cd-cron-stat">
            <div className="cd-cron-label">🐢 Mais Lenta</div>
            <div className="cd-cron-value">{phaseNames[doc.cronogram.slowestPhase] || doc.cronogram.slowestPhase}</div>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="cd-pipeline-visual">
          {doc.phases.map((phase, i) => (
            <div key={i} className={`cd-pipeline-stage ${phase.status}`}>
              <div className="cd-pipeline-icon">{phaseIcons[phase.phase] || '📋'}</div>
              <div className="cd-pipeline-info">
                <span className="cd-pipeline-name">{phaseNames[phase.phase] || phase.phase}</span>
                {phase.durationMs !== undefined && phase.durationMs > 0 && (
                  <span className="cd-pipeline-time">{formatDuration(phase.durationMs)}</span>
                )}
              </div>
              {i < doc.phases.length - 1 && <div className="cd-pipeline-connector" />}
            </div>
          ))}
        </div>

        {/* Detalhes das Fases */}
        <div className="cd-phases-detail">
          <h4 className="cd-section-title">📋 Detalhes por Fase</h4>
          <div className="cd-timeline">
            {doc.phases.map((phase, i) => (
              <div key={i} className={`cd-timeline-item ${phase.status}`}>
                <div className="cd-timeline-dot">{phaseIcons[phase.phase] || '📋'}</div>
                <div className="cd-timeline-line" />
                <div className="cd-timeline-content">
                  <div className="cd-timeline-header">
                    <h4>{phaseNames[phase.phase] || phase.phase}</h4>
                    <span className={`cd-status-badge ${phase.status}`}>
                      {phase.status === 'completed' ? '✓ Concluído' : phase.status === 'running' ? '⏳ Em execução' : '○ Pendente'}
                    </span>
                    {phase.durationMs !== undefined && phase.durationMs > 0 && (
                      <span className="cd-timeline-duration">{formatDuration(phase.durationMs)}</span>
                    )}
                  </div>
                  {phase.messages.length > 0 && (
                    <ul className="cd-timeline-messages">
                      {phase.messages.map((msg, j) => (
                        <li key={j}>{msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Code Tab
  const renderCodeTab = () => {
    // Verificação de segurança
    if (!doc?.codeComparison) {
      return (
        <div className="cd-tab-content">
          <h3 className="cd-tab-title">💻 Comparação de Código</h3>
          <p className="cd-tab-subtitle">Nenhum dado de comparação disponível.</p>
        </div>
      );
    }

    return (
      <div className="cd-tab-content">
        <h3 className="cd-tab-title">💻 Comparação de Código</h3>

        {/* New: aligned, git-like side-by-side diff synchronized by rows */}
        <div className="cd-code-comparison aligned">
          <div className="cd-code-panel">
            <div className="cd-code-header original">
              <span className="cd-code-label">💻 Diff alinhado — Código Original ➜ Otimizado</span>
              <div className="cd-code-actions">
                <span className="cd-code-lines">{doc.codeComparison.diffStats.totalOriginal} → {doc.codeComparison.diffStats.totalOptimized} linhas</span>
                <button
                  className="cd-copy-btn"
                  onClick={async () => {
                    await copyToClipboard(doc.codeComparison?.originalCode || '');
                    const btn = document.querySelector('.cd-code-panel:first-child .cd-copy-btn') as HTMLButtonElement;
                    if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = '📋 Copiar', 2000); }
                  }}
                  title="Copiar código original"
                >
                  📋 Copiar Original
                </button>

                <button
                  className="cd-copy-btn"
                  onClick={async () => {
                    await copyToClipboard(doc.codeComparison?.optimizedCode || '');
                    const btn = document.querySelector('.cd-code-panel:first-child .cd-copy-btn:nth-of-type(2)') as HTMLButtonElement;
                    if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = '📋 Copiar Otimizado', 2000); }
                  }}
                  title="Copiar código otimizado"
                >
                  📋 Copiar Otimizado
                </button>
                <button
                  className="cd-copy-btn"
                  onClick={() => {
                    const txt = generateUnifiedDiff(alignedRows, 'original', 'optimized');
                    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `code-diff-${doc.id || 'report'}.diff`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  ⤓ Exportar Diff
                </button>
              </div>
            </div>

            <div className="cd-code-block" ref={alignedCodeRef}>
              <table className="cd-aligned-diff">
                <tbody>
                  {alignedRows.map((row, idx) => (
                    <tr key={`aligned-${idx}`} className={`aligned-row ${row.type}`}>
                      <td className="gutter left">{row.leftLine ?? ''}</td>
                      <td className="code left">
                        {row.type === 'modified' ? (
                          <div className="code-line-content" dangerouslySetInnerHTML={{ __html: intralineDiff(row.leftText || '', row.rightText || '').leftHtml }} />
                        ) : (
                          <div className="code-line-content code-content qlik-syntax" dangerouslySetInnerHTML={{ __html: highlightQlikCode(row.leftText || '') }} />
                        )}
                      </td>

                      <td className="diff-marker">
                        {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : row.type === 'modified' ? '~' : ''}
                      </td>

                      <td className="gutter right">{row.rightLine ?? ''}</td>
                      <td className="code right">
                        {row.type === 'modified' ? (
                          <div className="code-line-content" dangerouslySetInnerHTML={{ __html: intralineDiff(row.leftText || '', row.rightText || '').rightHtml }} />
                        ) : (
                          <div className="code-line-content code-content qlik-syntax" dangerouslySetInnerHTML={{ __html: highlightQlikCode(row.rightText || '') }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Code Markers */}
        {doc.codeComparison?.markers && doc.codeComparison.markers.length > 0 && (
          <div className="cd-markers-section">
            <h4 className="cd-section-title">🏷️ Marcadores de Código</h4>
            <div className="cd-markers-list">
              {doc.codeComparison.markers.map((marker, i) => (
                <div key={i} className={`cd-marker-item ${marker.type}`}>
                  <div className="cd-marker-badge">L{marker.lineStart}-{marker.lineEnd}</div>
                  <div className="cd-marker-type">{marker.type}</div>
                  <div className="cd-marker-category">{marker.category}</div>
                  <div className="cd-marker-desc">{marker.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Action Plan Tab
  const renderActionPlanTab = () => {
    const renderedTipCategories = new Set<string>();

    return (
      <div className="cd-tab-content">
        <h3 className="cd-tab-title">📋 Plano de Ação</h3>
        <p className="cd-tab-subtitle">
          Prioridades objetivas. Onde a IA já ajustou, apenas revise e registre no Qlik.
        </p>

        <div className="cd-recommendations-list cd-action-plan-list">
          {(doc.recommendations || []).map((rec, i) => {
            const relatedTips = tipsByCategory[rec.category] || [];
            const showTips = relatedTips.length > 0 && !renderedTipCategories.has(rec.category);
            if (showTips) {
              renderedTipCategories.add(rec.category);
            }

            const priority = rec.priority || 'medium';

            return (
              <div key={i} className={`cd-recommendation-card ${priority}`}>
                <div className="cd-rec-header">
                  <div
                    className="cd-rec-priority"
                    style={{ backgroundColor: priorityColors[priority] }}
                  >
                    {priority.toUpperCase()}
                  </div>
                  <h4>{rec.title}</h4>
                  <span className="cd-rec-category">{rec.category}</span>
                </div>

                <p className="cd-rec-description" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '12px 0' }}>
                  {rec.description}
                </p>

                <div className="cd-rec-metrics compact">
                  <div className="cd-rec-metric">
                    <span className="cd-rec-metric-label">Esforco</span>
                    <span className="cd-rec-metric-value">{rec.effort}</span>
                  </div>
                  <div className="cd-rec-metric">
                    <span className="cd-rec-metric-label">Impacto</span>
                    <span className="cd-rec-metric-value">{rec.impact}</span>
                  </div>
                </div>

                <div className="cd-rec-actions">
                  <div className="cd-rec-actions-header">
                    <h5>Próximos passos</h5>
                    <button
                      className="cd-copy-btn"
                      onClick={() =>
                        copyTextToClipboard(
                          `${rec.title}\n${rec.description}\nAções:\n- ${(rec.actionItems || []).join('\n- ')}`,
                          `Plano "${rec.title}"`
                        )
                      }
                    >
                      <Icons.Clipboard />
                      Copiar plano
                    </button>
                  </div>
                  <ul>
                    {(rec.actionItems || []).map((action, j) => (
                      <li key={j}>
                        <Icons.ChevronRight />
                        <span className="cd-action-text">{action}</span>
                        <button
                          className="cd-inline-copy"
                          aria-label={`Copiar ação ${j + 1}`}
                          onClick={() => copyTextToClipboard(action, "Ação")}
                        >
                          <Icons.Clipboard />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {showTips && (
                  <div className="cd-rec-tips">
                    <span className="cd-rec-tips-label">Refinar</span>
                    <ul>
                      {relatedTips.map((tip, tipIndex) => (
                        <li key={`${tip.title}-${tipIndex}`}>
                          <span className="cd-tip-inline-icon">{tip.icon}</span>
                          <span className="cd-tip-inline-text">{tip.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {standaloneTips.length > 0 && (
          <div className="cd-quick-tips">
            <h4>Checklist rapido</h4>
            <ul>
              {standaloneTips.map((tip, i) => (
                <li key={i}>
                  <span className="cd-tip-inline-icon">{tip.icon}</span>
                  <span className="cd-tip-inline-text">{tip.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {doc.fullDocumentation && (
          <div className="cd-full-doc-section compact">
            <h4 className="cd-section-title">📄 Documentação Completa</h4>
            <div className="cd-markdown-preview">
              <SimpleMarkdown content={doc.fullDocumentation} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cd-viewer-overlay">
      <div className="cd-viewer-container">
        {/* Header */}
        <header className="cd-viewer-header">
          <div className="cd-header-left">
            <div className="cd-header-brand">
              <span className="cd-brand-icon">📊</span>
              <div>
                <h1>Documento de Consultoria</h1>
                <span className="cd-doc-id">ID: {doc.id.substring(0, 8)}</span>
              </div>
            </div>
          </div>
          <div className="cd-header-right">
            <button
              className="cd-btn secondary"
              onClick={() => copyTextToClipboard(doc.codeComparison?.optimizedCode || '', 'Script Otimizado')}
              title="Copiar Script Otimizado"
            >
              <Icons.Clipboard />
              Copiar Script
            </button>
            <button className="cd-btn secondary">
              <Icons.Download />
              Exportar
            </button>
            {onClose && (
              <button className="cd-btn ghost" onClick={onClose}>
                <Icons.Close />
              </button>
            )}
          </div>
        </header>

        {/* Tabs Navigation */}
        <nav className="cd-tabs-nav">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              className={`cd-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="cd-tab-icon">{tab.icon}</span>
              <span className="cd-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="cd-content-area">
          {copyFeedback && <div className="cd-copy-toast">{copyFeedback}</div>}
          {activeTab === 'summary' && renderSummaryTab()}
          {activeTab === 'discoveries' && renderDiscoveriesTab()}
          {activeTab === 'gains' && renderGainsTab()}
          {activeTab === 'timeline' && renderTimelineTab()}
          {activeTab === 'code' && renderCodeTab()}
          {activeTab === 'actions' && renderActionPlanTab()}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .cd-viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cd-viewer-container {
          width: 98%;
          max-width: 1800px;
          max-height: 95vh;
          background: #0a0d14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        /* Header */
        .cd-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          background: rgba(15, 20, 35, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cd-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cd-header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cd-brand-icon {
          font-size: 2rem;
        }

        .cd-header-brand h1 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .cd-doc-id {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-family: 'JetBrains Mono', monospace;
        }

        .cd-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cd-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }

        .cd-btn.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cd-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--primary);
        }

        .cd-btn.ghost {
          background: transparent;
          color: var(--text-secondary);
          padding: 10px;
        }

        .cd-btn.ghost:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }

        /* Tabs */
        .cd-tabs-nav {
          display: flex;
          gap: 4px;
          padding: 12px 28px;
          background: rgba(10, 13, 20, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          overflow-x: auto;
        }

        .cd-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          font-family: inherit;
        }

        .cd-tab-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }

        .cd-tab-btn.active {
          color: var(--primary);
          background: rgba(0, 242, 255, 0.1);
        }

        .cd-tab-icon {
          font-size: 1.1rem;
        }

        /* Content Area */
        .cd-content-area {
          flex: 1;
          overflow-y: auto;
          padding: 28px;
        }

        .cd-tab-content {
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cd-tab-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .cd-tab-subtitle {
          color: var(--text-secondary);
          margin: 0 0 24px 0;
          font-size: 0.9rem;
        }

        /* Executive Summary Styles */
        .cd-exec-header {
          margin-bottom: 24px;
        }

        .cd-exec-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .cd-exec-title-row h2 {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0;
        }

        .cd-action-badge {
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cd-exec-meta {
          display: flex;
          gap: 20px;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        /* Indicators */
        .cd-indicators-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .cd-indicator-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
        }

        .cd-indicator-label {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cd-indicator-value {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 8px 0;
          font-family: 'JetBrains Mono', monospace;
        }

        .cd-indicator-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .cd-indicator-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        /* Sections */
        .cd-section {
          margin-bottom: 24px;
        }

        .cd-overview {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-main);
          margin: 0;
        }

        .cd-section-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cd-section-title.danger {
          color: var(--danger);
        }

        .cd-section-title.warn {
          color: var(--warning);
        }

        /* Alerts */
        .cd-alerts-section {
          background: rgba(255, 42, 109, 0.05);
          border: 1px solid rgba(255, 42, 109, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .cd-alert-item {
          padding: 8px 12px;
          background: rgba(255, 42, 109, 0.1);
          border-radius: 6px;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }

        .cd-alert-item:last-child {
          margin-bottom: 0;
        }

        /* Collapsible */
        .cd-collapsible {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .cd-collapsible-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }

        .cd-collapsible-header:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .cd-collapsible-header h4 {
          flex: 1;
          text-align: left;
          margin: 0;
          font-size: 0.95rem;
        }

        .cd-collapsible-icon {
          color: var(--text-secondary);
        }

        .cd-badge {
          background: rgba(0, 242, 255, 0.15);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .cd-collapsible-content {
          padding: 0 16px 16px;
        }

        .cd-findings-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .cd-findings-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 0.9rem;
        }

        .cd-findings-list li:last-child {
          border-bottom: none;
        }

        .cd-findings-list svg {
          color: var(--success);
          flex-shrink: 0;
        }

        /* Stats Grid */
        .cd-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .cd-stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }

        .cd-stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
        }

        .cd-stat-card.added .cd-stat-value { color: var(--success); }
        .cd-stat-card.removed .cd-stat-value { color: var(--danger); }
        .cd-stat-card.modified .cd-stat-value { color: var(--warning); }
        .cd-stat-card.total .cd-stat-value { color: var(--primary); }

        .cd-stat-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        /* Warnings */
        .cd-warnings-section {
          background: rgba(255, 184, 0, 0.05);
          border: 1px solid rgba(255, 184, 0, 0.2);
          border-radius: 12px;
          padding: 16px;
        }

        .cd-warning-item {
          font-size: 0.9rem;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 184, 0, 0.1);
        }

        .cd-warning-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        /* Discoveries Tab Styles */
        .cd-discoveries-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cd-discovery-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
        }

        .cd-discovery-card:hover {
          border-color: rgba(0, 242, 255, 0.3);
        }

        .cd-discovery-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
          font-family: inherit;
          color: inherit;
        }

        .cd-discovery-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .cd-discovery-number {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.2), rgba(112, 0, 255, 0.2));
          border: 1px solid rgba(0, 242, 255, 0.4);
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--primary);
          flex-shrink: 0;
        }

        .cd-discovery-title {
          flex: 1;
          font-size: 0.95rem;
          line-height: 1.5;
          color: var(--text-main);
        }

        .cd-discovery-icon {
          color: var(--text-secondary);
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .cd-discovery-icon.expanded {
          transform: rotate(0deg);
        }

        .cd-discovery-content {
          padding: 0 20px 20px 20px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cd-discovery-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          font-weight: 600;
        }

        .cd-discovery-markers {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .cd-discovery-marker {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border-left: 3px solid;
        }

        .cd-discovery-marker.improvement { border-left-color: var(--success); }
        .cd-discovery-marker.warning { border-left-color: var(--warning); }
        .cd-discovery-marker.removed { border-left-color: var(--danger); }
        .cd-discovery-marker.added { border-left-color: var(--success); }
        .cd-discovery-marker.modified { border-left-color: var(--primary); }

        .cd-marker-badge-small {
          background: rgba(255, 255, 255, 0.05);
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .cd-marker-type-small {
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--text-tertiary);
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }

        .cd-marker-desc-small {
          flex: 1;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .cd-discovery-empty {
          font-size: 0.85rem;
          color: var(--text-tertiary);
          font-style: italic;
          margin: 0;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .cd-discovery-recommendation {
          margin-top: 12px;
          padding: 12px;
          background: rgba(0, 242, 255, 0.05);
          border: 1px solid rgba(0, 242, 255, 0.15);
          border-radius: 8px;
        }

        .cd-discovery-recommendation h5 {
          font-size: 0.75rem;
          color: var(--primary);
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .cd-discovery-rec-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cd-discovery-rec-title {
          flex: 1;
          font-size: 0.85rem;
          color: var(--text-main);
        }

        .cd-discovery-rec-priority {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          color: #000;
        }

        /* Gains Grid */
        .cd-gains-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 16px;
        }

        .cd-gain-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 20px;
          transition: all 0.3s;
        }

        .cd-gain-card:hover {
          border-color: rgba(0, 242, 255, 0.3);
          transform: translateY(-2px);
        }

        .cd-gain-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .cd-gain-icon {
          font-size: 1.5rem;
        }

        .cd-gain-title-wrap {
          flex: 1;
        }

        .cd-gain-title-wrap h4 {
          margin: 0;
          font-size: 1rem;
        }

        .cd-gain-category {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .cd-confidence-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 600;
        }

        .cd-gain-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .cd-gain-comparison {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cd-gain-level {
          flex: 1;
        }

        .cd-gain-level-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
        }

        .cd-gain-arrow {
          color: var(--text-tertiary);
          font-size: 1.2rem;
        }

        .level-bar-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .level-bar-track {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .level-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .level-bar-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: capitalize;
          min-width: 60px;
        }

        /* Timeline */
        .cd-cronogram-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          flex-wrap: wrap;
        }

        .cd-cron-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
        }

        .cd-cron-stat.highlight {
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.1), rgba(112, 0, 255, 0.1));
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid rgba(0, 242, 255, 0.2);
        }

        .cd-cron-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .cd-cron-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary);
        }

        .cd-cron-value.large {
          font-size: 1.5rem;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Pipeline Visual */
        .cd-pipeline-visual {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          background: rgba(15, 20, 35, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          margin-bottom: 24px;
          overflow-x: auto;
        }

        .cd-pipeline-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
          min-width: 100px;
        }

        .cd-pipeline-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: all 0.3s;
        }

        .cd-pipeline-stage.completed .cd-pipeline-icon {
          background: rgba(0, 255, 157, 0.1);
          border-color: var(--success);
        }

        .cd-pipeline-stage.running .cd-pipeline-icon {
          background: rgba(255, 184, 0, 0.1);
          border-color: var(--warning);
          animation: pulse 1.5s infinite;
        }

        .cd-pipeline-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .cd-pipeline-name {
          font-size: 0.7rem;
          font-weight: 600;
          text-align: center;
          max-width: 90px;
        }

        .cd-pipeline-time {
          font-size: 0.65rem;
          color: var(--success);
          font-family: 'JetBrains Mono', monospace;
          background: rgba(0, 255, 157, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .cd-pipeline-connector {
          position: absolute;
          right: -40px;
          top: 24px;
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), rgba(0, 255, 157, 0.3));
        }

        .cd-pipeline-stage.completed + .cd-pipeline-stage .cd-pipeline-connector,
        .cd-pipeline-stage.completed .cd-pipeline-connector {
          background: linear-gradient(90deg, var(--success), rgba(0, 255, 157, 0.3));
        }

        /* Phases Detail */
        .cd-phases-detail {
          margin-top: 16px;
        }

        .cd-timeline {
          position: relative;
          padding-left: 40px;
        }

        .cd-timeline-item {
          position: relative;
          padding-bottom: 24px;
        }

        .cd-timeline-item:last-child {
          padding-bottom: 0;
        }

        .cd-timeline-item:last-child .cd-timeline-line {
          display: none;
        }

        .cd-timeline-dot {
          position: absolute;
          left: -40px;
          top: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .cd-timeline-item.completed .cd-timeline-dot {
          background: rgba(0, 255, 157, 0.1);
          border-color: var(--success);
        }

        .cd-timeline-item.running .cd-timeline-dot {
          background: rgba(255, 184, 0, 0.1);
          border-color: var(--warning);
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .cd-timeline-line {
          position: absolute;
          left: -27px;
          top: 32px;
          bottom: 0;
          width: 2px;
          background: rgba(255, 255, 255, 0.1);
        }

        .cd-timeline-item.completed .cd-timeline-line {
          background: var(--success);
        }

        .cd-timeline-content {
          padding-left: 16px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
          padding: 12px 16px;
        }

        .cd-timeline-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .cd-timeline-header h4 {
          margin: 0;
          font-size: 0.95rem;
          text-transform: capitalize;
        }

        .cd-status-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .cd-status-badge.completed {
          background: rgba(0, 255, 157, 0.15);
          color: var(--success);
        }

        .cd-status-badge.running {
          background: rgba(255, 184, 0, 0.15);
          color: var(--warning);
        }

        .cd-status-badge.pending {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-tertiary);
        }

        .cd-timeline-duration {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-family: 'JetBrains Mono', monospace;
        }

        .cd-timeline-messages {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .cd-timeline-messages li {
          font-size: 0.8rem;
          color: var(--text-secondary);
          padding: 4px 0;
        }

        /* Events */
        .cd-events-section {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cd-events-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cd-event-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          font-size: 0.8rem;
        }

        .cd-event-icon {
          font-size: 1rem;
        }

        .cd-event-phase {
          background: rgba(0, 242, 255, 0.1);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .cd-event-action {
          flex: 1;
          color: var(--text-main);
        }

        .cd-event-detail {
          color: var(--text-tertiary);
          font-size: 0.75rem;
        }

        /* Code Comparison */
        .cd-code-comparison {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .cd-code-panel {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
        }

        .cd-code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cd-code-header.original {
          background: rgba(255, 107, 53, 0.1);
        }

        .cd-code-header.optimized {
          background: rgba(0, 255, 157, 0.1);
        }

        .cd-code-label {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .cd-code-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cd-copy-btn {
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 600;
          font-family: inherit;
          background: rgba(0, 242, 255, 0.1);
          border: 1px solid rgba(0, 242, 255, 0.3);
          border-radius: 6px;
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .cd-copy-btn:hover {
          background: rgba(0, 242, 255, 0.2);
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .cd-code-lines {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          font-family: 'JetBrains Mono', monospace;
        }

        .cd-code-block {
          flex: 1;
          overflow: auto;
          max-height: 75vh;
          min-height: 400px;
          background-color: #1e1e1e;
        }

        .cd-code-block::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .cd-code-block::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        .cd-code-block::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 5px;
          border: 2px solid #1e1e1e;
        }
        .cd-code-block::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        /* Aligned diff specific styles */
        .cd-code-comparison.aligned { display: block; }
        .cd-aligned-diff { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 13px; table-layout: fixed; }
        .cd-aligned-diff tr { vertical-align: top; }
        .cd-aligned-diff .gutter { width: 50px; padding: 6px 8px; color: #9b9b9b; text-align: right; border-right: 1px solid rgba(255,255,255,0.03); user-select: none; }
        .cd-aligned-diff .code { padding: 6px 12px; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }
        .cd-aligned-diff .code.left { border-right: 1px solid rgba(255,255,255,0.03); }
        .cd-aligned-diff .diff-marker { width: 30px; text-align: center; color: var(--text-tertiary); font-weight: 700; user-select: none; }
        .aligned-row.added { background: rgba(0,255,157,0.05); }
        .aligned-row.removed { background: rgba(255,42,109,0.04); }
        .aligned-row.modified { background: rgba(255,184,0,0.04); }
        .aligned-row.unchanged:hover { background: rgba(255,255,255,0.018); }
        .cd-del { text-decoration: line-through; color: rgba(255,42,109,0.95); background: rgba(255,42,109,0.03); padding: 0 2px; border-radius: 2px; }
        .cd-ins { background: rgba(0,255,157,0.06); color: rgba(0,200,120,1); padding: 0 2px; border-radius: 2px; }

        /* VS Code-like Table Styles for Consultancy Viewer */
        .code-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'JetBrains Mono', 'Consolas', monospace;
          font-size: 13px;
          line-height: 1.5;
          background-color: #1e1e1e;
        }

        .code-table tr {
          background: transparent;
        }

        .code-table tr:hover {
          background-color: #2a2d2e;
        }

        .code-table td {
          padding: 0;
          vertical-align: top;
        }

        .line-number-cell {
          width: 50px;
          min-width: 50px;
          text-align: right;
          padding-right: 15px !important;
          color: #858585;
          background-color: #1e1e1e;
          border-right: 1px solid #333;
          user-select: none;
          white-space: nowrap;
          font-size: 12px;
          line-height: 1.6;
        }

        .line-number-cell::before {
          content: attr(data-line-number);
        }

        .code-cell {
          padding-left: 15px !important;
          color: #d4d4d4;
          background-color: #1e1e1e;
          width: 100%;
          white-space: pre;
          word-break: keep-all;
        }

        .code-line-content {
          min-height: 1.5em;
          line-height: 1.6;
        }

        /* VS Code Syntax Highlighting */
        .code-content.qlik-syntax .syntax-keyword { color: #569cd6 !important; font-weight: bold; }
        .code-content.qlik-syntax .syntax-function { color: #dcdcaa !important; }
        .code-content.qlik-syntax .syntax-string { color: #ce9178 !important; }
        .code-content.qlik-syntax .syntax-comment { color: #6a9955 !important; font-style: italic; }
        .code-content.qlik-syntax .syntax-number { color: #b5cea8 !important; }
        .code-content.qlik-syntax .syntax-operator { color: #d4d4d4 !important; }

        .cd-code-line-content .qlik-number {
          color: #f78c6c;
        }

        .cd-code-line-content .qlik-identifier {
          color: #82aaff;
        }

        .cd-code-line.code-added {
          background: rgba(0, 255, 157, 0.1);
          border-color: var(--success);
        }

        .cd-code-line.code-removed {
          background: rgba(255, 42, 109, 0.12);
          border-color: var(--danger);
        }

        .cd-code-line.code-modified {
          background: rgba(255, 184, 0, 0.12);
          border-color: var(--warning);
        }

        .cd-code-line.code-warning {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--warning);
        }

        .cd-code-line.code-improvement {
          background: rgba(0, 242, 255, 0.08);
          border-color: var(--primary);
        }

        .cd-code-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
          font-size: 1.5rem;
        }

        /* Markers */
        .cd-markers-section {
          margin-top: 24px;
        }

        .cd-markers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cd-marker-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border-left: 3px solid;
        }

        .cd-marker-item.improvement { border-left-color: var(--success); }
        .cd-marker-item.warning { border-left-color: var(--warning); }
        .cd-marker-item.removed { border-left-color: var(--danger); }
        .cd-marker-item.added { border-left-color: var(--success); }
        .cd-marker-item.modified { border-left-color: var(--primary); }

        .cd-marker-badge {
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .cd-marker-type {
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--text-tertiary);
        }

        .cd-marker-category {
          font-size: 0.7rem;
          padding: 2px 6px;
          background: rgba(0, 242, 255, 0.1);
          color: var(--primary);
          border-radius: 4px;
        }

        .cd-marker-desc {
          flex: 1;
          font-size: 0.85rem;
          color: var(--text-main);
        }

        /* Recommendations */
        .cd-recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cd-recommendation-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 20px;
          border-left: 4px solid;
        }

        .cd-recommendation-card.critical { border-left-color: #ff2a6d; }
        .cd-recommendation-card.high { border-left-color: #ff6b35; }
        .cd-recommendation-card.medium { border-left-color: #ffb800; }
        .cd-recommendation-card.low { border-left-color: #00f2ff; }

        .cd-rec-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .cd-rec-priority {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          color: #000;
        }

        .cd-rec-header h4 {
          flex: 1;
          margin: 0;
          font-size: 1rem;
        }

        .cd-rec-category {
          font-size: 0.7rem;
          color: var(--text-tertiary);
        }

        .cd-rec-desc {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .cd-rec-metrics {
          display: flex;
          gap: 24px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .cd-rec-metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cd-rec-metric-label {
          font-size: 0.65rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .cd-rec-metric-value {
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .cd-rec-actions h5 {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }

        .cd-rec-actions-header {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .cd-copy-btn,
        .cd-inline-copy {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 242, 255, 0.08);
          border: 1px solid rgba(0, 242, 255, 0.25);
          color: var(--text-main);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cd-copy-btn:hover,
        .cd-inline-copy:hover {
          background: rgba(0, 242, 255, 0.14);
        }

        .cd-inline-copy {
          padding: 4px 8px;
          border-radius: 6px;
          border-style: dashed;
        }

        .cd-rec-actions ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .cd-rec-actions li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
          justify-content: space-between;
        }

        .cd-rec-actions svg {
          color: var(--primary);
          flex-shrink: 0;
        }

        .cd-action-text {
          flex: 1;
        }

        .cd-action-plan-list .cd-recommendation-card {
          border-left-width: 3px;
        }

        .cd-rec-metrics.compact {
          margin-bottom: 12px;
        }

        .cd-copy-toast {
          background: rgba(0, 255, 157, 0.12);
          border: 1px solid rgba(0, 255, 157, 0.25);
          color: var(--text-main);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 12px;
          font-size: 0.85rem;
        }

        .cd-rec-tips {
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .cd-rec-tips-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--text-tertiary);
        }

        .cd-rec-tips ul {
          list-style: none;
          padding: 0;
          margin: 8px 0 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
        }

        .cd-tip-inline-icon {
          margin-right: 6px;
        }

        .cd-tip-inline-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .cd-quick-tips {
          margin-top: 20px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.25);
        }

        .cd-quick-tips h4 {
          margin: 0 0 8px 0;
          font-size: 0.9rem;
        }

        .cd-quick-tips ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cd-quick-tips li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .cd-full-doc-section.compact {
          margin-top: 20px;
        }

        /* Full Documentation */
        .cd-full-doc-section {
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cd-markdown-preview {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .cd-markdown-preview pre {
          margin: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          line-height: 1.6;
          white-space: pre-wrap;
          color: var(--text-secondary);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .cd-viewer-container {
            max-height: 95vh;
            border-radius: 16px;
          }

          .cd-content-area {
            padding: 20px;
          }

          .cd-indicators-row {
            grid-template-columns: 1fr;
          }

          .cd-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .cd-gains-grid {
            grid-template-columns: 1fr;
          }

          .cd-code-comparison {
            grid-template-columns: 1fr;
          }

          .cd-code-divider {
            padding: 8px 0;
          }

          .cd-tips-grid {
            grid-template-columns: 1fr;
          }

          .cd-tab-label {
            display: none;
          }

          .cd-tab-btn {
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ConsultancyDocumentViewer;
