import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export function useTools() {
  const generateDocumentation = useAction(api.documentation.generateDocumentation);
  const generateExplanation = useAction(api.explanation.generateExplanation);
  const runReview = useAction(api.review.runReview);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDocumentation = async (script: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateDocumentation({ script });
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExplanation = async (
    changes: any[],
    breakingRisk: string,
    mode: string,
    reviewSummary?: string,
    metricsEstimate?: any
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateExplanation({
        changes,
        breakingRisk,
        mode,
        reviewSummary,
        metricsEstimate
      });
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRunReview = async (original: string, optimized: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await runReview({ original, optimized });
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateDocumentation: handleGenerateDocumentation,
    generateExplanation: handleGenerateExplanation,
    runReview: handleRunReview,
    loading,
    error
  };
}
