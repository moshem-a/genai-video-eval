export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast & balanced' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Fastest, cheapest' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Top-tier reasoning' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Next-gen fast' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', description: 'Latest & most capable' },
] as const;

export type GeminiModelId = typeof GEMINI_MODELS[number]['id'];

const STORAGE_KEY_API = 'aegis_gemini_api_key';
const STORAGE_KEY_MODEL = 'aegis_gemini_model';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY_API) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setStoredApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY_API, key);
}

export function getStoredModel(): GeminiModelId {
  return (localStorage.getItem(STORAGE_KEY_MODEL) as GeminiModelId) || 'gemini-3.1-pro-preview';
}

export function setStoredModel(model: GeminiModelId) {
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export function hasApiKey(): boolean {
  return !!getStoredApiKey();
}
