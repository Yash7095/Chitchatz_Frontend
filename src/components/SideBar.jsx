import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SideBarSkeleton from "./skeletons/SideBarSkeleton.jsx";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import { Users, Plus, MessageSquare } from "lucide-react";
import { formatLastSeen } from "../lib/utils.js";
import StatusBar from "./StatusBar.jsx";
import CreateGroupModal from "./CreateGroupModal.jsx";

const MOODS = { working: "💻", gaming: "🎮", vibing: "🎵" };

const SideBar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { socket, authUser, onlineUsers } = useAuthStore();
  const { groups, getGroups, selectedGroup, setSelectedGroup, listenForNewGroups, stopListeningForNewGroups } = useGroupStore();

  const [tab, setTab] = useState("dms");         // "dms" | "groups"
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(() => {
    const s = localStorage.getItem("unreadMessages");
    return s ? JSON.parse(s) : {};
  });
  const [lastMessages, setLastMessages] = useState({});

  useEffect(() => { getUsers(); }, [getUsers]);
  useEffect(() => { getGroups(); }, [getGroups]);

  useEffect(() => {
    if (!socket) return;
    listenForNewGroups();
    return () => stopListeningForNewGroups();
  }, [socket]);

  useEffect(() => {
    if (!socket || !authUser) return;
    const handleNewMessage = (message) => {
      const peerId = message.senderId === authUser._id ? message.receiverId : message.senderId;
      setLastMessages((prev) => ({ ...prev, [peerId]: message }));
      if (message.senderId !== authUser._id && selectedUser?._id !== message.senderId) {
        setUnreadMessages((prev) => {
          const updated = { ...prev, [message.senderId]: true };
          localStorage.setItem("unreadMessages", JSON.stringify(updated));
          return updated;
        });
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, selectedUser, authUser]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setUnreadMessages((prev) => {
      const updated = { ...prev };
      delete updated[user._id];
      localStorage.setItem("unreadMessages", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
  };

  const filteredUsers = showOnlineOnly
    ? users.filter((u) => onlineUsers.includes(u._id))
    : users;

  const getLastMsgPreview = (userId) => {
    const msg = lastMessages[userId];
    if (!msg) return null;
    if (msg.text) return msg.text;
    if (msg.image) return "📷 Photo";
    if (msg.video) return "🎥 Video";
    if (msg.audio) return "🎵 Voice note";
    return null;
  };

  if (isUsersLoading) return <SideBarSkeleton />;

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
        {/* Header */}
        <div className="border-b border-base-300 w-full p-4">
          {/* Tabs */}
          <div className="hidden lg:flex gap-1 bg-base-200 rounded-xl p-1 mb-3">
            <button
              onClick={() => setTab("dms")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === "dms" ? "bg-base-100 shadow text-base-content" : "text-base-content/50 hover:text-base-content"
              }`}
            >
              <MessageSquare className="size-3.5" /> DMs
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === "groups" ? "bg-base-100 shadow text-base-content" : "text-base-content/50 hover:text-base-content"
              }`}
            >
              <Users className="size-3.5" /> Groups
            </button>
          </div>

          {tab === "dms" && (
            <div className="hidden lg:flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                <span className="text-xs">Online only</span>
              </label>
              <span className="text-xs text-zinc-500 ml-auto">
                {onlineUsers.length - 1} online
              </span>
            </div>
          )}

          {tab === "groups" && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="hidden lg:flex w-full items-center justify-center gap-2 btn btn-outline btn-xs rounded-xl"
            >
              <Plus className="size-3.5" /> New Group
            </button>
          )}
        </div>

        {/* Status bar — only on DMs tab */}
        {tab === "dms" && <StatusBar />}

        {/* List */}
        <div className="overflow-y-auto w-full py-2 flex-1">
          <AnimatePresence mode="wait">
            {tab === "dms" && (
              <motion.div key="dms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filteredUsers.map((user, idx) => {
                  const isOnline = onlineUsers.includes(user._id);
                  const preview = getLastMsgPreview(user._id);
                  const moodEmoji = MOODS[user.mood];

                  return (
                    <motion.button
                      key={user._id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.22 }}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                        selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""
                      }`}
                    >
                      <div className="relative mx-auto lg:mx-0 shrink-0">
                        <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-12 object-cover rounded-full" />
                        {isOnline && <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />}
                        {moodEmoji && (
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="absolute -top-1 -right-1 text-sm"
                          >{moodEmoji}</motion.span>
                        )}
                        {unreadMessages[user._id] && (
                          <span className="absolute -top-1 -left-1 size-3 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />
                        )}
                      </div>
                      <div className="hidden lg:flex flex-col text-left min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate text-sm">{user.fullName}</span>
                          {unreadMessages[user._id] && <span className="size-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-base-content/50 truncate">
                          {preview || (isOnline ? "Online" : user.lastSeen ? `Last seen ${formatLastSeen(user.lastSeen)}` : "Offline")}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-zinc-500 py-4 text-sm">No users found</p>
                )}
              </motion.div>
            )}

            {tab === "groups" && (
              <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {groups.map((group, idx) => (
                  <motion.button
                    key={group._id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleSelectGroup(group)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                      selectedGroup?._id === group._id ? "bg-base-300" : ""
                    }`}
                  >
                    <div className="size-12 rounded-full bg-base-300 overflow-hidden mx-auto lg:mx-0 shrink-0 flex items-center justify-center">
                      {group.groupPic
                        ? <img src={group.groupPic} alt={group.name} className="size-full object-cover" />
                        : <span className="text-lg font-bold text-base-content/40">{group.name[0]}</span>
                      }
                    </div>
                    <div className="hidden lg:flex flex-col text-left min-w-0 flex-1">
                      <span className="font-medium truncate text-sm">{group.name}</span>
                      <p className="text-xs text-base-content/50 truncate">{group.members?.length} members</p>
                    </div>
                  </motion.button>
                ))}
                {groups.length === 0 && (
                  <div className="text-center py-8 px-4 space-y-2">
                    <Users className="size-8 mx-auto text-base-content/20" />
                    <p className="text-sm text-zinc-500">No groups yet</p>
                    <button onClick={() => setShowCreateGroup(true)} className="btn btn-primary btn-xs">
                      Create one
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </>
  );
};

export default SideBar;
