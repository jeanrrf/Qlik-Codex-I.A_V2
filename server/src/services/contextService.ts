// logger intentionally removed - context is static and doesn't need logging

export interface ProjectContext {
  files: { name: string; content: string }[];
  summary: string;
}

// Context notebooks desativados: manter tipo mas não carregar nada
export class ContextService {
  async getProjectContext(): Promise<ProjectContext> {
    // Contexto de projeto via notebooks foi desativado para simplificar o prompt
    // e evitar dependência em arquivos externos. Mantemos a API, mas retornamos
    // contexto vazio para não afetar os agentes existentes.
    return { files: [], summary: '' };
  }
}

export const contextService = new ContextService();
