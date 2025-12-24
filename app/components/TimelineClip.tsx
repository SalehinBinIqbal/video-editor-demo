"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { VideoClip } from "../types/editor";

interface TimelineClipProps {
  clip: VideoClip;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
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
 * Individual video clip in the timeline
 */
export function TimelineClip({
  clip,
  isSelected,
  onSelect,
  onRemove,
}: TimelineClipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: clip.id,
    disabled: clip.isDummy, // Dummy video cannot be dragged
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group shrink-0 w-40 h-24 rounded-lg overflow-hidden cursor-pointer
        border-2 transition-all duration-200
        ${isSelected ? "" : "border-gray-700 hover:border-gray-600"}
        ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"}
        ${
          clip.isDummy ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }
      `}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail */}
      <img
        src={clip.thumbnail}
        alt={clip.name}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Overlay with info */}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
        <p className="text-white text-xs font-medium truncate mb-1">
          {clip.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white text-xs font-mono bg-black/50 px-1.5 py-0.5 rounded">
            {formatDuration(clip.duration)}
          </span>

          {clip.isDummy && (
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
              Sample
            </span>
          )}
        </div>
      </div>

      {/* Delete button (only for non-dummy clips) */}
      {!clip.isDummy && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 
                   text-white rounded-full opacity-0 group-hover:opacity-100 
                   transition-opacity duration-200 flex items-center justify-center"
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
      )}

      {/* Drag indicator (only for non-dummy clips) */}
      {!clip.isDummy && (
        <div
          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 
                      transition-opacity duration-200 text-white bg-black/50 
                      rounded px-1.5 py-0.5"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z" />
          </svg>
        </div>
      )}
    </div>
  );
}
