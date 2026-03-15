import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Upload, Play, Film, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BatchResultsPage from './BatchResults';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BatchVideoList } from '@/components/BatchVideoList';
import { GroundTruthEditor } from '@/components/GroundTruthEditor';
import { AgentSettings } from '@/components/AgentSettings';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { useBatchEvaluation } from '@/hooks/useBatchEvaluation';
import { hasApiKey } from '@/lib/gemini-config';
import { cn } from '@/lib/utils';

const BatchUpload = () => {
  const navigate = useNavigate();
  const {
    batch,
    isEvaluating,
    currentVideoIndex,
    agentConfigs,
    setAgentConfigs,
    createBatch,
    addVideos,
    removeVideo,
    addGroundTruth,
    removeGroundTruth,
    updateThreshold,
    runBatchEvaluation,
    reset,
  } = useBatchEvaluation();

  const [selectedVideoId, setSelectedVideoId] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [showApiDialog, setShowApiDialog] = useState(!hasApiKey());
  const [batchName, setBatchName] = useState('');

  // Initialize batch on first interaction
  const ensureBatch = useCallback(() => {
    if (!batch) {
      createBatch(batchName || `Batch ${new Date().toLocaleDateString()}`);
    }
  }, [batch, batchName, createBatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    ensureBatch();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (files.length > 0) addVideos(files);
  }, [addVideos, ensureBatch]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    ensureBatch();
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addVideos(files);
  }, [addVideos, ensureBatch]);

  const handleRunEvaluation = async () => {
    await runBatchEvaluation();
  };

  // Show results view after evaluation is complete
  if (batch && batch.status === 'complete') {
    return <BatchResultsPage batch={batch} onReset={reset} />;
  }

  const selectedVideo = batch?.videos.find(v => v.id === selectedVideoId);
  const threshold = batch?.coverageThreshold ?? 0.85;

  return (
    <div className="min-h-screen bg-background">
      <ApiKeyDialog open={showApiDialog} onOpenChange={setShowApiDialog} onSave={() => {}} />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">Batch Evaluation</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowApiDialog(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left: Video list + upload */}
          <div className="space-y-4">
            <Input
              placeholder="Batch name (optional)"
              value={batchName}
              onChange={e => setBatchName(e.target.value)}
              className="text-sm"
            />

            {/* Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                isEvaluating && 'pointer-events-none opacity-50'
              )}
            >
              <Film className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Drop videos here</p>
              <label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isEvaluating}
                />
                <Button variant="secondary" size="sm" asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Browse
                  </span>
                </Button>
              </label>
            </div>

            {/* Video list */}
            {batch && batch.videos.length > 0 && (
              <BatchVideoList
                videos={batch.videos}
                selectedVideoId={selectedVideoId}
                onSelect={setSelectedVideoId}
                onRemove={isEvaluating ? undefined : removeVideo}
                disabled={isEvaluating}
              />
            )}

            {/* Threshold */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Coverage Threshold
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {Math.round(threshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[threshold * 100]}
                  onValueChange={([v]) => updateThreshold(v / 100)}
                  min={50}
                  max={100}
                  step={5}
                  disabled={isEvaluating}
                />
              </CardContent>
            </Card>

            {/* Agent settings */}
            <AgentSettings
              configs={agentConfigs}
              onChange={setAgentConfigs}
              disabled={isEvaluating}
            />

            {/* Run button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleRunEvaluation}
              disabled={isEvaluating || !batch || batch.videos.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              {isEvaluating
                ? `Evaluating ${currentVideoIndex + 1}/${batch?.videos.length ?? 0}...`
                : 'Run Evaluation'
              }
            </Button>
          </div>

          {/* Right: Selected video detail */}
          <div>
            {selectedVideo ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-0">
                    <video
                      src={selectedVideo.videoUrl}
                      controls
                      className="w-full rounded-lg"
                      style={{ maxHeight: '400px' }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{selectedVideo.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GroundTruthEditor
                      issues={selectedVideo.groundTruth}
                      onAdd={(desc, start, end) => addGroundTruth(selectedVideo.id, desc, start, end)}
                      onRemove={(issueId) => removeGroundTruth(selectedVideo.id, issueId)}
                      disabled={isEvaluating}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Film className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">
                  {batch && batch.videos.length > 0
                    ? 'Select a video to annotate known issues'
                    : 'Upload videos to get started'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BatchUpload;
