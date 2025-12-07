import { Router } from "express";

import { asyncHandler } from "../middleware/asyncHandler";
import { formatQlikScript } from "../services/qlikScriptFormatter";
import { qlikFormatterSchema } from "../validators/requestSchemas";

export const toolsRouter = Router();

toolsRouter.post(
  "/qlik-formatter",
  asyncHandler(async (req, res) => {
    const payload = qlikFormatterSchema.parse(req.body);

    const result = await formatQlikScript(payload.script);

    res.json({
      formattedScript: result.formattedScript,
      notes: result.notes,
      provider: result.provider
    });
  })
);

// Stream progress updates using server-sent events
toolsRouter.post(
  "/qlik-formatter/stream",
  asyncHandler(async (req, res) => {
    const payload = qlikFormatterSchema.parse(req.body);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Garante envio imediato dos headers em proxies como Nginx/Heroku
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    const send = (event: string, data: unknown) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        // ignore write errors — connection may be closed by client
      }
    };

    const keepAliveTimer = setInterval(() => {
      try {
        res.write(`: keep-alive\n\n`);
      } catch { }
    }, 15000);

    // Encerrar de forma limpa se o cliente fechar a conexão
    req.on("close", () => {
      clearInterval(keepAliveTimer);
      try { res.end(); } catch { }
    });

    try {
      // Progress simulation for UX
      send("progress", { percent: 10, message: "Iniciando formatação" });
      await new Promise(r => setTimeout(r, 100));

      send("progress", { percent: 50, message: "Processando script" });
      const result = await formatQlikScript(payload.script);

      send("progress", { percent: 90, message: "Finalizando" });
      await new Promise(r => setTimeout(r, 50));

      send("result", result);
      send("done", { status: "ok" });
      res.end();
    } catch (error) {
      send("error", { error: error instanceof Error ? error.message : String(error) });
      try {
        res.end();
      } catch { }
    } finally {
      clearInterval(keepAliveTimer);
    }
  })
);

