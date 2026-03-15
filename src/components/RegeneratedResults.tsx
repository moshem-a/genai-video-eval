import { RegenerationResult } from '@/hooks/useVideoRegeneration';
import { CoherenceScore } from '@/components/CoherenceScore';
import { IssueList } from '@/components/IssueList';
import { Flag } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowDown } from 'lucide-react';
import { useCallback, useState } from 'react';

interface RegeneratedResultsProps {
  regeneration: RegenerationResult;
  originalScore: number;
  originalFlagCount: number;
}

export function RegeneratedResults({
  regeneration,
  originalScore,
  originalFlagCount,
}: RegeneratedResultsProps) {
  const [selectedFlagId, setSelectedFlagId] = useState<string>();

  const handleFlagClick = useCallback((flag: Flag) => {
    setSelectedFlagId(flag.id);
  }, []);

  if (regeneration.status === 'idle') return null;

  return (
    <div className="space-y-4 mt-8">
      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowDown className="h-4 w-4" />
          <span>Version 2 — Regenerated</span>
          <ArrowDown className="h-4 w-4" />
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Loading States */}
      {regeneration.status === 'generating' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Generating video with Veo...</p>
              <p className="text-xs text-muted-foreground">{regeneration.statusMessage || 'This may take 2-5 minutes'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {regeneration.status === 'evaluating' && (
        <div className="space-y-4">
          {regeneration.generatedVideoUrl && (
            <Card>
              <CardContent className="p-0">
                <video
                  src={regeneration.generatedVideoUrl}
                  controls
                  className="w-full rounded-lg aspect-video bg-background"
                />
              </CardContent>
            </Card>
          )}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Re-evaluating with agents...</p>
                <p className="text-xs text-muted-foreground">Running the same analysis pipeline on the regenerated video</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {regeneration.status === 'error' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Regeneration failed</p>
              <p className="text-xs text-muted-foreground">{regeneration.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete — Show Results */}
      {regeneration.status === 'complete' && regeneration.reEvaluation && (
        <div className="space-y-4">
          {/* Generated Video */}
          {regeneration.generatedVideoUrl && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Regenerated Video
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">Version 2</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 px-4 pb-4">
                <video
                  src={regeneration.generatedVideoUrl}
                  controls
                  className="w-full rounded-lg aspect-video bg-background"
                />
              </CardContent>
            </Card>
          )}

          {/* Comparison Summary */}
          <Card className="border-primary/20">
            <CardContent className="py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Original Score */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Original</p>
                  <p className="text-2xl font-bold text-foreground">{originalScore}</p>
                  <p className="text-xs text-muted-foreground">{originalFlagCount} issues</p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="text-lg">→</div>
                </div>

                {/* New Score */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Regenerated</p>
                  <p className="text-2xl font-bold text-foreground">
                    {regeneration.reEvaluation.coherenceScore}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {regeneration.reEvaluation.flags.length} issues
                  </p>
                </div>
              </div>

              {/* Verdict */}
              <div className="mt-3 pt-3 border-t border-border text-center">
                {regeneration.reEvaluation.flags.length < originalFlagCount ? (
                  <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'hsl(var(--success))' }}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Improved! {originalFlagCount - regeneration.reEvaluation.flags.length} fewer issues</span>
                  </div>
                ) : regeneration.reEvaluation.flags.length === originalFlagCount ? (
                  <p className="text-sm text-muted-foreground">Same number of issues detected</p>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>More issues detected — consider regenerating again</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Re-evaluation Issues */}
          {regeneration.reEvaluation.flags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Remaining Issues ({regeneration.reEvaluation.flags.length})
              </h4>
              <IssueList
                flags={regeneration.reEvaluation.flags}
                selectedFlagId={selectedFlagId}
                onFlagClick={handleFlagClick}
                onConfirm={() => {}}
                onDismiss={() => {}}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
