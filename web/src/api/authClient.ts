/**
 * Authentication API Client
 */

const API_BASE = ""; // Use relative path to leverage Vite proxy (dev) and Vercel rewrites (prod)

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
export async function getGoogleAuthUrl(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/google`, {
    credentials: "include"
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
export async function checkAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch(`${API_BASE}/api/auth/status`, {
    credentials: "include"
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json();
}

/**
 * Busca dados do usuário autenticado
 */
export async function getCurrentUser(): Promise<UserResponse> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include"
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
  const response = await fetch(`${API_BASE}/api/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
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
  const response = await fetch(`${API_BASE}/api/auth/logout-all`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Logout all failed");
  }
}
