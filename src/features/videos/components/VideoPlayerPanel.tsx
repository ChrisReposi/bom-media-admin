import {
  Database,
  Expand,
  FastForward,
  Loader2,
  Pause,
  Play,
  Rewind,
  Server,
  Shrink,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getDefaultThumbnailUrlFromPlaybackUrl } from "../cloudinaryVideoUtils";
import {
  getDatabaseVideoBinaryBlob,
  getLocalVideoFileBlob,
  getLocalVideoThumbnailBlob,
} from "../videoApi";
import { formatDuration } from "../videoFormatters";
import type { VideoAsset } from "../videoTypes";

type VideoPlayerPanelProps = {
  video: VideoAsset;
};

const SEEK_STEP_SECONDS = 5;
const SKIP_STEP_SECONDS = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getFiniteDuration(videoElement: HTMLVideoElement): number {
  return Number.isFinite(videoElement.duration) && videoElement.duration > 0
    ? videoElement.duration
    : 0;
}

function getBufferedTime(videoElement: HTMLVideoElement): number {
  const duration = getFiniteDuration(videoElement);

  if (duration <= 0 || videoElement.buffered.length === 0) {
    return 0;
  }

  const currentTime = videoElement.currentTime || 0;

  for (let index = 0; index < videoElement.buffered.length; index += 1) {
    const start = videoElement.buffered.start(index);
    const end = videoElement.buffered.end(index);

    if (currentTime >= start && currentTime <= end) {
      return clamp(end, 0, duration);
    }
  }

  return clamp(
    videoElement.buffered.end(videoElement.buffered.length - 1),
    0,
    duration,
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

export function VideoPlayerPanel({ video }: VideoPlayerPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSeekingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds ?? 0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [databaseObjectUrl, setDatabaseObjectUrl] = useState<string | null>(
    null,
  );
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [localThumbnailObjectUrl, setLocalThumbnailObjectUrl] = useState<
    string | null
  >(null);
  const [isDatabasePreviewLoading, setIsDatabasePreviewLoading] =
    useState(false);
  const [isLocalPreviewLoading, setIsLocalPreviewLoading] = useState(false);
  const [databasePreviewError, setDatabasePreviewError] = useState<
    string | null
  >(null);
  const [localPreviewError, setLocalPreviewError] = useState<string | null>(
    null,
  );
  const isDatabaseVideo = video.sourceType === "DB_BLOB";
  const isLocalFileVideo = video.sourceType === "LOCAL_FILE";
  const directPlaybackUrl = isDatabaseVideo
    ? databaseObjectUrl
    : isLocalFileVideo
      ? localObjectUrl
      : video.playbackUrl;
  const displayTime =
    isSeeking && seekPreviewTime !== null ? seekPreviewTime : currentTime;
  const canSeek = duration > 0 && Number.isFinite(duration);
  const playedPercent = canSeek
    ? clamp((displayTime / duration) * 100, 0, 100)
    : 0;
  const bufferedPercent = canSeek
    ? clamp((bufferedTime / duration) * 100, 0, 100)
    : 0;
  const seekSliderStyle = {
    background: `linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.95) ${playedPercent}%, rgba(255,255,255,0.48) ${playedPercent}%, rgba(255,255,255,0.48) ${Math.max(
      playedPercent,
      bufferedPercent,
    )}%, rgba(255,255,255,0.22) ${Math.max(
      playedPercent,
      bufferedPercent,
    )}%, rgba(255,255,255,0.22) 100%)`,
  };

  const posterUrl = useMemo(() => {
    if (isLocalFileVideo && localThumbnailObjectUrl) {
      return localThumbnailObjectUrl;
    }

    if (isLocalFileVideo && video.localThumbnailAsset) {
      return null;
    }

    if (video.thumbnailUrl) {
      return video.thumbnailUrl;
    }

    return video.playbackUrl
      ? getDefaultThumbnailUrlFromPlaybackUrl(video.playbackUrl)
      : null;
  }, [
    isLocalFileVideo,
    localThumbnailObjectUrl,
    video.playbackUrl,
    video.thumbnailUrl,
  ]);

  useEffect(() => {
    if (!isDatabaseVideo) {
      setDatabaseObjectUrl(null);
      setDatabasePreviewError(null);
      setIsDatabasePreviewLoading(false);
      return;
    }

    let isCancelled = false;
    let nextObjectUrl: string | null = null;

    setDatabaseObjectUrl(null);
    setDatabasePreviewError(null);
    setIsDatabasePreviewLoading(true);

    void getDatabaseVideoBinaryBlob(video.id)
      .then((blob) => {
        if (isCancelled) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setDatabaseObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (!isCancelled) {
          setDatabasePreviewError(
            "Không thể tải preview database video bằng phiên admin hiện tại.",
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsDatabasePreviewLoading(false);
        }
      });

    return () => {
      isCancelled = true;

      if (nextObjectUrl !== null) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [isDatabaseVideo, video.id]);

  useEffect(() => {
    if (!isLocalFileVideo) {
      setLocalObjectUrl(null);
      setLocalPreviewError(null);
      setIsLocalPreviewLoading(false);
      return;
    }

    let isCancelled = false;
    let nextObjectUrl: string | null = null;

    setLocalObjectUrl(null);
    setLocalPreviewError(null);
    setIsLocalPreviewLoading(true);

    void getLocalVideoFileBlob(video)
      .then((blob) => {
        if (isCancelled) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setLocalObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (!isCancelled) {
          setLocalPreviewError(
            "Không thể tải preview server storage video bằng phiên admin hiện tại.",
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLocalPreviewLoading(false);
        }
      });

    return () => {
      isCancelled = true;

      if (nextObjectUrl !== null) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [isLocalFileVideo, video.id, video.localPlaybackUrl]);

  useEffect(() => {
    if (!isLocalFileVideo || !video.localThumbnailAsset) {
      setLocalThumbnailObjectUrl(null);
      return;
    }

    let isCancelled = false;
    let nextObjectUrl: string | null = null;

    setLocalThumbnailObjectUrl(null);

    void getLocalVideoThumbnailBlob(video)
      .then((blob) => {
        if (isCancelled) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setLocalThumbnailObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (!isCancelled) {
          setLocalThumbnailObjectUrl(null);
        }
      });

    return () => {
      isCancelled = true;

      if (nextObjectUrl !== null) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [
    isLocalFileVideo,
    video.id,
    video.localThumbnailAsset,
    video.thumbnailUrl,
  ]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    function syncTime(): void {
      if (!videoElement) {
        return;
      }

      if (!isSeekingRef.current) {
        setCurrentTime(videoElement.currentTime || 0);
      }

      setBufferedTime(getBufferedTime(videoElement));
    }

    function syncMetadata(): void {
      if (!videoElement) {
        return;
      }

      const nextDuration = getFiniteDuration(videoElement);
      setDuration(nextDuration || video.durationSeconds || 0);
      setBufferedTime(getBufferedTime(videoElement));
    }

    function syncPlay(): void {
      setIsPlaying(true);
      setPlaybackError(null);
      setIsBuffering(false);
    }

    function syncPause(): void {
      setIsPlaying(false);
    }

    function syncVolume(): void {
      if (!videoElement) {
        return;
      }

      setIsMuted(videoElement.muted);
      setVolume(videoElement.volume);
    }

    function syncBuffering(): void {
      setIsBuffering(true);
    }

    function syncCanPlay(): void {
      if (!videoElement) {
        return;
      }

      setIsBuffering(false);
      setPlaybackError(null);
      setBufferedTime(getBufferedTime(videoElement));
    }

    function syncError(): void {
      setIsBuffering(false);
      setIsPlaying(false);
      setPlaybackError("Không thể tải video preview.");
      toast.error("Không thể tải video preview.");
    }

    videoElement.addEventListener("timeupdate", syncTime);
    videoElement.addEventListener("loadedmetadata", syncMetadata);
    videoElement.addEventListener("durationchange", syncMetadata);
    videoElement.addEventListener("progress", syncTime);
    videoElement.addEventListener("play", syncPlay);
    videoElement.addEventListener("pause", syncPause);
    videoElement.addEventListener("volumechange", syncVolume);
    videoElement.addEventListener("waiting", syncBuffering);
    videoElement.addEventListener("stalled", syncBuffering);
    videoElement.addEventListener("playing", syncCanPlay);
    videoElement.addEventListener("canplay", syncCanPlay);
    videoElement.addEventListener("ended", syncPause);
    videoElement.addEventListener("error", syncError);

    setCurrentTime(0);
    setDuration(video.durationSeconds ?? 0);
    setBufferedTime(0);
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackError(null);
    setSeekPreviewTime(null);
    setIsSeeking(false);
    isSeekingRef.current = false;
    setIsMuted(videoElement.muted);
    setVolume(videoElement.volume);

    return () => {
      videoElement.removeEventListener("timeupdate", syncTime);
      videoElement.removeEventListener("loadedmetadata", syncMetadata);
      videoElement.removeEventListener("durationchange", syncMetadata);
      videoElement.removeEventListener("progress", syncTime);
      videoElement.removeEventListener("play", syncPlay);
      videoElement.removeEventListener("pause", syncPause);
      videoElement.removeEventListener("volumechange", syncVolume);
      videoElement.removeEventListener("waiting", syncBuffering);
      videoElement.removeEventListener("stalled", syncBuffering);
      videoElement.removeEventListener("playing", syncCanPlay);
      videoElement.removeEventListener("canplay", syncCanPlay);
      videoElement.removeEventListener("ended", syncPause);
      videoElement.removeEventListener("error", syncError);
    };
  }, [directPlaybackUrl, video.durationSeconds]);

  useEffect(() => {
    function syncFullscreen(): void {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  async function togglePlayback(): Promise<void> {
    const videoElement = videoRef.current;
    if (!videoElement || !directPlaybackUrl) {
      return;
    }

    try {
      if (videoElement.paused) {
        await videoElement.play();
      } else {
        videoElement.pause();
      }
    } catch {
      toast.error("Không thể phát video. Vui lòng thử lại.");
    }
  }

  function toggleMute(): void {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    if (videoElement.muted && videoElement.volume === 0) {
      videoElement.volume = 0.7;
    }

    videoElement.muted = !videoElement.muted;
    setIsMuted(videoElement.muted);
    setVolume(videoElement.volume);
  }

  function clampTime(value: number): number {
    const maxTime = canSeek ? duration : 0;

    if (!Number.isFinite(value)) {
      return 0;
    }

    return clamp(value, 0, maxTime);
  }

  function seekTo(value: number): void {
    const videoElement = videoRef.current;
    if (!videoElement || !canSeek) {
      return;
    }

    const nextTime = clampTime(value);
    videoElement.currentTime = nextTime;
    setCurrentTime(nextTime);
    setSeekPreviewTime(nextTime);
    setBufferedTime(getBufferedTime(videoElement));
  }

  function beginSeek(value: number): void {
    if (!canSeek) {
      return;
    }

    const nextTime = clampTime(value);
    isSeekingRef.current = true;
    setIsSeeking(true);
    setSeekPreviewTime(nextTime);
  }

  function updateSeekPreview(value: number): void {
    const nextTime = clampTime(value);

    if (!isSeekingRef.current) {
      seekTo(nextTime);
      return;
    }

    setSeekPreviewTime(nextTime);
  }

  function commitSeek(value: number): void {
    if (!canSeek) {
      return;
    }

    const nextTime = clampTime(value);
    isSeekingRef.current = false;
    setIsSeeking(false);
    setSeekPreviewTime(null);
    seekTo(nextTime);
  }

  function updateVolume(value: number): void {
    const videoElement = videoRef.current;
    if (!videoElement || !Number.isFinite(value)) {
      return;
    }

    const nextVolume = clamp(value, 0, 1);
    videoElement.volume = nextVolume;
    videoElement.muted = nextVolume === 0 ? true : false;
    setVolume(nextVolume);
    setIsMuted(videoElement.muted);
  }

  async function toggleFullscreen(): Promise<void> {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (!container.requestFullscreen) {
        toast.warning("Trình duyệt không hỗ trợ fullscreen.");
        return;
      }

      await container.requestFullscreen();
    } catch {
      toast.warning("Không thể bật fullscreen.");
    }
  }

  function handlePlayerKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (event.key === " " || key === "k") {
      event.preventDefault();
      void togglePlayback();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekTo(currentTime - SEEK_STEP_SECONDS);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekTo(currentTime + SEEK_STEP_SECONDS);
      return;
    }

    if (key === "m") {
      event.preventDefault();
      toggleMute();
      return;
    }

    if (key === "f") {
      event.preventDefault();
      void toggleFullscreen();
    }
  }

  if (video.sourceType === "EMBED" || video.embedUrl) {
    if (!video.embedUrl) {
      return (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-sm text-[var(--admin-text)]">
          Video nhúng chưa có embed URL
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-[var(--admin-border)] bg-black shadow-sm">
        <div className="aspect-video">
          <iframe
            allow={
              video.embedAllow ||
              "autoplay; fullscreen; encrypted-media; picture-in-picture"
            }
            allowFullScreen
            className="h-full w-full"
            src={video.embedUrl}
            title={video.title}
          />
        </div>
        <div className="border-t border-white/10 bg-black px-4 py-2 text-xs text-white/70">
          Thanh điều khiển phát do trình phát nhúng cung cấp.
        </div>
      </div>
    );
  }

  if (isDatabaseVideo && isDatabasePreviewLoading) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-center text-sm text-[var(--admin-text)]">
        <Loader2 className="size-6 animate-spin text-[var(--admin-primary)]" />
        <span>Đang tải protected database preview...</span>
      </div>
    );
  }

  if (isDatabaseVideo && databasePreviewError) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-6 text-center text-sm text-[var(--admin-text)]">
        <Database className="size-7 text-[var(--admin-text-muted)]" />
        <span>{databasePreviewError}</span>
      </div>
    );
  }

  if (isLocalFileVideo && isLocalPreviewLoading) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-center text-sm text-[var(--admin-text)]">
        <Loader2 className="size-6 animate-spin text-[var(--admin-primary)]" />
        <span>Đang tải protected server storage preview...</span>
      </div>
    );
  }

  if (isLocalFileVideo && localPreviewError) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-6 text-center text-sm text-[var(--admin-text)]">
        <Server className="size-7 text-[var(--admin-text-muted)]" />
        <span>{localPreviewError}</span>
      </div>
    );
  }

  if (!directPlaybackUrl) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-6 text-center text-sm text-[var(--admin-text)]">
        {isDatabaseVideo ? (
          <Database className="size-7 text-[var(--admin-text-muted)]" />
        ) : isLocalFileVideo ? (
          <Server className="size-7 text-[var(--admin-text-muted)]" />
        ) : null}
        <span>
          {isDatabaseVideo
            ? "Video đang lưu trong cơ sở dữ liệu, nhưng bản xem trước cho quản trị viên hiện không khả dụng."
            : isLocalFileVideo
              ? "Video đang lưu trên server storage, nhưng bản xem trước cho quản trị viên hiện không khả dụng."
              : "Video chưa có playback URL."}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label="Video player"
      className="group relative aspect-video overflow-hidden rounded-lg border border-[var(--admin-border)] bg-black shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
      tabIndex={0}
      onKeyDown={handlePlayerKeyDown}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        poster={posterUrl ?? undefined}
        preload="metadata"
        src={directPlaybackUrl}
        onClick={() => void togglePlayback()}
      />

      {isBuffering ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/18">
          <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <Loader2 className="size-4 animate-spin" />
            Đang tải...
          </div>
        </div>
      ) : null}

      {playbackError ? (
        <div className="absolute inset-x-4 top-4 rounded-lg border border-red-400/40 bg-red-950/80 px-4 py-3 text-sm text-white shadow-lg">
          {playbackError}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 opacity-100 transition md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <div className="pointer-events-auto space-y-3">
          <div>
            <input
              aria-label="Seek video"
              id="video-player-seek"
              name="videoPlayerSeek"
              aria-valuemax={duration || 0}
              aria-valuemin={0}
              aria-valuenow={displayTime}
              aria-valuetext={`${formatDuration(displayTime)} of ${formatDuration(duration)}`}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-white outline-none transition focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSeek}
              max={duration || 0}
              min={0}
              step={0.1}
              style={seekSliderStyle}
              type="range"
              value={displayTime}
              onBlur={() => {
                if (isSeekingRef.current) {
                  commitSeek(seekPreviewTime ?? displayTime);
                }
              }}
              onChange={(event) =>
                updateSeekPreview(Number(event.currentTarget.value))
              }
              onPointerCancel={() => commitSeek(seekPreviewTime ?? displayTime)}
              onPointerDown={(event) =>
                beginSeek(Number(event.currentTarget.value))
              }
              onPointerUp={(event) =>
                commitSeek(Number(event.currentTarget.value))
              }
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                aria-label={isPlaying ? "Pause" : "Play"}
                className="size-9 rounded-full border-white/20 bg-white/12 text-white hover:bg-white/22"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => void togglePlayback()}
              >
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>

              <Button
                aria-label="Back 10 seconds"
                className="size-9 rounded-full border-white/20 bg-white/12 text-white hover:bg-white/22"
                disabled={!canSeek}
                size="icon"
                type="button"
                variant="outline"
                onClick={() => seekTo(currentTime - SKIP_STEP_SECONDS)}
              >
                <Rewind className="size-4" />
              </Button>

              <Button
                aria-label="Forward 10 seconds"
                className="size-9 rounded-full border-white/20 bg-white/12 text-white hover:bg-white/22"
                disabled={!canSeek}
                size="icon"
                type="button"
                variant="outline"
                onClick={() => seekTo(currentTime + SKIP_STEP_SECONDS)}
              >
                <FastForward className="size-4" />
              </Button>

              <span className="rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">
                {formatDuration(displayTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="size-9 rounded-full border-white/20 bg-white/12 text-white hover:bg-white/22"
                size="icon"
                type="button"
                variant="outline"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Button>

              <input
                aria-label="Volume"
                id="video-player-volume"
                name="videoPlayerVolume"
                aria-valuemax={1}
                aria-valuemin={0}
                aria-valuenow={isMuted ? 0 : volume}
                className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-white outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:w-24"
                max={1}
                min={0}
                step={0.05}
                type="range"
                value={isMuted ? 0 : volume}
                onChange={(event) =>
                  updateVolume(Number(event.currentTarget.value))
                }
              />

              <Button
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className={cn(
                  "size-9 rounded-full border-white/20 bg-white/12 text-white hover:bg-white/22",
                  isFullscreen && "bg-white/22",
                )}
                size="icon"
                type="button"
                variant="outline"
                onClick={() => void toggleFullscreen()}
              >
                {isFullscreen ? (
                  <Shrink className="size-4" />
                ) : (
                  <Expand className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
