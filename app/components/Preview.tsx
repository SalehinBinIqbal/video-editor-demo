"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { VideoClip } from "../types/editor";

interface PreviewProps {
  /** All clips in the main timeline to play sequentially */
  clips: VideoClip[];
  /** Whether playback is active */
  isPlaying: boolean;
  /** Global timeline time (across all clips) */
  globalTime: number;
  /** Total duration of all clips combined */
  totalDuration: number;
  /** Callback when global time updates */
  onTimeUpdate: (time: number) => void;
  /** Callback when all clips have finished playing */
  onEnded: () => void;
  /** Callback when playback starts */
  onPlay: () => void;
  /** Callback when playback pauses */
  onPause: () => void;
}

/**
 * Formats time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Calculates which clip should be playing at a given global time
 * Returns the clip index and the local time within that clip
 */
function getClipAtTime(
  clips: VideoClip[],
  globalTime: number
): { clipIndex: number; localTime: number } {
  let accumulated = 0;

  for (let i = 0; i < clips.length; i++) {
    const clipEnd = accumulated + clips[i].duration;
    if (globalTime < clipEnd) {
      return {
        clipIndex: i,
        localTime: globalTime - accumulated,
      };
    }
    accumulated = clipEnd;
  }

  // If past the end, return the last clip at its end
  if (clips.length > 0) {
    return {
      clipIndex: clips.length - 1,
      localTime: clips[clips.length - 1].duration,
    };
  }

  return { clipIndex: 0, localTime: 0 };
}

/**
 * Gets the start time of a clip in the global timeline
 */
function getClipStartTime(clips: VideoClip[], clipIndex: number): number {
  let startTime = 0;
  for (let i = 0; i < clipIndex && i < clips.length; i++) {
    startTime += clips[i].duration;
  }
  return startTime;
}

/**
 * Video preview component with unified playback across all main timeline clips
 */
