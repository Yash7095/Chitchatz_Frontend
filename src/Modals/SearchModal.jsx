import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MessageSquare, ImageIcon, Mic } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const { searchMessages } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const data = await searchMessages(query);
      setResults(data);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
          >
            <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300/60 overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-base-300/60">
                <Search className="size-4 text-base-content/40 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search messages..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-base-content/30"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="btn btn-ghost btn-xs btn-circle">
                    <X className="size-3.5" />
                  </button>
                )}
                <kbd className="kbd kbd-sm hidden sm:inline-flex">Esc</kbd>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {isSearching && (
                  <div className="flex flex-col gap-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-base-300 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-24 bg-base-300 animate-pulse rounded" />
                          <div className="h-2 w-40 bg-base-300 animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isSearching && results.length === 0 && query.length >= 2 && (
                  <div className="py-12 text-center text-base-content/40 text-sm">
                    No messages found for "{query}"
                  </div>
                )}

                {!isSearching && results.length === 0 && query.length < 2 && (
                  <div className="py-10 text-center text-base-content/30 text-sm">
                    Type at least 2 characters to search
                  </div>
                )}

                {!isSearching && results.map((msg, i) => {
                  const other = getOtherUser(msg);
                  const isMine = msg.senderId?._id === authUser._id || msg.senderId === authUser._id;
                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-base-200/60 transition-colors cursor-pointer"
                      onClick={onClose}
                    >
                      <img
                        src={other?.profilePic || "/avatar.png"}
                        alt={other?.fullName}
                        className="size-9 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-base-content/70 truncate">
                            {isMine ? "You" : other?.fullName || "Unknown"} → {isMine ? other?.fullName : "You"}
                          </span>
                          <time className="text-[10px] text-base-content/30 shrink-0">
                            {formatMessageTime(msg.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm text-base-content/70 truncate">
                          {msg.text || (msg.image ? (
                            <span className="flex items-center gap-1 opacity-60"><ImageIcon className="size-3" /> Photo</span>
                          ) : msg.audio ? (
                            <span className="flex items-center gap-1 opacity-60"><Mic className="size-3" /> Voice note</span>
                          ) : (
                            <span className="opacity-40">Media</span>
                          ))}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {results.length > 0 && (
                <div className="px-4 py-2 border-t border-base-300/40 text-[11px] text-base-content/30 text-right">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
