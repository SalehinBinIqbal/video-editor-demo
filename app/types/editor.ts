/**
 * Represents a video clip in the timeline
 */
export interface VideoClip {
  /** Unique identifier for the clip */
  id: string;

  /** Display name of the video file */
  name: string;

  /** Video source URL (blob URL or CDN URL) */
  src: string;

  /** Duration of the video in seconds */
  duration: number;

  /** Thumbnail image URL for timeline preview */
  thumbnail: string;

  /** Whether this is the default dummy video */
  isDummy: boolean;
}

/**
 * Represents a slot in the bottom timeline for user uploads
 */
export interface TimelineSlot {
  /** Slot index (0-based) */
  index: number;

  /** Position it aligns with in top timeline (1-based: 2, 4, 6) */
  alignsWithPosition: number;

  /** User uploaded video clip, if any */
  clip: VideoClip | null;
}

/**
 * Global editor state
 */
export interface EditorState {
  /** Fixed videos in the top timeline */
  topTimelineClips: VideoClip[];

  /** User upload slots in the bottom timeline */
  bottomTimelineSlots: TimelineSlot[];

  /** ID of the currently selected clip for preview */
  selectedClipId: string | null;

  /** Whether the video is currently playing */
  isPlaying: boolean;

  /** Current playback position in seconds */
  currentTime: number;
}

/**
 * Video validation constraints
 */
export const VIDEO_CONSTRAINTS = {
  /** Maximum file size in bytes (20 MB) */
  MAX_FILE_SIZE: 20 * 1024 * 1024,

  /** Minimum video width in pixels */
  MIN_WIDTH: 1280,

  /** Minimum video height in pixels */
  MIN_HEIGHT: 720,

  /** Allowed video MIME types */
  ALLOWED_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
};

/**
 * Video validation error types
 */
export type VideoValidationError =
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "RESOLUTION_TOO_LOW"
  | "LOAD_ERROR";

/**
 * Result of video validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: VideoValidationError;
  errorMessage?: string;
}
