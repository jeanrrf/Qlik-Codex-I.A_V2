export const API_BASE_URL = import.meta.env.VITE_API_URL || "";
export const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";

// Feature flag para usar Convex ou API tradicional
export const USE_CONVEX = import.meta.env.VITE_USE_CONVEX === "true";
