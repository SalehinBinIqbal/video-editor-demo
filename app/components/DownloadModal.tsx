"use client";

import { Circle, X } from "lucide-react";

import classes from "./faltu.module.css";

interface DownloadModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
  onClose: () => void;
  currentVideo?: number;
  totalVideos?: number;
}

export function DownloadModal({
  isOpen,
  progress,
  status,
  onClose,
  currentVideo,
  totalVideos,
}: DownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">
            Processing Video
            {currentVideo && totalVideos
              ? ` (${currentVideo} of ${totalVideos})`
              : ""}
          </h3>
          {progress === 100 && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {status === "Complete!" ? (
                status
              ) : (
                <>
                  {status}{" "}
                  <span className="inline-flex gap-1">
                    <Circle
                      fill="currentColor"
                      size={5}
                      className="opacity-0 animate-[fadeIn_1s_ease-in-out_infinite_0.1s]"
                    />
                    <Circle
                      fill="currentColor"
                      size={5}
                      className="opacity-0 animate-[fadeIn_1s_ease-in-out_infinite_0.2s]"
                    />
                    <Circle
                      fill="currentColor"
                      size={5}
                      className="opacity-0 animate-[fadeIn_1s_ease-in-out_infinite_0.3s]"
                    />
                  </span>
                </>
              )}
            </span>
            {status === "Encoding videos" && (
              <span className="text-white font-medium">
                {Math.round(progress)}%
              </span>
            )}
          </div>

          {progress === 100 && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Video ready for download!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
