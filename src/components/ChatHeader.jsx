import { useState } from "react";
import { X, Pin, ArrowLeft, Sparkles, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useNavigate } from "react-router-dom";
import { formatLastSeen } from "../lib/utils.js";
import { useEffect } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, isTyping, pinnedMessages, getPinnedMessages, summarizeConversation } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();
  const isOnline = onlineUsers.includes(selectedUser._id);

  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    getPinnedMessages(selectedUser._id);
    setSummary(null);
    setShowSummary(false);
  }, [selectedUser._id]);

  const handleSummarize = async () => {
    if (isSummarizing) return;
    if (summary) { setShowSummary((v) => !v); return; }
    setIsSummarizing(true);
    setShowSummary(true);
    const text = await summarizeConversation();
    setSummary(text);
    setIsSummarizing(false);
  };

  const topPinned = pinnedMessages[0];

  const statusText = isTyping
    ? "typing…"
    : isOnline
    ? "Online"
    : selectedUser.lastSeen
    ? `Last seen ${formatLastSeen(selectedUser.lastSeen)}`
    : "Offline";

  return (
    <div className="border-b border-base-300 bg-base-100/80 backdrop-blur-md shrink-0">
      {/* Main header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Back button (mobile) */}
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-circle btn-sm sm:hidden text-base-content/60"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Avatar */}
        <div
          className="relative shrink-0 cursor-pointer group"
          onClick={() => navigate(`/user/${selectedUser._id}`)}
        >
          <img
            src={selectedUser.profilePic || "/avatar.png"}
            alt={selectedUser.fullName}
            className="size-10 rounded-full object-cover ring-2 ring-base-300 group-hover:ring-primary transition-all duration-200"
          />
          {isOnline && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100"
            />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm leading-tight truncate cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(`/user/${selectedUser._id}`)}
          >
            {selectedUser.fullName}
          </h3>
          <AnimatePresence mode="wait">
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className={`text-xs leading-tight transition-colors ${
                isTyping
                  ? "text-primary font-medium"
                  : isOnline
                  ? "text-green-500"
                  : "text-base-content/40"
              }`}
            >
              {statusText}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* AI Summary button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSummarize}
          title="AI conversation summary"
          className={`btn btn-ghost btn-circle btn-sm transition-colors ${showSummary ? "text-purple-500 bg-purple-500/10" : "text-base-content/40 hover:text-purple-500"}`}
        >
          {isSummarizing ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </motion.button>

        {/* Close (desktop) */}
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-circle btn-sm hidden sm:flex text-base-content/40 hover:text-base-content"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* AI Summary banner */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 px-4 py-2.5 bg-purple-500/5 border-t border-purple-500/10">
              <Sparkles className="size-3 text-purple-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-purple-500 mb-0.5">AI Summary</p>
                {isSummarizing ? (
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-base-300 animate-pulse rounded" />
                    <div className="h-2 w-3/4 bg-base-300 animate-pulse rounded" />
                  </div>
                ) : (
                  <p className="text-xs text-base-content/60 leading-relaxed">{summary}</p>
                )}
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="btn btn-ghost btn-xs btn-circle shrink-0 opacity-40 hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned message banner */}
      <AnimatePresence>
        {topPinned && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-t border-primary/10 text-xs">
              <Pin className="size-3 text-primary shrink-0" />
              <p className="truncate text-base-content/70 flex-1">
                <span className="font-semibold text-primary mr-1">Pinned:</span>
                {topPinned.text || (topPinned.image ? "📷 Photo" : topPinned.video ? "🎥 Video" : "🎵 Audio")}
              </p>
              {pinnedMessages.length > 1 && (
                <span className="text-base-content/30 shrink-0">{pinnedMessages.length} pinned</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatHeader;
