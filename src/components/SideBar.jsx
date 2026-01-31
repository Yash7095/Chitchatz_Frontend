import { useEffect, useState } from "react";
import SideBarSkeleton from "./skeletons/SideBarSkeleton.jsx";

import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";

import { Users } from "lucide-react";

const SideBar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } =
    useChatStore();

  const { socket, authUser, onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Initialize state from localStorage
  const [unreadMessages, setUnreadMessages] = useState(() => {
    const stored = localStorage.getItem("unreadMessages");
    return stored ? JSON.parse(stored) : {};
  });

  const { messages } = useChatStore();
  // console.log("Messages in Sidebar:", messages);

  useEffect(() => {
    if (!socket || !authUser) return;

    const handleNewMessage = (message) => {
      if (message.senderId === authUser._id) return;

      if (selectedUser?._id !== message.senderId) {
        setUnreadMessages((prev) => {
          const updated = {
            ...prev,
            [message.senderId]: true,
          };
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

    setUnreadMessages((prev) => {
      const updated = { ...prev };
      delete updated[user._id];
      localStorage.setItem("unreadMessages", JSON.stringify(updated));
      return updated;
    });
  };

  if (isUsersLoading) return <SideBarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        {/* TODO: Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => handleSelectUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${
                selectedUser?._id === user._id
                  ? "bg-base-300 ring-1 ring-base-300"
                  : ""
              }
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
              {unreadMessages[user._id] && (
                <span
                  className="absolute -top-1 -right-1 size-3 bg-red-500 
                  rounded-full animate-pulse ring-2 ring-white"
                />
              )}
            </div>

            {/* User info - only visible on larger screens */}
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};
export default SideBar;
