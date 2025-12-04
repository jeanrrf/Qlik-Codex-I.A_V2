import { z } from "zod";

const MAX_SCRIPT_SIZE = 5 * 1024 * 1024; // 5MB
const DANGEROUS_PATTERNS = /<script|javascript:|onerror=|onclick=|onload=/i;

export const optimizeScriptSchema = z
  .object({
    script: z
      .string()
      .min(10, "Script deve ter pelo menos 10 caracteres")
      .max(MAX_SCRIPT_SIZE, `Script muito grande (máximo: ${MAX_SCRIPT_SIZE / 1024 / 1024}MB)`)
      .refine(
        (script) => !DANGEROUS_PATTERNS.test(script),
        "Script contém padrões potencialmente perigosos"
      ),
    mode: z.enum(["ultra-expert", "nvidia-fast"]).default("ultra-expert"),
    llmProvider: z.enum(["google", "nvidia", "ainex"]).optional(),
    llmModel: z.string().min(1).optional(),
    userId: z.string().optional(),
    // ✨ FREE TIER: Campos de truncamento inteligente (adicionados pelo middleware authMiddleware)
    applySmartTruncation: z.boolean().optional(),
    lineLimit: z.number().positive().optional()
  })
  .refine(
    (data) => !data.llmModel || data.llmProvider === "nvidia" || data.mode === "nvidia-fast",
    {
      path: ["llmModel"],
      message: "llmModel so pode ser informado quando o provider for NVIDIA ou modo nvidia-fast"
    }
  );

export type OptimizeScriptPayload = z.infer<typeof optimizeScriptSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "Nome eh obrigatorio."),
  email: z
    .string()
    .email("Email invalido.")
    .min(5, "Email eh obrigatorio."),
  company: z.string().min(2, "Empresa eh obrigatoria."),
  message: z.string().max(4000).optional()
});

export const qlikFormatterSchema = z.object({
  script: z
    .string()
    .min(10, "Script deve ter pelo menos 10 caracteres")
    .max(MAX_SCRIPT_SIZE, `Script muito grande (máximo: ${MAX_SCRIPT_SIZE / 1024 / 1024}MB)`),
  model: z.string().min(1).optional()
});

export type QlikFormatterPayload = z.infer<typeof qlikFormatterSchema>;

export const generateDocSchema = z.object({
  script: z
    .string()
    .min(10, "Script deve ter pelo menos 10 caracteres")
    .max(MAX_SCRIPT_SIZE, `Script muito grande (máximo: ${MAX_SCRIPT_SIZE / 1024 / 1024}MB)`),
  llmProvider: z.enum(["google", "nvidia", "ainex"]).optional(),
  llmModel: z.string().optional()
});

export type GenerateDocPayload = z.infer<typeof generateDocSchema>;
