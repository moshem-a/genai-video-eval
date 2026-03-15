import { AgentConfig } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Eye, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentSettingsProps {
  configs: AgentConfig[];
  onChange: (configs: AgentConfig[]) => void;
  disabled?: boolean;
}

const ICONS: Record<string, React.ReactNode> = {
  object_permanence: <Eye className="h-4 w-4" />,
  physics_motion: <Zap className="h-4 w-4" />,
  temporal_consistency: <Clock className="h-4 w-4" />,
};

export function AgentSettings({ configs, onChange, disabled }: AgentSettingsProps) {
  const updateConfig = (type: string, update: Partial<AgentConfig>) => {
    onChange(configs.map(c => c.type === type ? { ...c, ...update } : c));
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Agent Configuration</h3>
      
      {configs.map(config => (
        <div key={config.type} className={cn('space-y-2 pb-3 border-b border-border last:border-0 last:pb-0', !config.enabled && 'opacity-50')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary">{ICONS[config.type]}</span>
              <Label className="text-sm">{config.label}</Label>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig(config.type, { enabled })}
              disabled={disabled}
            />
          </div>
          {config.enabled && (
            <div className="space-y-1 pl-6">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sensitivity</span>
                <span className="font-mono">{config.sensitivity}%</span>
              </div>
              <Slider
                value={[config.sensitivity]}
                onValueChange={([v]) => updateConfig(config.type, { sensitivity: v })}
                min={10}
                max={100}
                step={5}
                disabled={disabled}
                className="w-full"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
