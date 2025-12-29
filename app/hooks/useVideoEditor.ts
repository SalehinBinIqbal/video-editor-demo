"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  VideoClip,
  TimelineSlot,
  ValidationResult,
} from "../types/editor";

// Top timeline: 7 fixed dummy videos
const TOP_TIMELINE_VIDEOS = [
  "/test5.mp4", // Position 1
  "/test5.mp4", // Position 2
  "/test5.mp4", // Position 3
  "/test5.mp4", // Position 4
  "/test5.mp4", // Position 5
  "/test5.mp4", // Position 6
  "/test5.mp4", // Position 7
];

// Bottom timeline: 3 slots aligning with positions 2, 4, 6
const BOTTOM_TIMELINE_SLOTS = [
  { index: 0, alignsWithPosition: 2 },
  { index: 1, alignsWithPosition: 4 },
  { index: 2, alignsWithPosition: 6 },
];

/**
 * Validates a video file against constraints
 */
async function validateVideo(file: File): Promise<ValidationResult> {
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  const MIN_WIDTH = 1280;
  const MIN_HEIGHT = 720;
  const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "INVALID_TYPE",
      errorMessage: "Only MP4, WebM, and MOV video files are supported.",
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "FILE_TOO_LARGE",
      errorMessage: `File size must be less than 20MB. Your file is ${(
        file.size /
        1024 /
        1024
      ).toFixed(1)}MB.`,
    };
  }

  // Check resolution
  try {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    return new Promise<ValidationResult>((resolve) => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);

        if (video.videoWidth < MIN_WIDTH || video.videoHeight < MIN_HEIGHT) {
          resolve({
            valid: false,
            error: "RESOLUTION_TOO_LOW",
            errorMessage: `Video resolution must be at least 720p (1280×720). Your video is ${video.videoWidth}×${video.videoHeight}.`,
          });
        } else {
          resolve({ valid: true });
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: false,
          error: "LOAD_ERROR",
          errorMessage: "Failed to load video. The file may be corrupted.",
        });
      };

      video.src = url;
    });
  } catch (error) {
    return {
      valid: false,
      error: "LOAD_ERROR",
      errorMessage: "Failed to validate video.",
    };
  }
}

/**
 * Generates a thumbnail from a video file
 */
async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of video duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      canvas.width = 160;
      canvas.height = 90;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

/**
 * Gets video duration and metadata
 */
async function getVideoMetadata(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: video.duration });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

/**
 * Custom hook for managing video editor state
 */
export function useVideoEditor() {
  const [topTimelineClips, setTopTimelineClips] = useState<VideoClip[]>([]);
  const [bottomTimelineSlots, setBottomTimelineSlots] = useState<
    TimelineSlot[]
  >([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with top timeline videos and empty bottom slots
  useEffect(() => {
    const initTimelines = async () => {
      try {
        const topClips: VideoClip[] = [];

        // Load all top timeline videos
        for (let i = 0; i < TOP_TIMELINE_VIDEOS.length; i++) {
          const response = await fetch(TOP_TIMELINE_VIDEOS[i]);
          const blob = await response.blob();
          const file = new File([blob], `Video${i + 1}.mp4`, {
            type: "video/mp4",
          });

          const metadata = await getVideoMetadata(file);
          const thumbnail = await generateThumbnail(file);

          topClips.push({
            id: `top-${i}`,
            name: `Video ${i + 1}`,
            src: TOP_TIMELINE_VIDEOS[i],
            duration: metadata.duration,
            thumbnail,
            isDummy: true,
          });
        }

        setTopTimelineClips(topClips);

        // Initialize empty bottom timeline slots
        setBottomTimelineSlots(
          BOTTOM_TIMELINE_SLOTS.map((slot) => ({
            ...slot,
            clip: null,
          }))
        );

        setSelectedClipId(topClips[0]?.id || null);
      } catch (error) {
        console.error("Failed to load timeline videos:", error);
        setError("Failed to load sample videos");
      }
    };

    initTimelines();
  }, []);

  /**
   * Add a video to a specific bottom timeline slot
   */
  const addClipToSlot = useCallback(async (file: File, slotIndex: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate video
      const validation = await validateVideo(file);
      if (!validation.valid) {
        setError(validation.errorMessage || "Invalid video file");
        setIsLoading(false);
        return;
      }

      // Get metadata and thumbnail
      const metadata = await getVideoMetadata(file);
      const thumbnail = await generateThumbnail(file);
      const blobUrl = URL.createObjectURL(file);

      const newClip: VideoClip = {
        id: `bottom-${slotIndex}-${Date.now()}`,
        name: file.name,
        src: blobUrl,
        duration: metadata.duration,
        thumbnail,
        isDummy: false,
      };

      setBottomTimelineSlots((prev) =>
        prev.map((slot) =>
          slot.index === slotIndex ? { ...slot, clip: newClip } : slot
        )
      );

      setSelectedClipId(newClip.id);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to add clip:", error);
      setError("Failed to add video. Please try again.");
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove a clip from a bottom timeline slot
   */
  const removeClipFromSlot = useCallback((slotIndex: number) => {
    setBottomTimelineSlots((prev) =>
      prev.map((slot) => {
        if (slot.index === slotIndex && slot.clip) {
          // Revoke blob URL to free memory
          URL.revokeObjectURL(slot.clip.src);
          return { ...slot, clip: null };
        }
        return slot;
      })
    );
  }, []);

  /**
   * Select a clip for preview
   */
  const selectClip = useCallback((id: string) => {
    setSelectedClipId(id);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  /**
   * Play the video
   */
  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  /**
   * Pause the video
   */
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  /**
   * Seek to a specific time
   */
  const seek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get total duration of main timeline (all top clips)
   */
  const totalDuration = topTimelineClips.reduce(
    (sum, clip) => sum + clip.duration,
    0
  );

  /**
   * Get all clips for export (merged)
   */
  const getAllClipsForExport = useCallback((): VideoClip[] => {
    const exportClips: VideoClip[] = [];

    topTimelineClips.forEach((topClip, index) => {
      exportClips.push(topClip);

      // Check if there's a bottom clip at this position
      const bottomSlot = bottomTimelineSlots.find(
        (slot) => slot.alignsWithPosition === index + 1
      );

      if (bottomSlot?.clip) {
        exportClips.push(bottomSlot.clip);
      }
    });

    return exportClips;
  }, [topTimelineClips, bottomTimelineSlots]);

  return {
    // State
    topTimelineClips,
    bottomTimelineSlots,
    selectedClipId,
    isPlaying,
    currentTime,
    isLoading,
    error,
    totalDuration,

    // Actions
    addClipToSlot,
    removeClipFromSlot,
    selectClip,
    play,
    pause,
    togglePlay,
    seek,
    clearError,
    getAllClipsForExport,
  };
}
