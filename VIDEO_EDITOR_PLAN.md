# Simple Video Editor - Project Plan

A frontend-only video editor inspired by Canva Video Editor. Built with Next.js 16, React 19, and Tailwind CSS v4.

## 🎯 Core Features

- **Dual Timeline System**: Two synchronized timeline tracks
  - **Top Timeline**: 7 fixed sample videos (positions 1-7, non-removable)
  - **Bottom Timeline**: 3 user upload slots aligned with positions 2, 4, and 6
- **Slot-Based Upload**: Upload videos directly to specific slots (max 1 video per slot)
- **Video Constraints**: Minimum 720p resolution, maximum 20MB file size
- **Unified Scrolling**: Both timelines scroll together as a single unit
- **Flexible Width**: Timeline elements expand to fill container width
- **Preview**: Play any selected clip from either timeline
- **Download**: Export all videos merged in sequence with seamless playback

---

## 📋 Task Breakdown

### Task 1: Install Dependencies ✅

Install required packages for video processing and export functionality.

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add @ffmpeg/ffmpeg @ffmpeg/util
```

**Packages:**
| Package | Purpose | Status |
|---------|---------|--------|
| `@dnd-kit/core` | Drag and drop (currently unused) | Installed |
| `@dnd-kit/sortable` | Sortable lists (currently unused) | Installed |
| `@dnd-kit/utilities` | CSS utilities (currently unused) | Installed |
| `@ffmpeg/ffmpeg` | Browser-based video processing | ✅ Active |
| `@ffmpeg/util` | FFmpeg utility functions | ✅ Active |

---

### Task 2: Create Type Definitions ✅

Created `app/types/editor.ts` with TypeScript interfaces.

**Core Types:**

- `VideoClip` - Represents a video clip
  ```typescript
  {
    id: string;
    name: string;
    src: string; // URL or blob URL
    duration: number; // in seconds
    thumbnail: string; // base64 image
    isDummy: boolean; // true for top timeline videos
  }
  ```
- `TimelineSlot` - Represents an upload slot
  ```typescript
  {
    index: number; // 0, 1, or 2
    alignsWithPosition: number; // 2, 4, or 6
    clip: VideoClip | null; // null if empty
  }
  ```
- `EditorState` - Global state structure
- `ValidationResult` - Video validation result
- `VIDEO_CONSTRAINTS` - Validation constants

---

### Task 3: Create Video Editor State Hook ✅

Created `app/hooks/useVideoEditor.ts` for state management.

**Key Features:**

- **Top Timeline**: 7 fixed videos loaded from `/test.mp4`
- **Bottom Timeline**: 3 slots at positions 2, 4, 6
- **Video Validation**: File type, size (≤20MB), resolution (≥720p)
- **Thumbnail Generation**: Canvas-based preview generation
- **Clip Management**: Add to slot, remove from slot
- **Unified Playback**: Treats all main timeline videos as one sequence
- **Global Time Tracking**: `currentTime` represents position in total timeline
- **Total Duration**: Calculated as sum of all top timeline clip durations
- **Playback Controls**: Play, pause, seek across entire timeline
- **Export Sequence**: Merges top + bottom videos in correct order

**Functions:**

```typescript
addClipToSlot(file: File, slotIndex: number)
removeClipFromSlot(slotIndex: number)
selectClip(id: string)
play() / pause() / togglePlay() / seek(time: number)
clearError()
getAllClipsForExport(): VideoClip[]
```

---

### Task 4: Create Preview Component ✅

Created `app/components/Preview.tsx` for video playback.

**Features:**

- **Unified Playback**: All main timeline videos play as one continuous video
  - Videos play sequentially (auto-advances to next clip)
  - Global seek bar spans entire timeline duration
  - Seeking works across all videos seamlessly
  - Current clip indicator shows position (e.g., "2/7")
- HTML5 `<video>` element with controls
- Play/Pause toggle button (large overlay icon)
- Seekable progress bar with visual feedback
- Time display (MM:SS format) - current/total timeline duration
- **Volume Control**: Volume slider (0-100%) with mute/unmute button
  - Dynamic volume icons (muted, low volume, high volume)
  - Volume persists across video changes
- **Responsive Design**: Adapts layout for mobile and desktop
  - Mobile: Volume controls hidden
  - Desktop: Horizontal single-row layout with volume slider
  - Responsive text sizes and spacing
- Responsive 16:9 aspect ratio
- Loading state when clips are being fetched
- Auto-sync with editor state

**Controls Bar:**

- Progress slider showing total timeline duration
- Volume control (mute button + slider, hidden on mobile)
- Fully responsive on all screen sizes

**Props:**

```typescript
interface PreviewProps {
  clips: VideoClip[]; // All main timeline clips
  isPlaying: boolean; // Playback state
  globalTime: number; // Current position in total timeline
  totalDuration: number; // Sum of all clip durations
  onTimeUpdate: (time: number) => void;
  onEnded: () => void; // Called when all clips finish
  onPlay: () => void;
  onPause: () => void;
}
```

---

### Task 5: Create DualTimeline Component ✅

Created `app/components/DualTimeline.tsx` for dual timeline display.

**Features:**

- **Top Timeline Row**: Shows 7 fixed videos with position badges
- **Bottom Timeline Row**: Shows 3 upload slots aligned with grid
- **Unified Scrolling**: Both timelines scroll together (overflow-x-auto wrapper)
- **Flexible Width**: Elements use `flex-1 min-w-32` to fill container
- **Visual Alignment**: Grid overlay shows alignment positions
- **Upload Slots**: Inline file upload with validation
- **Delete Button**: Remove uploaded clips from slots
- **Click to Seek**: Clicking a main timeline clip seeks to its start time
- **Now Playing Highlight**: Green border and animated indicator on currently playing clip
- **Selection State**: Blue border for selected clips
- **Loading State**: Spinner during video processing

**Sub-components (internal):**

- `ClipCard` - Individual clip with thumbnail, duration, and playing indicator
- `UploadSlot` - Upload zone or uploaded clip with delete button

---

### Task 6: Legacy Components (Deprecated)

The following components exist but are no longer used:

- ❌ `Timeline.tsx` - Old single timeline (replaced by DualTimeline)
- ❌ `TimelineClip.tsx` - Old clip component (functionality merged into DualTimeline)
- ❌ `MediaUpload.tsx` - Old upload zone (now inline in DualTimeline)

These files can be safely removed in future cleanup.

---

### Task 7: Create Export Hook ✅

Created `app/hooks/useExport.ts` for video export functionality.

**Features:**

- Load FFmpeg.wasm on demand (~25MB)
- Progress tracking (0-100%)
- Re-encoding pipeline for seamless concatenation
- Browser download trigger
- Error handling and reporting

**Video Processing Pipeline:**

1. **Load FFmpeg** (on first export only)
2. **Fetch all videos** into virtual filesystem
3. **Re-encode each video** to consistent format:
   - Codec: H.264 (libx264) with CRF 23
   - Audio: AAC 128k, 44.1kHz stereo
   - Frame rate: 30fps
   - Pixel format: yuv420p
   - Preset: ultrafast
4. **Concatenate** normalized videos using concat demuxer
5. **Download** final merged video

**Why Re-encoding?**
Videos from different sources have incompatible formats. Re-encoding ensures:

- Same codec, frame rate, audio format
- Seamless playback at transition points
- No freezing or stuttering between clips

---

### Task 8: Compose Main Editor Page ✅

Updated `app/page.tsx` with complete editor layout.

**Layout Structure:**

```
┌─────────────────────────────────────────────────┐
│ Header [Title] [Export Button]                 │
├─────────────────────────────────────────────────┤
│                                                 │
│           Preview (16:9 aspect ratio)           │
│                                                 │
├─────────────────────────────────────────────────┤
│ DualTimeline Component                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ Top Timeline:    [V1][V2][V3][V4][V5][V6][V7]│ │
│ │ Bottom Timeline: [ ][U1][ ][U2][ ][U3][ ]   │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Info Cards: Total Clips | Duration | Status    │
├─────────────────────────────────────────────────┤
│ Footer                                          │
└─────────────────────────────────────────────────┘
```

**Sections:**

- Header with export button (disabled during export or no clips)
- Export error display (if any)
- Preview section (constrained width with max-w-7xl)
- DualTimeline section (constrained width with max-w-7xl)
- Upload error display (if any)
- Info cards section (currently commented out in code)
- Footer section (currently commented out in code)

**Note:** The Info cards and Footer sections exist in the code but are commented out and not currently rendered in the UI.

---

## 📁 Final Project Structure

```
app/
├── page.tsx                 # ✅ Main editor page
├── globals.css              # ✅ Global styles
├── layout.tsx               # ✅ Root layout
├── components/
│   ├── Preview.tsx          # ✅ Video preview player
│   ├── DualTimeline.tsx     # ✅ Dual timeline (top + bottom)
│   ├── Timeline.tsx         # ❌ [DEPRECATED] Old single timeline
│   ├── TimelineClip.tsx     # ❌ [DEPRECATED] Old clip component
│   └── MediaUpload.tsx      # ❌ [DEPRECATED] Old upload zone
├── hooks/
│   ├── useVideoEditor.ts    # ✅ Editor state management
│   └── useExport.ts         # ✅ FFmpeg export logic
└── types/
    └── editor.ts            # ✅ TypeScript interfaces
