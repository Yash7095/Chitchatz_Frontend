import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, X, ImageIcon, Mic, Video } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const BookmarksPanel = ({ isOpen, onClose }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getBookmarks } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getBookmarks().then((data) => {
      setBookmarks(data || []);
      setLoading(false);
    });
  }, [isOpen]);

  const getOtherUser = (msg) => {
    const isMine = msg.senderId?._id === authUser._id || msg.senderId === authUser._id;
    return isMine ? msg.receiverId : msg.senderId;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed right-0 top-0 h-full w-80 bg-base-100 shadow-2xl z-50 flex flex-col border-l border-base-300/60"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300/60">
              <div className="flex items-center gap-2">
                <Bookmark className="size-4 text-primary" />
                <span className="font-semibold text-sm">Saved Messages</span>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                <X className="size-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="size-8 rounded-full bg-base-300 animate-pulse shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-20 bg-base-300 animate-pulse rounded" />
                        <div className="h-2 w-36 bg-base-300 animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && bookmarks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/30 px-6 text-center">
                  <Bookmark className="size-10 opacity-20" />
                  <p className="text-sm">No bookmarked messages yet.<br />Right-click any message to save it.</p>
                </div>
              )}

              {!loading && bookmarks.map((msg, i) => {
                const other = getOtherUser(msg);
                const isMine = msg.senderId?._id === authUser._id || msg.senderId === authUser._id;
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 26 }}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-base-200/50 transition-colors border-b border-base-300/30"
                  >
                    <img
                      src={other?.profilePic || "/avatar.png"}
                      alt={other?.fullName}
                      className="size-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-base-content/60 truncate">
                          {isMine ? "You" : other?.fullName}
                        </span>
                        <time className="text-[10px] text-base-content/30 shrink-0">
                          {formatMessageTime(msg.createdAt)}
                        </time>
                      </div>
                      <div className="text-xs text-base-content/70">
                        {msg.text ? (
                          <p className="line-clamp-2">{msg.text}</p>
                        ) : msg.image ? (
                          <span className="flex items-center gap-1 opacity-60"><ImageIcon className="size-3" /> Photo</span>
                        ) : msg.video ? (
                          <span className="flex items-center gap-1 opacity-60"><Video className="size-3" /> Video</span>
                        ) : msg.audio ? (
                          <span className="flex items-center gap-1 opacity-60"><Mic className="size-3" /> Voice note</span>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookmarksPanel;
