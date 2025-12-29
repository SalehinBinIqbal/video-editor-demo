"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Preview } from "./components/Preview";
import { DualTimeline } from "./components/DualTimeline";
import { useVideoEditor } from "./hooks/useVideoEditor";
import { useExport } from "./hooks/useExport";

/**
 * Calculate which clip index is playing at a given global time
 */
function getClipIndexAtTime(
  clips: { duration: number }[],
  globalTime: number
): number {
  let accumulated = 0;
  for (let i = 0; i < clips.length; i++) {
    const clipEnd = accumulated + clips[i].duration;
    if (globalTime < clipEnd) {
      return i;
    }
    accumulated = clipEnd;
  }
  return clips.length > 0 ? clips.length - 1 : 0;
}

/**
 * Calculate the start time of a clip by index
 */
function getClipStartTime(
  clips: { duration: number }[],
  clipIndex: number
): number {
  let startTime = 0;
  for (let i = 0; i < clipIndex && i < clips.length; i++) {
    startTime += clips[i].duration;
  }
  return startTime;
}

export default function Home() {
  const {
    topTimelineClips,
    bottomTimelineSlots,
    selectedClipId,
    isPlaying,
    currentTime,
    isLoading,
    error,
    totalDuration,
    addClipToSlot,
    removeClipFromSlot,
    selectClip,
    play,
    pause,
    seek,
    clearError,
    getAllClipsForExport,
  } = useVideoEditor();

  const [playbackClips, setPlaybackClips] = useState(topTimelineClips);

  // Update playback clips when topTimelineClips change (initial load)
  useEffect(() => {
    setPlaybackClips(topTimelineClips);
  }, [topTimelineClips]);

  const handleMergedTimelineChange = useCallback(
    (mergedClips: typeof topTimelineClips) => {
      setPlaybackClips(mergedClips);
    },
    []
  );

  const {
    exportVideo,
    isExporting,
    progress: exportProgress,
    error: exportError,
    clearError: clearExportError,
  } = useExport();

  // Calculate total duration based on playback clips
  const playbackTotalDuration = useMemo(() => {
    return playbackClips.reduce((sum, clip) => sum + clip.duration, 0);
  }, [playbackClips]);

  // Calculate the currently playing clip index
  const currentPlayingIndex = useMemo(() => {
    return getClipIndexAtTime(playbackClips, currentTime);
  }, [playbackClips, currentTime]);

  // Handler to seek to the start of a specific clip
  const handleSeekToClip = useCallback(
    (clipIndex: number) => {
      const startTime = getClipStartTime(playbackClips, clipIndex);
      seek(startTime);
    },
    [playbackClips, seek]
  );

  const handleExport = async () => {
    const clips = getAllClipsForExport();
    await exportVideo(clips);
  };

  const handleEnded = () => {
    pause();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      {/* <header className="bg-gray-900 border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Simple Video Editor</h1>
                <p className="text-sm text-gray-400">Drag, drop, and create</p>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || topTimelineClips.length === 0}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
                transition-all duration-200 shadow-lg
                ${
                  isExporting || topTimelineClips.length === 0
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                }
              `}
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting... {exportProgress}%
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Video
                </>
              )}
            </button>
          </div>
        </div>
      </header> */}

      {/* Main Content */}
      <main className="w-full px-0 py-8">
        {/* Export Error */}
        {exportError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Export Failed</p>
                <p className="text-sm text-red-300">{exportError}</p>
              </div>
              <button
                onClick={clearExportError}
                className="text-red-400 hover:text-red-300 transition-colors"
                aria-label="Close error"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Preview Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <Preview
            clips={playbackClips}
            isPlaying={isPlaying}
            globalTime={currentTime}
            totalDuration={playbackTotalDuration}
            onTimeUpdate={seek}
            onEnded={handleEnded}
            onPlay={play}
            onPause={pause}
          />
        </div>

        {/* Dual Timeline Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <DualTimeline
            topTimelineClips={topTimelineClips}
            bottomTimelineSlots={bottomTimelineSlots}
            selectedClipId={selectedClipId}
            currentPlayingIndex={currentPlayingIndex}
            onSelectClip={selectClip}
            onSeekToClip={handleSeekToClip}
            onAddToSlot={addClipToSlot}
            onRemoveFromSlot={removeClipFromSlot}
            onMergedTimelineChange={handleMergedTimelineChange}
            isLoading={isLoading}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Upload Error</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 transition-colors"
                aria-label="Close error"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Clips</p>
                  <p className="text-2xl font-bold">
                    {topTimelineClips.length +
                      bottomTimelineSlots.filter((s: TimelineSlot) => s.clip)
                        .length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Duration</p>
                  <p className="text-2xl font-bold font-mono">
                    {Math.floor(totalDuration / 60)}:
                    {Math.floor(totalDuration % 60)
                      .toString()
                      .padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-lg font-semibold text-green-500">
                    {isLoading
                      ? "Processing..."
                      : isExporting
                      ? "Exporting..."
                      : "Ready"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div> */}
      </main>

      {/* Footer */}
      {/* <footer className="bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-400">
            Simple Video Editor • Built with Next.js 16, React 19, and Tailwind
            CSS v4
          </p>
        </div>
      </footer> */}
    </div>
  );
}
