import { cn } from '@/lib/utils';

interface CoherenceScoreProps {
  score: number;
  size?: 'sm' | 'lg';
}

export function CoherenceScore({ score, size = 'lg' }: CoherenceScoreProps) {
  const getColor = () => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getTrackColor = () => {
    if (score >= 80) return 'stroke-success';
    if (score >= 50) return 'stroke-warning';
    return 'stroke-destructive';
  };

  const getLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const radius = size === 'lg' ? 54 : 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const dim = size === 'lg' ? 128 : 80;
  const strokeWidth = size === 'lg' ? 8 : 5;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg
          viewBox={`0 0 ${dim} ${dim}`}
          className="transform -rotate-90"
          width={dim}
          height={dim}
        >
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            className={getTrackColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-mono font-bold', getColor(), size === 'lg' ? 'text-2xl' : 'text-base')}>
            {score}
          </span>
        </div>
      </div>
      <span className={cn('font-medium', getColor(), size === 'lg' ? 'text-sm' : 'text-xs')}>
        {getLabel()}
      </span>
      {size === 'lg' && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Coherence Score
        </span>
      )}
    </div>
  );
}
