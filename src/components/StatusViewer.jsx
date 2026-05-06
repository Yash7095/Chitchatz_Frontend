import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Trash2, Eye } from "lucide-react";
import { useStatusStore } from "../store/useStatusStore.js";
import { useAuthStore } from "../store/useAuthStore.js";

const STATUS_DURATION = 5000; // 5s per status

const StatusViewer = () => {
  const {
    viewerOpen, viewerGroupIdx, viewerStatusIdx,
    statusGroups, closeViewer, nextStatus, prevStatus,
    viewStatus, deleteStatus,
  } = useStatusStore();
  const { authUser } = useAuthStore();

  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const group = statusGroups[viewerGroupIdx];
  const status = group?.statuses[viewerStatusIdx];
  const isOwn = status?.userId?._id === authUser?._id || status?.userId === authUser?._id;

  // Progress bar + auto-advance
  useEffect(() => {
    if (!viewerOpen || !status) return;

    viewStatus(status._id);
    setProgress(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STATUS_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        nextStatus();
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [viewerOpen, viewerGroupIdx, viewerStatusIdx]);

  if (!viewerOpen || !status) return null;

  const handleDelete = async () => {
    await deleteStatus(status._id);
    nextStatus();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
          {group.statuses.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < viewerStatusIdx ? "100%" : i === viewerStatusIdx ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <img
              src={group.user.profilePic || "/avatar.png"}
              alt={group.user.fullName}
              className="size-9 rounded-full border-2 border-white"
            />
            <div>
              <p className="text-white text-sm font-semibold">{group.user.fullName}</p>
              <p className="text-white/60 text-xs">
                {new Date(status.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwn && (
              <>
                <div className="flex items-center gap-1 text-white/70 text-xs">
                  <Eye className="size-3.5" />
                  {status.viewers?.length || 0}
                </div>
                <button onClick={handleDelete} className="text-white/70 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
            <button onClick={closeViewer} className="text-white/70 hover:text-white transition-colors p-1">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="w-full max-w-sm mx-auto relative h-full flex items-center justify-center">
          {status.mediaType === "image" ? (
            <img
              src={status.mediaUrl}
              alt="status"
              className="max-h-screen w-full object-contain"
            />
          ) : (
            <video
              src={status.mediaUrl}
              autoPlay
              muted
              className="max-h-screen w-full object-contain"
            />
          )}

          {/* Caption */}
          {status.caption && (
            <div className="absolute bottom-16 left-0 right-0 px-6">
              <p className="text-white text-center text-sm bg-black/50 rounded-xl px-4 py-2 backdrop-blur-sm">
                {status.caption}
              </p>
            </div>
          )}

          {/* Tap zones */}
          <button
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
            onClick={prevStatus}
          />
          <button
            className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
            onClick={nextStatus}
          />
        </div>

        {/* Side nav arrows (desktop) */}
        <button
          onClick={prevStatus}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors hidden md:flex"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          onClick={nextStatus}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors hidden md:flex"
        >
          <ChevronRight className="size-6" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusViewer;
