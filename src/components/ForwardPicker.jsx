import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Forward, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const ForwardPicker = ({ message, onClose }) => {
  const { users, sendMessage } = useChatStore();
  const [search, setSearch] = useState("");
  const [forwarding, setForwarding] = useState(false);

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const forward = async (user) => {
    if (forwarding) return;
    setForwarding(true);
    try {
      // Temporarily set selected user and send, then restore
      const current = useChatStore.getState().selectedUser;
      useChatStore.setState({ selectedUser: user });
      await sendMessage({
        text: message.text,
        image: message.image,
        video: message.video,
        audio: message.audio,
      });
      useChatStore.setState({ selectedUser: current });
      toast.success(`Forwarded to ${user.fullName}`);
      onClose();
    } catch {
      toast.error("Failed to forward");
    } finally {
      setForwarding(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 px-4"
      >
        <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-300/60">
            <div className="flex items-center gap-2">
              <Forward className="size-4 text-primary" />
              <span className="font-semibold text-sm">Forward message</span>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
              <X className="size-3.5" />
            </button>
          </div>

          {/* Preview */}
          {message.text && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-base-200 text-xs text-base-content/60 line-clamp-2 italic">
              "{message.text}"
            </div>
          )}

          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2">
              <Search className="size-3.5 text-base-content/40" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-xs placeholder:text-base-content/30"
                autoFocus
              />
            </div>
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto pb-2">
            {filtered.length === 0 && (
              <p className="text-center py-6 text-xs text-base-content/30">No contacts found</p>
            )}
            {filtered.map((user, i) => (
              <motion.button
                key={user._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => forward(user)}
                disabled={forwarding}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200/70 transition-colors text-left"
              >
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-8 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.fullName}</p>
                  {user.username && (
                    <p className="text-xs text-base-content/40 truncate">@{user.username}</p>
                  )}
                </div>
                <Forward className="size-3.5 text-base-content/20 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ForwardPicker;
