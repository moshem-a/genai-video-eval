import { Flag } from '@/lib/types';
import { IssueCard } from './IssueCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IssueListProps {
  flags: Flag[];
  selectedFlagId?: string;
  onFlagClick: (flag: Flag) => void;
  onConfirm: (flagId: string) => void;
  onDismiss: (flagId: string) => void;
}

export function IssueList({ flags, selectedFlagId, onFlagClick, onConfirm, onDismiss }: IssueListProps) {
  if (flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No issues detected</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Video appears coherent</p>
      </div>
    );
  }

  const critical = flags.filter(f => f.severity === 'critical' && !f.dismissed);
  const warnings = flags.filter(f => f.severity === 'warning' && !f.dismissed);
  const info = flags.filter(f => f.severity === 'info' && !f.dismissed);
  const dismissed = flags.filter(f => f.dismissed);

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 pr-3">
        {[...critical, ...warnings, ...info, ...dismissed].map(flag => (
          <IssueCard
            key={flag.id}
            flag={flag}
            isSelected={flag.id === selectedFlagId}
            onClick={() => onFlagClick(flag)}
            onConfirm={() => onConfirm(flag.id)}
            onDismiss={() => onDismiss(flag.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