```

---

## ⚠️ Video Upload Constraints

| Constraint     | Value           | Validation                                 |
| -------------- | --------------- | ------------------------------------------ |
| Min Resolution | 720p (1280×720) | Check via `videoElement.videoWidth/Height` |
| Max File Size  | 20 MB           | Check via `file.size`                      |
| Allowed Types  | MP4, WebM, MOV  | Check via `file.type`                      |

**Validation Errors:**

- `INVALID_TYPE`: File is not a video
- `FILE_TOO_LARGE`: File exceeds 20MB
- `RESOLUTION_TOO_LOW`: Video is below 720p
- `LOAD_ERROR`: Video file is corrupted

---

## 🔧 Known Fixes & Improvements

### Video Concatenation Fix (Dec 2025)

**Problem:** When downloading merged videos, playback would freeze/get stuck after the first video.

**Root Cause:** Videos from different sources have incompatible formats (different codecs, frame rates, audio formats). FFmpeg's `-c copy` (stream copy) doesn't re-encode, so incompatible formats cause playback issues.

**Solution:** Implemented a two-step process:

1. **Normalize:** Re-encode all videos to identical format (H.264, AAC, 30fps, yuv420p)
2. **Concatenate:** Use concat demuxer with normalized videos

**Trade-off:** Slightly slower export (due to re-encoding) but guaranteed smooth playback across all video combinations.

---

### Dual Timeline System (Dec 2025)

**Change:** Switched from single timeline with drag-and-drop to dual timeline system.

**Architecture:**

- **Top Timeline:** 7 fixed sample videos (positions 1-7)
- **Bottom Timeline:** 3 upload slots at specific positions:
  - Slot 0 → Aligns with top position 2
  - Slot 1 → Aligns with top position 4
  - Slot 2 → Aligns with top position 6

**Export Sequence:**

```
Video 1 (top)
Video 2 (top) + Upload 1 (if exists)
Video 3 (top)
Video 4 (top) + Upload 2 (if exists)
Video 5 (top)
Video 6 (top) + Upload 3 (if exists)
Video 7 (top)
```

**Benefits:**

- Structured layout with fixed positions
- Easy to understand alignment system
- Single video per slot (no complex reordering)
- Clear visual indication of upload positions

---

### Timeline Width & Scrolling Fix (Dec 2025)

**Problems:**

1. Timeline elements had fixed width (`w-32`) causing unused space on large screens
2. Top and bottom timelines scrolled independently
3. Duplicate React keys causing rendering errors

**Solutions:**

1. **Flexible Width:** Changed all timeline elements to `flex-1 min-w-32`

   - Elements expand to fill container width
   - Minimum width of 128px (w-32) maintained for readability
   - Responsive to different screen sizes

2. **Unified Scrolling:** Wrapped both timelines in single scrollable container

   - Added `overflow-x-auto` to parent wrapper
   - Added `min-w-max` to prevent content wrapping
   - Both timelines scroll together as one unit

3. **Unique Keys:** Prefixed all React keys with context identifiers
   - Top timeline: `top-${clip.id}`
   - Grid alignment: `grid-${index}`
   - Upload slots: `slot-${slot.index}`
   - Empty placeholders: `empty-${index}`

**Result:** Better UX on all screen sizes with synchronized scrolling and no React warnings.

---

### Unified Timeline Playback (Dec 2025)

**Change:** Main timeline videos now play as a single unified sequence instead of individual clips.

**Implementation:**

- **Global Time Tracking:** `currentTime` now represents position in the entire timeline (sum of all clip durations)
- **Sequential Playback:** Videos automatically advance to next clip when current one ends
- **Cross-Video Seeking:** Seeking to any position loads the correct clip and seeks within it
- **Clip Position Calculation:** Helper functions determine which clip plays at any global time

**Key Functions in Preview Component:**

```typescript
getClipAtTime(clips, globalTime) → { clipIndex, localTime }
getClipStartTime(clips, clipIndex) → startTime
```

**User Experience:**

- Progress bar shows total timeline duration
- Current time reflects position in entire sequence
- Current clip indicator shows "2/7" style position
- Seamless transition between clips during playback
- Seeking anywhere on the timeline works intuitively

**Benefits:**

- Preview matches export behavior (all videos as one)
- More intuitive playback experience
- Single progress bar for entire project
- Easy to navigate to any point in the timeline

---

### Seamless Video Transitions (Dec 2025)

**Problem:** When one clip ends and another begins, there was a noticeable black screen/lag during the transition. This occurred because the next video needed to load before it could play.

**Solution:** Implemented a dual-video element architecture with preloading and instant swapping.

**Architecture:**

```typescript
// Two video elements stacked on top of each other
videoARef; // Primary video element
videoBRef; // Secondary video element
activeVideo: "A" | "B"; // Which one is currently visible
```

**How It Works:**

1. **Preloading:** When playing clip N, the inactive video element preloads clip N+1 in the background
2. **Ready Check:** When clip N ends, check if clip N+1 is ready (`readyState >= 3`)
3. **Instant Swap:** If ready, swap which video is visible (toggle A↔B) - no loading delay
4. **Fallback:** If not ready, use standard loading (only happens on slow connections)

**CSS Implementation:**

```css
/* Active video: visible and on top */
.active {
  opacity: 100%;
  z-index: 10;
}

