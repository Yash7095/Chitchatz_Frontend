import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const VoiceNote = ({ src }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setProgress(0); };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Animate progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      if (!audio.paused) {
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        animRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animRef.current);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * audio.duration;
    setProgress(pct * 100);
  };

  const formatSecs = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  // Simple fake waveform bars
  const bars = Array.from({ length: 28 }, (_, i) => {
    const heights = [3, 5, 8, 6, 9, 5, 7, 4, 8, 6, 9, 5, 4, 7, 8, 6, 9, 5, 7, 4, 6, 8, 5, 9, 6, 4, 7, 5];
    return heights[i % heights.length];
  });

  return (
    <div className="flex items-center gap-2 py-1 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        onClick={togglePlay}
        className="btn btn-circle btn-xs shrink-0 btn-ghost"
      >
        {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </button>

      {/* Waveform + seek */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div
          className="flex items-end gap-px h-8 cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((h, i) => {
            const filled = (i / bars.length) * 100 <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  filled ? "bg-current opacity-80" : "bg-current opacity-25"
                }`}
                style={{ height: `${h * 3}px` }}
              />
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-current/20 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
          <div
            className="h-full bg-current/60 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs opacity-50 shrink-0 tabular-nums">
        {isPlaying
          ? formatSecs(audioRef.current?.currentTime)
          : formatSecs(duration)}
      </span>
    </div>
  );
};

export default VoiceNote;
