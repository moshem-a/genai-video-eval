export const GEMINI_MODELS = [
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Fast and reliable' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'High reasoning capability' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Next-gen fast' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast & balanced' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Fastest, cheapest' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Top-tier reasoning' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Next-gen fast' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', description: 'Latest & most capable' },
] as const;

export type GeminiModelId = typeof GEMINI_MODELS[number]['id'];

const STORAGE_KEY_API = 'aegis_gemini_api_key_session';
const STORAGE_KEY_MODEL = 'aegis_gemini_model';
const API_EXPIRY_MS = 3600000; // 1 hour

interface StoredApiKey {
  key: string;
  expiry: number;
}

export function getStoredApiKey(): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_API);
    if (!raw) return '';
    
    const data = JSON.parse(raw) as StoredApiKey;
    if (Date.now() > data.expiry) {
      sessionStorage.removeItem(STORAGE_KEY_API);
      return '';
    }
    
    return data.key;
  } catch (e) {
    return '';
  }
}

export function setStoredApiKey(key: string) {
  const data: StoredApiKey = {
    key,
    expiry: Date.now() + API_EXPIRY_MS
  };
  sessionStorage.setItem(STORAGE_KEY_API, JSON.stringify(data));
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