/* Inactive video: hidden, preloading in background */
.inactive {
  opacity: 0%;
  z-index: 0;
}

/* Smooth 75ms transition for visual blending */
transition-opacity: 75ms;
```

**Key Code Points:**

- `loadClip()` - Checks if preloaded video is ready before deciding to swap or load
- Preload effect - Triggers when `currentClipIndex` changes to load next clip
- Volume/mute applied to both video elements for consistent audio
- Event handlers (`onTimeUpdate`, `onEnded`) only active on the visible video

**Benefits:**

- Zero black screen between clips (when preload succeeds)
- Seamless playback experience matching professional editors
- No impact on seeking functionality (preload only used for sequential playback)
- Graceful fallback when preloading isn't complete

---

### Playback Restart Logic Fix (Dec 2025)

**Problem:** After the last video finished playing and playback stopped, clicking play again would resume from the last video's position instead of restarting from the beginning. This behavior was confusing as users expected the video to restart.

**Root Cause:** The video player didn't distinguish between two different scenarios:

1. User manually paused mid-video (should resume from pause point)
2. All videos finished playing naturally (should restart from beginning)

**Solution:** Implemented playback state tracking with `hasEndedRef` to differentiate between manual pause and natural end.

**Implementation:**

```typescript
// Track whether playback has truly reached the end
const hasEndedRef = useRef(false);

