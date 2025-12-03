import { onRequest } from "firebase-functions/v2/https";
import app from "./index";

// Configuração para Firebase Functions (Gen 2)
// Aumentamos o timeout e memória para lidar com processamento de IA
export const api = onRequest(
  {
    timeoutSeconds: 300, // 5 minutos
    memory: "1GiB",
    region: "us-central1", // ou southamerica-east1 se preferir latência menor
    cors: true,
  },
  app
);
