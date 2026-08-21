const stripSlash = (url: string) => url.replace(/\/$/, "");

function resolveApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return stripSlash(fromEnv);

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4001";
    }
    if (hostname === "chatbot.doozi.bd" || hostname.endsWith(".doozi.bd")) {
      return `${protocol}//api2.doozi.bd`;
    }
  }

  return "https://api2.doozi.bd";
}

export const config = {
  get API_URL() {
    return resolveApiUrl();
  },
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Chatbot Admin",
  AUTH_TOKEN_KEY: "authToken",
  USER_DATA_KEY: "userData",
  TENANT_DATA_KEY: "tenantData",
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(config.AUTH_TOKEN_KEY);
}

export function setAuthData(token: string, user: unknown, tenant: unknown) {
  localStorage.setItem(config.AUTH_TOKEN_KEY, token);
  localStorage.setItem(config.USER_DATA_KEY, JSON.stringify(user));
  localStorage.setItem(config.TENANT_DATA_KEY, JSON.stringify(tenant));
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `authToken=${token}; path=/; max-age=${3 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

export function clearAuthData() {
  localStorage.removeItem(config.AUTH_TOKEN_KEY);
  localStorage.removeItem(config.USER_DATA_KEY);
  localStorage.removeItem(config.TENANT_DATA_KEY);
  document.cookie = "authToken=; path=/; max-age=0";
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getUserData<T = Record<string, unknown>>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(config.USER_DATA_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getTenantData<T = Record<string, unknown>>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(config.TENANT_DATA_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.API_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}
