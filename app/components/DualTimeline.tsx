"use client";

import { ArrowBigUp, Download, Film, RefreshCw, Sparkles } from "lucide-react";
import type { VideoClip, TimelineSlot } from "../types/editor";
import { useState, useRef } from "react";
import { DownloadModal } from "./DownloadModal";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface DualTimelineProps {
  topTimelineClips: VideoClip[];
  bottomTimelineSlots: TimelineSlot[];
  selectedClipId: string | null;
  currentPlayingIndex: number;
  onSelectClip: (id: string) => void;
  onSeekToClip: (clipIndex: number) => void;
  onAddToSlot: (file: File, slotIndex: number) => void;
  onRemoveFromSlot: (slotIndex: number) => void;
  onMergedTimelineChange: (clips: VideoClip[]) => void;
  isLoading: boolean;
  onPause?: () => void;
}

/**
 * Formats duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Individual clip component
 */
function ClipCard({
  clip,
  isSelected,
  isPlaying,
  onSelect,
  position,
}: {
  clip: VideoClip;
  isSelected: boolean;
  isPlaying?: boolean;
  onSelect: () => void;
  position?: number;
}) {
  return (
    <div
      className={`
        relative group flex-1 min-w-32 h-20 rounded-lg overflow-hidden
        border-2 transition-all duration-200
        ${
          isPlaying
            ? "border-green-500 ring-2 ring-green-500/50"
            : "border-gray-700 hover:border-gray-600"
        }
      `}
      // onClick={onSelect}
    >
      <img
        src={clip.thumbnail}
        alt={clip.name}
        className="w-full h-full object-cover"
      />

      <div
        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent 
                    flex flex-col justify-end p-1.5"
      >
        {position && (
          <div
            className={`absolute top-1 left-1 ${
              isPlaying ? "bg-green-600" : "bg-blue-600"
            } text-white text-xs px-1.5 py-0.5 rounded font-bold flex items-center gap-1`}
          >
            {isPlaying && (
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
            {position}
          </div>
        )}
        <p className="text-white text-xs font-medium truncate mb-0.5">
          {clip.name}
        </p>
        <span className="text-white text-xs font-mono bg-black/50 px-1 py-0.5 rounded w-fit">
          {formatDuration(clip.duration)}
        </span>
      </div>
    </div>
  );
}

/**
 * Upload slot component
 */
function UploadSlot({
  slot,
  onUpload,
  onRemove,
  isSelected,
  onSelect,
  isLoading,
}: {
  slot: TimelineSlot;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isSelected: boolean;
  onSelect: () => void;
  isLoading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = "";
  };

  if (slot.clip) {
    return (
      <div className="relative flex-1 min-w-32">
        {/* Animated arrow pointing upward for filled slots */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          {/* <svg
            className="w-6 h-6 text-green-500 animate-bounce"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg> */}
          <ArrowBigUp fill="currentColor" className="text-green-500" />
          {/* <div className="text-xs text-green-500 font-medium mt-1">
            Position {slot.alignsWithPosition}
          </div> */}
        </div>

        <ClipCard
          clip={slot.clip}
          isSelected={isSelected}
          onSelect={onSelect}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 
                   text-white rounded-full flex items-center justify-center
                   shadow-lg z-10 cursor-pointer"
          aria-label="Remove clip"
        >
          <svg
            className="w-4 h-4"
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
    );
  }

  return (
    <label
      className={`
        relative flex-1 min-w-32 h-20 rounded-lg border-2 border-dashed
        flex flex-col items-center justify-center cursor-pointer
        transition-all duration-200
        ${
          isLoading
            ? "border-gray-700 bg-gray-800/50 cursor-wait"
            : "border-gray-600 hover:border-blue-500 hover:bg-gray-800/50"
        }
      `}
    >
      {/* Animated arrow pointing upward */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* <svg
          className="w-6 h-6 text-blue-500 animate-bounce"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg> */}
        <ArrowBigUp className="animate-bounce text-blue-500" />
        {/* <div className="text-xs text-blue-500 font-medium mt-1">
          Position {slot.alignsWithPosition}
        </div> */}
      </div>

      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />

      {isLoading ? (
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <svg
            className="w-6 h-6 text-gray-500 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-xs text-gray-500 font-medium">Upload</span>
        </>
      )}

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-500">
        Slot {slot.index + 1}
      </div>
    </label>
  );
}

/**
 * Dual timeline component
 */
export function DualTimeline({
  topTimelineClips,
  bottomTimelineSlots,
  selectedClipId,
  currentPlayingIndex,
  onSelectClip,
  onSeekToClip,
  onAddToSlot,
  onRemoveFromSlot,
  onMergedTimelineChange,
  isLoading,
  onPause,
}: DualTimelineProps) {
  const [generateVideo, setGenerateVideo] = useState(false);
  const [mergedTimeline, setMergedTimeline] = useState<VideoClip[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [currentVideo, setCurrentVideo] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const handleGenerateVideo = () => {
    // Stop playback and seek to beginning first
    onPause?.();
    onSeekToClip(0);

    // Create a merged timeline where uploaded videos replace source videos at indicated positions
    const merged = topTimelineClips.map((clip, index) => {
      // Find if there's an uploaded video for this position
      const slot = bottomTimelineSlots.find(
        (s) => s.clip && s.alignsWithPosition === index + 1
      );

      // If there's an uploaded video for this position, use it; otherwise use the original
      return slot?.clip || clip;
    });

    setMergedTimeline(merged);
    setGenerateVideo(true);
    onMergedTimelineChange(merged);
  };

  const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    ffmpeg.on("progress", ({ progress: prog }) => {
      const currentProgress = Math.round(prog * 100);
      setDownloadProgress(Math.min(25 + currentProgress * 0.65, 90));
    });

    try {
      setDownloadStatus("Loading video processor");
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

  const handleDownload = async () => {
    // Stop playback and seek to beginning before downloading
    onPause?.();
    onSeekToClip(0);

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus("Preparing video");

    try {
      const ffmpeg = await loadFFmpeg();
      setDownloadProgress(5);

      // Write all video files to FFmpeg virtual filesystem
      setDownloadStatus("Loading video files");
      for (let i = 0; i < mergedTimeline.length; i++) {
        const clip = mergedTimeline[i];
        setDownloadProgress(
          5 + Math.round(((i + 1) / mergedTimeline.length) * 15)
        );

        const videoData = await fetchFile(clip.src);
        await ffmpeg.writeFile(`input${i}.mp4`, videoData);
      }

      setDownloadProgress(25);
      setDownloadStatus("Encoding videos");
      setTotalVideos(mergedTimeline.length);

      // Re-encode all videos to the same format for smooth concatenation
      for (let i = 0; i < mergedTimeline.length; i++) {
        setCurrentVideo(i + 1);
        await ffmpeg.exec([
          "-i",
          `input${i}.mp4`,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ar",
          "44100",
          "-r",
          "30",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          `temp${i}.mp4`,
        ]);
      }

      // Create concat list file
      const concatList = mergedTimeline
        .map((_, i) => `file 'temp${i}.mp4'`)
        .join("\n");
      await ffmpeg.writeFile("concat.txt", concatList);

      setDownloadStatus("Merging videos");
      setDownloadProgress(90);

      // Concatenate videos
      await ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-c",
        "copy",
        "output.mp4",
      ]);

      setDownloadProgress(95);
      setDownloadStatus("Finalizing");

      // Read the output file
      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([new Uint8Array(data as Uint8Array)], {
        type: "video/mp4",
      });

      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `merged_video_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadStatus("Complete!");
      setDownloadProgress(100);

      // Cleanup FFmpeg filesystem
      for (let i = 0; i < mergedTimeline.length; i++) {
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

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setIsDownloading(false);
      }, 2000);
    } catch (error) {
      console.error("Error downloading video:", error);
      setDownloadStatus("Error occurred. Please try again.");
      setTimeout(() => {
        setIsDownloading(false);
      }, 3000);
    }
  };

  return (
    <>
      <div className="w-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            {/* <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg> */}
            <Film />
            Timeline
          </h2>
          <div className="text-sm text-gray-400">
            {/* {topTimelineClips.length} main clips •{" "} */}
            {bottomTimelineSlots.filter((s) => s.clip).length}/3 uploads
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-4 space-y-6 overflow-x-auto">
          {/* Top Timeline - Main Videos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-gray-300">
                {generateVideo ? "Generated Video" : "Source"}
              </h3>
            </div>
            <div className="flex gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
              {(generateVideo ? mergedTimeline : topTimelineClips).map(
                (clip, index) => (
                  <ClipCard
                    key={`top-${clip.id}`}
                    clip={clip}
                    isSelected={clip.id === selectedClipId}
                    isPlaying={index === currentPlayingIndex}
                    onSelect={() => onSeekToClip(index)}
                    position={index + 1}
                  />
                )
              )}
            </div>
          </div>

          {/* Bottom Timeline - Upload Slots */}
          {!generateVideo && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-300">Upload</h3>
              </div>

              {/* Upload Slots */}
              <div className="relative flex gap-3 pb-8">
                {topTimelineClips.map((_, index) => {
                  const slot = bottomTimelineSlots.find(
                    (s) => s.alignsWithPosition === index + 1
                  );

                  if (slot) {
                    return (
                      <UploadSlot
                        key={`slot-${slot.index}`}
                        slot={slot}
                        onUpload={(file) => onAddToSlot(file, slot.index)}
                        onRemove={() => onRemoveFromSlot(slot.index)}
                        isSelected={slot.clip?.id === selectedClipId}
                        onSelect={() => slot.clip && onSelectClip(slot.clip.id)}
                        isLoading={isLoading}
                      />
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      className="flex-1 min-w-32 h-20"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Click main clips to seek • Green border = now playing • Upload
            videos to bottom slots • Max 720p, 20MB
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        {/* <button
          disabled={true}
          className="px-3 py-2 bg-green-700 rounded-md inline-flex items-center gap-2 hover:bg-green-800 transition cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
        >
          <Download size={20} />
          Download
        </button> */}
        {generateVideo ? (
          <>
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-green-700 rounded-md inline-flex items-center gap-2 hover:bg-green-800 transition cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
            >
              <Download size={20} />
              Download
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 bg-blue-700 rounded-md inline-flex items-center gap-2 hover:bg-blue-800 transition cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
            >
              <RefreshCw size={20} />
              Reset
            </button>
          </>
        ) : (
          <button
            disabled={bottomTimelineSlots.filter((s) => s.clip).length === 0}
            onClick={handleGenerateVideo}
            className="px-3 py-2 bg-blue-700 rounded-md inline-flex items-center gap-2 hover:bg-blue-800 transition cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
          >
            <Sparkles size={20} />
            Make your own video
          </button>
        )}
      </div>

      <DownloadModal
        isOpen={isDownloading}
        progress={downloadProgress}
        status={downloadStatus}
        onClose={() => setIsDownloading(false)}
        currentVideo={currentVideo}
        totalVideos={totalVideos}
      />
    </>
  );
}