// When last clip finishes naturally
if (currentClipIndex === clips.length - 1) {
  hasEndedRef.current = true; // Mark as ended
  onEnded();
}

// When user clicks play
if (isPlaying && hasEndedRef.current) {
  // Reset to beginning if playback had ended
  hasEndedRef.current = false;
  setCurrentClipIndex(0);
  loadClip(0, 0, true);
  onTimeUpdate(0);
}

// Clear flag when seeking
const handleSeek = () => {
  hasEndedRef.current = false; // Allow playback to continue from seek position
  // ...rest of seek logic
};
```

**Behavior After Fix:**

- ✅ **Manual pause mid-video → Play** → Resumes from pause point
- ✅ **Last video ends → Play** → Restarts from the beginning
- ✅ **Seek anywhere → Play** → Plays from seek position
- ✅ **Natural end state persists** until user interacts (play/seek)

**User Experience:**

- Intuitive restart behavior when all content finishes
- Preserves expected pause/resume functionality
- No confusion about playback position
- Matches behavior of professional video players

---

---

## 🚀 Implementation Status

1. ✅ Task 1: Install dependencies
2. ✅ Task 2: Create type definitions
3. ✅ Task 3: Create editor state hook
4. ✅ Task 4: Create Preview component
5. ✅ Task 5: Create DualTimeline component
6. ❌ Task 6: Legacy components (deprecated)
7. ✅ Task 7: Create Export hook
8. ✅ Task 8: Compose main page

**Additional Improvements:**

- ✅ Video concatenation fix (re-encoding pipeline)
- ✅ Dual timeline architecture
- ✅ Flexible width timeline elements
- ✅ Unified timeline scrolling
- ✅ Unique React keys for all elements
- ✅ Upload alignment with main timeline
- ✅ Volume control with mute/unmute
- ✅ Responsive video player controls
- ✅ Unified timeline playback (all main clips as one)
- ✅ Click-to-seek on timeline clips
- ✅ Now playing highlight (green border with animation)
- ✅ Seamless video transitions (dual-video preloading)
- ✅ Playback restart logic (smart resume vs. restart behavior)

---

## 📝 Technical Notes

- **No Backend Required:** All processing happens in the browser
- **FFmpeg.wasm:** ~25MB download, loaded on-demand when exporting
- **Memory Management:** Videos stored as blob URLs in memory
- **Sample Videos:** Uses `/test.mp4` for top timeline (must exist in public folder)
- **Browser Compatibility:** Modern browsers with WASM support required
- **Tailwind v4:** Uses new CSS-first syntax (`bg-linear-to-*` instead of `bg-gradient-*`)
- **Video Controls:** Native HTML5 video element with custom controls overlay
- **Volume Persistence:** Volume settings maintained across video clip changes
- **Responsive Design:** Mobile-first approach with breakpoints for tablet/desktop layouts

---

## 🔮 Future Enhancements

- Add fullscreen mode with auto-hide controls
- Add video trimming functionality
- Support more upload slots
- Add text/overlay capabilities
- Implement video effects/filters
- Add audio track support
- Persistent storage (IndexedDB)
- Batch export functionality
- Playback speed control
- Keyboard shortcuts for controls
- Custom video templates
- Enable Info cards section (currently commented out)
- Enable Footer section (currently commented out)
