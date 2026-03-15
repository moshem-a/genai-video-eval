import { AgentConfig, DEFAULT_AGENT_CONFIGS } from './types';

const STORAGE_KEY = 'aegis_agent_configs';

export function getStoredAgentConfigs(): AgentConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_AGENT_CONFIGS;
    
    const parsed = JSON.parse(stored);
    
    // Merge default configs with stored ones to ensure new defaults are present
    // but keep stored modifications
    const configs = [...DEFAULT_AGENT_CONFIGS];
    
    parsed.forEach((storedCfg: AgentConfig) => {
      const index = configs.findIndex(c => c.id === storedCfg.id);
      if (index !== -1) {
        configs[index] = storedCfg;
      } else {
        configs.push(storedCfg);
      }
    });
    
    return configs;
  } catch (e) {
    console.error('Failed to load agent configs from storage', e);
    return DEFAULT_AGENT_CONFIGS;
  }
}

export function saveAgentConfigs(configs: AgentConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (e) {
    console.error('Failed to save agent configs to storage', e);
  }
}

export function resetAgentConfigs(): void {
  localStorage.removeItem(STORAGE_KEY);
}
