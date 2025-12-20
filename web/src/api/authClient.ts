/**
 * Authentication API Client
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const AUTH_TIMEOUT_MS = 5000; // 5 seconds timeout for auth requests

/**
 * Fetch with timeout to prevent long hangs when backend is unavailable
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = AUTH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildHeaders(token?: string, isGet = false): Record<string, string> {
  const headers: Record<string, string> = isGet ? {} : { ...JSON_HEADERS };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function resolveUrl(endpoint: string): string {
  // Remove leading slash from endpoint if API_BASE ends with slash, or ensure slash if not
  // But here API_BASE is likely "/api" or "https://..."
  // If API_BASE is "/api", and endpoint is "/auth/status", we want "/api/auth/status"
  // If API_BASE is empty, we want "/api/auth/status" (legacy)

  // Simplest way:
  // If API_BASE is "/api", we assume endpoints passed here are relative to /api like "/auth/status"
  // But the existing code passes "/api/auth/status".
  // So we need to be careful.

  // Let's strip "/api" prefix from endpoint if it exists, to avoid duplication
  const cleanEndpoint = endpoint.startsWith("/api/") ? endpoint.substring(4) : endpoint;

  // Ensure API_BASE doesn't end with slash
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;

  return `${base}${cleanEndpoint.startsWith("/") ? cleanEndpoint : "/" + cleanEndpoint}`;
}


export interface GoogleAuthResponse {
  authUrl: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export interface UserResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    avatarUrl: string | null;
    createdAt: string;
    lastLogin: string | null;
  };
}

export interface TokenLoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tokens: {
    accessToken: string;
    expiresIn: number;
  };
}

/**
 * Inicia fluxo de autenticação Google
 */
export async function getGoogleAuthUrl(token?: string): Promise<string> {
  const response = await fetch(resolveUrl("/auth/google"), {
    credentials: "include",
    headers: buildHeaders(token, true)
  });

  if (!response.ok) {
    throw new Error("Failed to get Google auth URL");
  }

  const data: GoogleAuthResponse = await response.json();
  return data.authUrl;
}

/**
 * Verifica status de autenticação
 */
export async function checkAuthStatus(token?: string): Promise<AuthStatusResponse> {
  try {
    const response = await fetchWithTimeout(resolveUrl("/auth/status"), {
      credentials: "include",
      headers: buildHeaders(token, true)
    });

    if (!response.ok) {
      return { authenticated: false };
    }

    return response.json();
  } catch (error) {
    // Timeout or network error - return unauthenticated without blocking
    console.warn("[AuthClient] checkAuthStatus failed:", error instanceof Error ? error.message : error);
    return { authenticated: false };
  }
}

/**
 * Busca dados do usuário autenticado
 */
export async function getCurrentUser(token?: string): Promise<UserResponse> {
  const response = await fetchWithTimeout(resolveUrl("/auth/me"), {
    credentials: "include",
    headers: buildHeaders(token, true)
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }

  return response.json();
}

/**
 * Login com owner token (bypass OAuth)
 */
export async function loginWithToken(token: string): Promise<TokenLoginResponse> {
  const response = await fetch(resolveUrl("/auth/token"), {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Token login failed");
  }

  return response.json();
}

/**
 * Logout (encerra sessão)
 */
export async function logout(): Promise<void> {
  const response = await fetch(resolveUrl("/auth/logout"), {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

/**
 * Logout de todas as sessões
 */
export async function logoutAll(): Promise<void> {
  const response = await fetch(resolveUrl("/auth/logout-all"), {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Logout all failed");
  }
}
