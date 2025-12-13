import React from 'react';
import { Icons } from './Icons';
import { analyzeScriptComplexity } from '../lib/scriptAnalysis';
import { ScriptAnalysisData, UploadedFileMeta } from '../types/ui';

interface ScriptAnalysisCardProps {
  script: string;
  uploadMeta: UploadedFileMeta | null;
  optimization: {
    scriptAnalysis?: ScriptAnalysisData | null;
  };
}

export const ScriptAnalysisCard: React.FC<ScriptAnalysisCardProps> = ({ script, uploadMeta, optimization }) => {
  if (!script?.trim() && !uploadMeta) return null;

  const metrics = analyzeScriptComplexity(script);

  return (
    <div className="ctrl-card analysis-card">
      <div className="ctrl-header">
        <Icons.Analytics />
        <span>Análise do Script</span>
      </div>
      <div className="analysis-metrics">
        <div className="analysis-metric">
          <span className="analysis-label">Tokens Est.</span>
          <span className="analysis-value">
            {optimization.scriptAnalysis?.estimatedTokens
              ? `${(optimization.scriptAnalysis.estimatedTokens / 1000).toFixed(1)}K`
              : `${(metrics.estimatedTokens / 1000).toFixed(1)}K`}
          </span>
        </div>
        {optimization.scriptAnalysis?.strategy && (
          <div className="analysis-metric">
            <span className="analysis-label">Estratégia</span>
            <span className="analysis-value strategy-value">
              {optimization.scriptAnalysis.strategy === 'full' ? 'Completa'
                : 'Otimizada'}
            </span>
          </div>
        )}
        {optimization.scriptAnalysis?.qvdOperations && (
          <div className="analysis-metric qvd">
            <span className="analysis-label">QVD Ops</span>
            <span className="analysis-value qvd-value">
              L:{optimization.scriptAnalysis.qvdOperations.reads} G:{optimization.scriptAnalysis.qvdOperations.writes}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
