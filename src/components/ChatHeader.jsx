import { X, Pin } from "lucide-react";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useNavigate } from "react-router-dom";
import { formatLastSeen } from "../lib/utils.js";
import { useEffect } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, isTyping, pinnedMessages, getPinnedMessages } =
    useChatStore();
  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();
  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    getPinnedMessages(selectedUser._id);
  }, [selectedUser._id]);

  const topPinned = pinnedMessages[0];

  const getStatusText = () => {
    if (isTyping) return "typing...";
    if (isOnline) return "Online";
    if (selectedUser.lastSeen) return `Last seen ${formatLastSeen(selectedUser.lastSeen)}`;
    return "Offline";
  };

  return (
    <div className="border-b border-base-300">
      <div className="p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="avatar cursor-pointer"
            onClick={() => navigate(`/user/${selectedUser._id}`)}
          >
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p
              className={`text-sm transition-all ${
                isTyping ? "text-primary font-medium" : isOnline ? "text-green-500" : "text-base-content/50"
              }`}
            >
              {getStatusText()}
            </p>
          </div>
        </div>
        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>

      {/* Pinned message banner */}
      {topPinned && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-base-200 border-t border-base-300 text-xs">
          <Pin className="size-3 text-primary shrink-0" />
          <p className="truncate text-base-content/70 flex-1">
            <span className="font-semibold text-primary">Pinned: </span>
            {topPinned.text || (topPinned.image ? "📷 Photo" : topPinned.video ? "🎥 Video" : "🎵 Audio")}
          </p>
          {pinnedMessages.length > 1 && (
            <span className="text-base-content/40">{pinnedMessages.length} pinned</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
