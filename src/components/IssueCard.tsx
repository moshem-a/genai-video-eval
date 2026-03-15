import { Flag } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IssueCardProps {
  flag: Flag;
  isSelected: boolean;
  onClick: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

const SEVERITY_STYLES = {
  critical: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
    label: 'Critical',
    labelColor: 'text-destructive',
  },
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning/5',
    icon: <AlertTriangle className="h-4 w-4 text-warning" />,
    label: 'Warning',
    labelColor: 'text-warning',
  },
  info: {
    border: 'border-info/30',
    bg: 'bg-info/5',
    icon: <Info className="h-4 w-4 text-info" />,
    label: 'Info',
    labelColor: 'text-info',
  },
};

const AGENT_LABELS = {
  object_permanence: 'Object Permanence',
  physics_motion: 'Physics & Motion',
  temporal_consistency: 'Temporal Consistency',
};

export function IssueCard({ flag, isSelected, onClick, onConfirm, onDismiss }: IssueCardProps) {
  const style = SEVERITY_STYLES[flag.severity];

  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg border p-3 transition-all',
        style.border,
        isSelected ? style.bg : 'bg-card hover:bg-accent/50',
        flag.dismissed && 'opacity-40',
        flag.confirmed && 'border-success/30',
      )}
    >
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-semibold', style.labelColor)}>{style.label}</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {flag.timestamp}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {AGENT_LABELS[flag.category]}
            </span>
          </div>
          <p className="text-sm text-foreground leading-snug">{flag.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              Confidence: {Math.round(flag.confidence * 100)}%
            </span>
            {!flag.confirmed && !flag.dismissed && (
              <div className="flex gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-success hover:text-success hover:bg-success/10"
                  onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                >
                  <Check className="h-3 w-3 mr-1" /> Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                >
                  <X className="h-3 w-3 mr-1" /> Dismiss
                </Button>
              </div>
            )}
            {flag.confirmed && (
              <span className="ml-auto text-[10px] text-success font-medium">Confirmed</span>
            )}
            {flag.dismissed && (
              <span className="ml-auto text-[10px] text-muted-foreground font-medium">Dismissed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
