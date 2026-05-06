import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SideBarSkeleton from "./skeletons/SideBarSkeleton.jsx";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import { Users, Plus, MessageSquare, Search, X } from "lucide-react";
import { formatLastSeen } from "../lib/utils.js";
import StatusBar from "./StatusBar.jsx";
import CreateGroupModal from "./CreateGroupModal.jsx";
import { staggerChild } from "../lib/animations.js";
import toast from "react-hot-toast";

const MOODS = { working: "💻", gaming: "🎮", vibing: "🎵" };

const SideBar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { socket, authUser, onlineUsers } = useAuthStore();
  const { groups, getGroups, selectedGroup, setSelectedGroup, listenForNewGroups, stopListeningForNewGroups } = useGroupStore();

  const [tab, setTab] = useState("dms");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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

        const sender = users.find((u) => u._id === message.senderId);
        const body = message.text || (message.image ? "📷 Photo" : message.audio ? "🎵 Voice note" : "📎 Attachment");

        if (!window.__chitchatzDND) {
          // In-app toast notification (works regardless of tab visibility)
          toast(
            (t) => (
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => toast.dismiss(t.id)}>
                <img
                  src={sender?.profilePic || "/avatar.png"}
                  className="size-8 rounded-full object-cover shrink-0"
                  alt=""
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{sender?.fullName || "New message"}</p>
                  <p className="text-xs opacity-70 truncate max-w-[160px]">{body}</p>
                </div>
              </div>
            ),
            { duration: 4000, position: "top-right" }
          );

          // Browser notification when tab is hidden
          if (document.hidden && Notification.permission === "granted") {
            new Notification(`New message from ${sender?.fullName || "Someone"}`, {
              body,
              icon: sender?.profilePic || "/avatar.png",
              tag: message.senderId,
            });
          }
        }
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

  const getLastMsgPreview = (userId) => {
    const msg = lastMessages[userId];
    if (!msg) return null;
    if (msg.text) return msg.text;
    if (msg.image) return "📷 Photo";
    if (msg.video) return "🎥 Video";
    if (msg.audio) return "🎵 Voice note";
    return null;
  };

  const filteredUsers = users.filter((u) => {
    if (showOnlineOnly && !onlineUsers.includes(u._id)) return false;
    if (search) return u.fullName.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const filteredGroups = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isUsersLoading) return <SideBarSkeleton />;

  return (
    <>
      <aside className="h-full w-16 sm:w-20 lg:w-72 border-r border-base-300 flex flex-col bg-base-100 transition-all duration-300 shrink-0">

        {/* Header */}
        <div className="border-b border-base-300 p-3 lg:p-4 space-y-3">

          {/* Tab switcher */}
          <div className="hidden lg:flex bg-base-200 rounded-xl p-1 relative">
            {/* Sliding indicator */}
            <motion.div
              layoutId="tab-indicator"
              className="absolute top-1 bottom-1 rounded-lg bg-base-100 shadow"
              style={{ left: tab === "dms" ? "4px" : "50%", right: tab === "dms" ? "50%" : "4px" }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            />
            {[
              { key: "dms",    icon: MessageSquare, label: "DMs"    },
              { key: "groups", icon: Users,         label: "Groups" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setSearch(""); setShowSearch(false); }}
                className={`relative flex-1 text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors z-10 ${
                  tab === key ? "text-base-content" : "text-base-content/40 hover:text-base-content/70"
                }`}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Search + filter row */}
          <div className="hidden lg:flex items-center gap-2">
            <AnimatePresence mode="wait">
              {showSearch ? (
                <motion.div
                  key="search-input"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "100%" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 flex items-center gap-1.5 bg-base-200 rounded-xl px-3 py-1.5"
                >
                  <Search className="size-3.5 text-base-content/40 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/30"
                  />
                  <button onClick={() => { setSearch(""); setShowSearch(false); }}>
                    <X className="size-3.5 text-base-content/30 hover:text-base-content transition-colors" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="search-collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center gap-2"
                >
                  {tab === "dms" && (
                    <label className="cursor-pointer flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={showOnlineOnly}
                        onChange={(e) => setShowOnlineOnly(e.target.checked)}
                        className="checkbox checkbox-xs checkbox-primary"
                      />
                      <span className="text-xs text-base-content/50">Online only</span>
                    </label>
                  )}
                  {tab === "groups" && (
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-colors"
                    >
                      <Plus className="size-3.5" /> New group
                    </button>
                  )}
                  <span className="ml-auto text-xs text-base-content/30">
                    {tab === "dms" ? `${onlineUsers.length - 1} online` : `${groups.length} groups`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setShowSearch((v) => !v)}
              className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary shrink-0"
            >
              <Search className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Status bar (DMs only) */}
        {tab === "dms" && <StatusBar />}

        {/* List */}
        <div className="overflow-y-auto flex-1 py-1">
          <AnimatePresence mode="wait">

            {/* DMs */}
            {tab === "dms" && (
              <motion.div
                key="dms"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {filteredUsers.map((user, idx) => {
                  const isOnline = onlineUsers.includes(user._id);
                  const preview = getLastMsgPreview(user._id);
                  const moodEmoji = MOODS[user.mood];
                  const isSelected = selectedUser?._id === user._id;
                  const hasUnread = !!unreadMessages[user._id];

                  return (
                    <motion.button
                      key={user._id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={staggerChild(idx)}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all relative ${
                        isSelected
                          ? "bg-primary/8 border-l-[3px] border-primary"
                          : "border-l-[3px] border-transparent hover:bg-base-200/60"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative mx-auto lg:mx-0 shrink-0">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className={`size-11 object-cover rounded-full transition-all ${
                            isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-base-100" : ""
                          }`}
                        />
                        {isOnline && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100"
                          />
                        )}
                        {moodEmoji && (
                          <motion.span
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            className="absolute -top-1 -right-1 text-xs leading-none"
                          >
                            {moodEmoji}
                          </motion.span>
                        )}
                        {hasUnread && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            className="absolute -top-0.5 -left-0.5 size-3.5 bg-primary rounded-full ring-2 ring-base-100 flex items-center justify-center"
                          />
                        )}
                      </div>

                      {/* Text info */}
                      <div className="hidden lg:flex flex-col text-left min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>
                            {user.fullName}
                          </span>
                          {hasUnread && (
                            <span className="size-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-base-content/70 font-medium" : "text-base-content/40"}`}>
                          {preview || (isOnline ? "Online" : user.lastSeen ? `Last seen ${formatLastSeen(user.lastSeen)}` : "Offline")}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <p className="text-sm text-base-content/30">No users found</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Groups */}
            {tab === "groups" && (
              <motion.div
                key="groups"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {filteredGroups.map((group, idx) => {
                  const isSelected = selectedGroup?._id === group._id;
                  return (
                    <motion.button
                      key={group._id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={staggerChild(idx)}
                      onClick={() => handleSelectGroup(group)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all relative ${
                        isSelected
                          ? "bg-primary/8 border-l-[3px] border-primary"
                          : "border-l-[3px] border-transparent hover:bg-base-200/60"
                      }`}
                    >
                      {/* Group avatar */}
                      <div className="size-11 rounded-full bg-base-300 overflow-hidden mx-auto lg:mx-0 shrink-0 flex items-center justify-center">
                        {group.groupPic
                          ? <img src={group.groupPic} alt={group.name} className="size-full object-cover" />
                          : <span className="text-base font-bold text-base-content/40">{group.name[0]}</span>
                        }
                      </div>
                      <div className="hidden lg:flex flex-col text-left min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{group.name}</span>
                        <p className="text-xs text-base-content/40 mt-0.5">{group.members?.length} members</p>
                      </div>
                    </motion.button>
                  );
                })}

                {filteredGroups.length === 0 && (
                  <div className="text-center py-10 px-4 space-y-3">
                    <div className="size-12 mx-auto rounded-2xl bg-base-200 flex items-center justify-center">
                      <Users className="size-6 text-base-content/20" />
                    </div>
                    <p className="text-sm text-base-content/30">No groups yet</p>
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="btn btn-primary btn-xs rounded-xl px-4"
                    >
                      <Plus className="size-3" /> Create one
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
