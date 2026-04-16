import { RegenerationResult } from '@/hooks/useVideoRegeneration';
import { CoherenceScore } from '@/components/CoherenceScore';
import { IssueList } from '@/components/IssueList';
import { Flag } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowDown, Play, Pause } from 'lucide-react';
import { useCallback, useState, useMemo, useRef } from 'react';

interface RegeneratedResultsProps {
  regeneration: RegenerationResult;
  originalScore: number;
  originalFlagCount: number;
  originalVideoUrl?: string;
}

export function RegeneratedResults({
  regeneration,
  originalScore,
  originalFlagCount,
  originalVideoUrl,
}: RegeneratedResultsProps) {
  const [selectedFlagId, setSelectedFlagId] = useState<string>();
  const [isPlaying, setIsPlaying] = useState(false);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const regenVideoRef = useRef<HTMLVideoElement>(null);

  const handleFlagClick = useCallback((flag: Flag) => {
    setSelectedFlagId(flag.id);
  }, []);

  const handleSyncPlay = useCallback(() => {
    const origVideo = originalVideoRef.current;
    const regenVideo = regenVideoRef.current;
    if (!origVideo || !regenVideo) return;

    if (isPlaying) {
      origVideo.pause();
      regenVideo.pause();
      setIsPlaying(false);
    } else {
      origVideo.currentTime = 0;
      regenVideo.currentTime = 0;
      origVideo.play();
      regenVideo.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const versionNumber = (regeneration.versions?.length || 0) + (regeneration.status === 'complete' ? 0 : 1) + 1;
  const latestVersion = useMemo(() => {
    if (!regeneration.versions || regeneration.versions.length === 0) return null;
    return regeneration.versions[regeneration.versions.length - 1];
  }, [regeneration.versions]);

  const reEvaluation = latestVersion?.reEvaluation;

  if (regeneration.status === 'idle') return null;

  return (
    <div className="space-y-4 mt-8">
      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowDown className="h-4 w-4" />
          <span>Version {versionNumber} — Regenerated</span>
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
              <CardContent className="px-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center">Source (Original)</p>
                    <video
                      src={originalVideoUrl}
                      muted
                      controls
                      className="w-full rounded-lg aspect-video bg-black"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-medium text-center">Corrected (Regenerated)</p>
                    <video
                      src={regeneration.generatedVideoUrl}
                      controls
                      className="w-full rounded-lg aspect-video bg-black"
                    />
                  </div>
                </div>
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
      {regeneration.status === 'complete' && reEvaluation && (
        <div className="space-y-4">
          {/* Side-by-Side Video Comparison */}
          {regeneration.generatedVideoUrl && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Video Comparison
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleSyncPlay}
                    >
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      {isPlaying ? 'Pause Both' : 'Play Both'}
                    </Button>
                    <Badge variant="secondary" className="text-xs">Version {versionNumber}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Original Video */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center">Source (Original)</p>
                    <video
                      ref={originalVideoRef}
                      src={originalVideoUrl}
                      muted
                      controls
                      onEnded={handleVideoEnded}
                      className="w-full rounded-lg aspect-video bg-black"
                    />
                    <p className="text-[10px] text-muted-foreground text-center">Muted</p>
                  </div>
                  {/* Regenerated Video */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-medium text-center">Corrected (Regenerated)</p>
                    <video
                      ref={regenVideoRef}
                      src={regeneration.generatedVideoUrl}
                      controls
                      onEnded={handleVideoEnded}
                      className="w-full rounded-lg aspect-video bg-black"
                    />
                    <p className="text-[10px] text-muted-foreground text-center">Audio enabled</p>
                  </div>
                </div>
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
                    {reEvaluation.coherenceScore}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reEvaluation.flags.length} issues
                  </p>
                </div>
              </div>

              {/* Verdict */}
              <div className="mt-3 pt-3 border-t border-border text-center">
                {reEvaluation.flags.length < originalFlagCount ? (
                  <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'hsl(var(--success))' }}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Improved! {originalFlagCount - reEvaluation.flags.length} fewer issues</span>
                  </div>
                ) : reEvaluation.flags.length === originalFlagCount ? (
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
          {reEvaluation.flags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Remaining Issues ({reEvaluation.flags.length})
              </h4>
              <IssueList
                flags={reEvaluation.flags}
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
