const DEFAULT_API_URL = "http://127.0.0.1:3000";

export const API_URL = getApiUrl(import.meta.env);

function getApiUrl(env: ImportMetaEnv): string {
  const apiUrl = env.VITE_API_URL?.trim();
  return apiUrl === undefined || apiUrl.length === 0 ? DEFAULT_API_URL : apiUrl.replace(/\/+$/, "");
}
