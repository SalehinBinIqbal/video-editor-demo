"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { VideoClip } from "../types/editor";
import { TimelineClip } from "./TimelineClip";

interface TimelineProps {
  clips: VideoClip[];
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onRemoveClip: (id: string) => void;
  onReorderClips: (activeId: string, overId: string) => void;
}

/**
 * Timeline component with draggable video clips
 */
export function Timeline({
  clips,
  selectedClipId,
  onSelectClip,
  onRemoveClip,
  onReorderClips,
}: TimelineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorderClips(active.id as string, over.id as string);
    }
  };

  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const formatTotalDuration = () => {
    const mins = Math.floor(totalDuration / 60);
    const secs = Math.floor(totalDuration % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
          Timeline
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            {clips.length} {clips.length === 1 ? "clip" : "clips"}
          </div>
          <div className="text-sm font-mono text-gray-300 bg-gray-700 px-3 py-1 rounded">
            Total: {formatTotalDuration()}
          </div>
        </div>
      </div>

      {/* Timeline Track */}
      <div className="p-4">
        {clips.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
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
              <p>No clips in timeline</p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={clips.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {clips.map((clip) => (
                  <TimelineClip
                    key={clip.id}
                    clip={clip}
                    isSelected={clip.id === selectedClipId}
                    onSelect={() => onSelectClip(clip.id)}
                    onRemove={() => onRemoveClip(clip.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
          Click to select • Drag to reorder • Hover to delete (except sample
          video)
        </p>
      </div>
    </div>
  );
}
