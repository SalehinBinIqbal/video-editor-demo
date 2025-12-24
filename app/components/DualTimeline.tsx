"use client";

import type { VideoClip, TimelineSlot } from "../types/editor";

interface DualTimelineProps {
  topTimelineClips: VideoClip[];
  bottomTimelineSlots: TimelineSlot[];
  selectedClipId: string | null;
  currentPlayingIndex: number;
  onSelectClip: (id: string) => void;
  onSeekToClip: (clipIndex: number) => void;
  onAddToSlot: (file: File, slotIndex: number) => void;
  onRemoveFromSlot: (slotIndex: number) => void;
  isLoading: boolean;
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
        relative group flex-1 min-w-32 h-20 rounded-lg overflow-hidden cursor-pointer
        border-2 transition-all duration-200
        ${
          isPlaying
            ? "border-green-500 ring-2 ring-green-500/50"
            : "border-gray-700 hover:border-gray-600"
        }
      `}
      onClick={onSelect}
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
                   shadow-lg z-10"
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
  isLoading,
}: DualTimelineProps) {
  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
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
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          Dual Timeline
        </h2>
        <div className="text-sm text-gray-400">
          {topTimelineClips.length} main clips •{" "}
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
              Main Timeline
            </h3>
          </div>
          <div className="flex gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            {topTimelineClips.map((clip, index) => (
              <ClipCard
                key={`top-${clip.id}`}
                clip={clip}
                isSelected={clip.id === selectedClipId}
                isPlaying={index === currentPlayingIndex}
                onSelect={() => onSeekToClip(index)}
                position={index + 1}
              />
            ))}
          </div>
        </div>

        {/* Bottom Timeline - Upload Slots */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-300">
              Upload Timeline
            </h3>
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
                <div key={`empty-${index}`} className="flex-1 min-w-32 h-20" />
              );
            })}
          </div>
        </div>
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
          Click main clips to seek • Green border = now playing • Upload videos
          to bottom slots • Max 720p, 20MB
        </p>
      </div>
    </div>
  );
}