export function Preview({
  clips,
  isPlaying,
  globalTime,
  totalDuration,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
}: PreviewProps) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<"A" | "B">("A");
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isLoadingClip, setIsLoadingClip] = useState(true);
  const lastGlobalTimeRef = useRef(globalTime);
  const pendingPlayRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const isTransitioningRef = useRef(false);

  // Get current video ref based on activeVideo state
  const videoRef = activeVideo === "A" ? videoARef : videoBRef;
  const nextVideoRef = activeVideo === "A" ? videoBRef : videoARef;

  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Get the current clip being played
  const currentClip = clips[currentClipIndex] || null;

  // Load new clip when index changes
  const loadClip = useCallback(
    (clipIndex: number, seekToLocalTime: number, shouldPlay: boolean) => {
      const currentVideoEl =
        activeVideo === "A" ? videoARef.current : videoBRef.current;
      const nextVideoEl =
        activeVideo === "A" ? videoBRef.current : videoARef.current;

      if (!currentVideoEl || !clips[clipIndex]) return;

      // Check if next video is preloaded and ready (only for auto-advance at start of clip)
      if (
        seekToLocalTime === 0 &&
        nextVideoEl &&
        nextVideoEl.src.includes(clips[clipIndex].src.split("/").pop() || "") &&
        nextVideoEl.readyState >= 3
      ) {
        // Preloaded video is ready - swap to it instantly!
        isTransitioningRef.current = true;

        // Pause current video
        currentVideoEl.pause();

        // Start playing the preloaded video
        nextVideoEl.currentTime = 0;
        nextVideoEl.volume = volume;
        nextVideoEl.muted = isMuted;

        if (shouldPlay || isPlayingRef.current) {
          nextVideoEl.play().catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Failed to play video:", error);
            }
          });
        }

        // Swap which video is active (this makes nextVideoEl the visible one)
        setActiveVideo(activeVideo === "A" ? "B" : "A");
        setIsLoadingClip(false);
        isTransitioningRef.current = false;
        return;
      }

      // Standard loading (for seeking or when preload not ready)
      setIsLoadingClip(true);
      pendingSeekTimeRef.current = seekToLocalTime;
      pendingPlayRef.current = shouldPlay;

      currentVideoEl.pause();
      currentVideoEl.src = clips[clipIndex].src;
      currentVideoEl.load();
    },
    [clips, activeVideo, volume, isMuted]
  );

  // Preload next clip into the inactive video element
  useEffect(() => {
    const nextIndex = currentClipIndex + 1;
    const inactiveVideoEl =
      activeVideo === "A" ? videoBRef.current : videoARef.current;

    if (nextIndex < clips.length && inactiveVideoEl) {
      const nextClip = clips[nextIndex];
      // Only preload if not already loaded with this source
      if (
        nextClip &&
        !inactiveVideoEl.src.includes(nextClip.src.split("/").pop() || "")
      ) {
        inactiveVideoEl.src = nextClip.src;
        inactiveVideoEl.load();
      }
    }
  }, [currentClipIndex, clips, activeVideo]);

  // Handle loadedmetadata event for both video elements
  useEffect(() => {
    const handleLoadedMetadata = (video: HTMLVideoElement) => {
      // Only handle for the active video element
      const isActiveVideo =
        (activeVideo === "A" && video === videoARef.current) ||
        (activeVideo === "B" && video === videoBRef.current);

      if (!isActiveVideo) return;

      // Seek to the pending time if set
      if (pendingSeekTimeRef.current !== null) {
        video.currentTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
      }

      setIsLoadingClip(false);

      // Resume playing if it was pending or if isPlaying is currently true
      if (pendingPlayRef.current || isPlayingRef.current) {
        pendingPlayRef.current = false;
        video.play().catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Failed to play video:", error);
          }
        });
      }
    };

    const videoA = videoARef.current;
    const videoB = videoBRef.current;

    const handlerA = () => videoA && handleLoadedMetadata(videoA);
    const handlerB = () => videoB && handleLoadedMetadata(videoB);

    videoA?.addEventListener("loadedmetadata", handlerA);
    videoB?.addEventListener("loadedmetadata", handlerB);

    return () => {
      videoA?.removeEventListener("loadedmetadata", handlerA);
      videoB?.removeEventListener("loadedmetadata", handlerB);
    };
  }, [activeVideo]);

  // Initial load of first clip
  useEffect(() => {
    if (clips.length > 0 && videoARef.current) {
      // Check if video source is not set or empty
      const currentSrc = videoARef.current.src;
      if (!currentSrc || currentSrc === window.location.href) {
        loadClip(0, 0, false);
      }
    }
  }, [clips, loadClip]);

  // Sync video element with isPlaying state (only when not loading a new clip)
  useEffect(() => {
    const activeVideoEl =
      activeVideo === "A" ? videoARef.current : videoBRef.current;
    if (!activeVideoEl || !currentClip) return;

    // Skip if still loading - the loadedmetadata handler will take care of it
    if (isLoadingClip) return;

    if (isPlaying) {
      const playPromise = activeVideoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Failed to play video:", error);
            onPause();
          }
        });
      }
    } else {
      activeVideoEl.pause();
    }
  }, [isPlaying, currentClip, isLoadingClip, onPause, activeVideo]);

  // Sync volume and muted state with both video elements
  useEffect(() => {
    if (videoARef.current) {
      videoARef.current.volume = volume;
      videoARef.current.muted = isMuted;
    }
    if (videoBRef.current) {
      videoBRef.current.volume = volume;
      videoBRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Handle time updates from the video element
  const handleTimeUpdate = useCallback(() => {
    const activeVideoEl =
      activeVideo === "A" ? videoARef.current : videoBRef.current;
    if (activeVideoEl && !isLoadingClip) {
      const localTime = activeVideoEl.currentTime;
      const clipStartTime = getClipStartTime(clips, currentClipIndex);
      const newGlobalTime = clipStartTime + localTime;

      // Only update if difference is significant to avoid feedback loops
      if (Math.abs(newGlobalTime - lastGlobalTimeRef.current) > 0.05) {
        lastGlobalTimeRef.current = newGlobalTime;
        onTimeUpdate(newGlobalTime);
      }
    }
  }, [clips, currentClipIndex, onTimeUpdate, isLoadingClip, activeVideo]);

  // Handle when current video ends
  const handleVideoEnded = useCallback(() => {
    if (currentClipIndex < clips.length - 1) {
      // Move to next clip
      const nextIndex = currentClipIndex + 1;
      setCurrentClipIndex(nextIndex);
      loadClip(nextIndex, 0, true);

      // Update global time to start of next clip
      const nextClipStart = getClipStartTime(clips, nextIndex);
      onTimeUpdate(nextClipStart);
    } else {
      // All clips finished
      onEnded();
    }
  }, [currentClipIndex, clips, onTimeUpdate, onEnded, loadClip]);

  // Handle seeking on the progress bar
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newGlobalTime = parseFloat(e.target.value);
      lastGlobalTimeRef.current = newGlobalTime;

      const { clipIndex, localTime } = getClipAtTime(clips, newGlobalTime);
      const activeVideoEl =
        activeVideo === "A" ? videoARef.current : videoBRef.current;

      // Update global time
      onTimeUpdate(newGlobalTime);

      // If same clip, just seek within it
      if (clipIndex === currentClipIndex && activeVideoEl && !isLoadingClip) {
        activeVideoEl.currentTime = localTime;
      } else if (clipIndex !== currentClipIndex) {
        // Different clip - load it and seek to the correct position
        setCurrentClipIndex(clipIndex);
        loadClip(clipIndex, localTime, isPlaying);
      }
    },
    [
      clips,
      currentClipIndex,
      onTimeUpdate,
      isLoadingClip,
      loadClip,
      isPlaying,
      activeVideo,
    ]
  );

  const togglePlay = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (clips.length === 0) {
    return (
      <div className="w-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        <div className="aspect-video flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg">Loading videos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Video Player - Two video elements for seamless transitions */}
      <div className="relative aspect-video bg-black">
        {/* Video A */}
        <video
          ref={videoARef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-75 ${
            activeVideo === "A" ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          onTimeUpdate={activeVideo === "A" ? handleTimeUpdate : undefined}
          onEnded={activeVideo === "A" ? handleVideoEnded : undefined}
          preload="auto"
        />
        {/* Video B */}
        <video
          ref={videoBRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-75 ${
            activeVideo === "B" ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          onTimeUpdate={activeVideo === "B" ? handleTimeUpdate : undefined}
          onEnded={activeVideo === "B" ? handleVideoEnded : undefined}
          preload="auto"
        />

        {/* Play/Pause Overlay Button */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 group z-200 cursor-pointer"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              className="w-20 h-20 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              className="w-20 h-20 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Current Clip Indicator */}
        {/* {currentClip && (
          <div className="absolute top-3 left-3 bg-black/70 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="bg-blue-600 text-xs px-2 py-0.5 rounded font-bold">
              {currentClipIndex + 1}/{clips.length}
            </span>
            <span className="truncate max-w-32">{currentClip.name}</span>
          </div>
        )} */}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 space-y-3">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300 font-mono min-w-11.25">
            {formatTime(globalTime)}
          </span>

          <input
            type="range"
            min="0"
            max={totalDuration || 0}
            step="0.1"
            value={globalTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                     [&::-webkit-slider-thumb]:appearance-none 
                     [&::-webkit-slider-thumb]:w-4 
                     [&::-webkit-slider-thumb]:h-4 
                     [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-blue-500
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-4 
                     [&::-moz-range-thumb]:h-4 
                     [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:bg-blue-500
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-pointer"
          />

          <span className="text-sm text-gray-300 font-mono min-w-11.25">
            {formatTime(totalDuration)}
          </span>

          {/* Volume Control */}
          <div className="items-center gap-2 hidden sm:flex">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-700 rounded transition-colors cursor-pointer"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : volume < 0.5 ? (
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-3
                       [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-blue-500
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-3
                       [&::-moz-range-thumb]:h-3
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:bg-blue-500
                       [&::-moz-range-thumb]:border-0
                       [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
