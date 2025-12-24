"use client";

import { useState, useCallback, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { VideoClip } from "../types/editor";

interface UseExportReturn {
  exportVideo: (clips: VideoClip[]) => Promise<void>;
  isExporting: boolean;
  progress: number;
  error: string | null;
  clearError: () => void;
}

/**
 * Custom hook for exporting/downloading videos
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  /**
   * Initialize FFmpeg (lazy loading)
   */
  const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    ffmpeg.on("progress", ({ progress: prog }) => {
      setProgress(Math.round(prog * 100));
    });

    try {
      // Load FFmpeg core from CDN
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      throw new Error("Failed to initialize video processor");
    }
  };

  /**
   * Download a single video directly
   */
  const downloadSingleVideo = async (clip: VideoClip) => {
    try {
      const response = await fetch(clip.src);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download video:", error);
      throw new Error("Failed to download video");
    }
  };

  /**
   * Concatenate multiple videos using FFmpeg
   */
  const concatenateVideos = async (clips: VideoClip[]) => {
    setProgress(0);
    const ffmpeg = await loadFFmpeg();

    try {
      // Write all video files to FFmpeg virtual filesystem
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        setProgress(Math.round(((i + 1) / clips.length) * 20)); // 0-20% for loading

        const videoData = await fetchFile(clip.src);
        await ffmpeg.writeFile(`input${i}.mp4`, videoData);
      }

      setProgress(25);

      // Re-encode all videos to the same format before concatenating
      // This ensures smooth playback without getting stuck
      for (let i = 0; i < clips.length; i++) {
        await ffmpeg.exec([
          "-i",
          `input${i}.mp4`,
          "-c:v",
          "libx264", // Re-encode video to H.264
          "-preset",
          "ultrafast", // Fast encoding
          "-crf",
          "23", // Quality (lower = better quality)
          "-c:a",
          "aac", // Re-encode audio to AAC
          "-b:a",
          "128k", // Audio bitrate
          "-ar",
          "44100", // Audio sample rate
          "-r",
          "30", // Force 30fps for consistency
          "-pix_fmt",
          "yuv420p", // Pixel format for compatibility
          "-movflags",
          "+faststart", // Enable streaming
          `temp${i}.mp4`,
        ]);

        const progress = 25 + Math.round(((i + 1) / clips.length) * 50); // 25-75%
        setProgress(progress);
      }

      // Create concat list file with normalized videos
      const concatList = clips.map((_, i) => `file 'temp${i}.mp4'`).join("\n");
      await ffmpeg.writeFile("concat.txt", concatList);

      setProgress(80);

      // Run FFmpeg concatenation (now we can safely use -c copy)
      await ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-c",
        "copy", // Copy without re-encoding since all are same format now
        "output.mp4",
      ]);

      setProgress(90);

      // Read the output file
      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([new Uint8Array(data as Uint8Array)], {
        type: "video/mp4",
      });

      setProgress(95);

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-editor-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);

      // Cleanup FFmpeg filesystem
      for (let i = 0; i < clips.length; i++) {
        try {
          await ffmpeg.deleteFile(`input${i}.mp4`);
          await ffmpeg.deleteFile(`temp${i}.mp4`);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      try {
        await ffmpeg.deleteFile("concat.txt");
        await ffmpeg.deleteFile("output.mp4");
      } catch (e) {
        // Ignore cleanup errors
      }
    } catch (error) {
      console.error("Failed to concatenate videos:", error);
      throw new Error("Failed to process videos. Please try again.");
    }
  };

  /**
   * Export video(s) based on clip count
   */
  const exportVideo = useCallback(async (clips: VideoClip[]) => {
    if (clips.length === 0) {
      setError("No videos to export");
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      if (clips.length === 1) {
        // Single video - direct download
        setProgress(50);
        await downloadSingleVideo(clips[0]);
        setProgress(100);
      } else {
        // Multiple videos - concatenate with FFmpeg
        await concatenateVideos(clips);
      }

      // Reset progress after a short delay
      setTimeout(() => {
        setProgress(0);
        setIsExporting(false);
      }, 1000);
    } catch (error) {
      console.error("Export failed:", error);
      setError(
        error instanceof Error ? error.message : "Failed to export video"
      );
      setIsExporting(false);
      setProgress(0);
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exportVideo,
    isExporting,
    progress,
    error,
    clearError,
  };
}
