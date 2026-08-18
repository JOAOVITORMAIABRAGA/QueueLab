import type { Config, Result } from "./types";

// The backend's local HTTP profile is pinned to 54873. Override this with
// VITE_API_URL in Vercel or in Frontend/.env.local when needed.
const API = (import.meta.env.VITE_API_URL || "http://localhost:54873").replace(/\/$/, "");

async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API}. Verifique se o QueueLab.Api está rodando.`);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(payload?.errors) ? payload.errors.join(" ") : payload?.message;
    throw new Error(message || `A API respondeu com HTTP ${response.status}.`);
  }
  return payload as T;
}

export function simulate(config: Config) {
  return request<Result>("/api/simulations", config);
}

export function compare(scenarioA: Config, scenarioB: Config) {
  return request<{ scenarioA: Result; scenarioB: Result }>("/api/simulations/compare", {
    scenarioA,
    scenarioB,
  });
}

export { API };
