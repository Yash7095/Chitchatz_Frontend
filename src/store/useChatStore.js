import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  typingUserId: null,
  replyingTo: null,
  pinnedMessages: [],
  smartReplies: [],
  isLoadingSmartReplies: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/message/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/message/${userId}`);
      set({ messages: res.data });
      await axiosInstance.put(`/message/read/${userId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/message/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data], replyingTo: null, smartReplies: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Reactions
  reactToMessage: async (messageId, emoji) => {
    try {
      await axiosInstance.put(`/message/${messageId}/react`, { emoji });
    } catch (error) {
      toast.error("Failed to react");
    }
  },

  // Pin
  pinMessage: async (messageId) => {
    try {
      await axiosInstance.put(`/message/${messageId}/pin`);
    } catch (error) {
      toast.error("Failed to pin message");
    }
  },

  getPinnedMessages: async (userId) => {
    try {
      const res = await axiosInstance.get(`/message/${userId}/pinned`);
      set({ pinnedMessages: res.data });
    } catch (_) {}
  },

  // Smart Replies
  fetchSmartReplies: async () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    set({ isLoadingSmartReplies: true, smartReplies: [] });
    try {
      const res = await axiosInstance.post("/ai/smart-replies", {
        conversationUserId: selectedUser._id,
      });
      set({ smartReplies: res.data });
    } catch (_) {
      set({ smartReplies: [] });
    } finally {
      set({ isLoadingSmartReplies: false });
    }
  },

  clearSmartReplies: () => set({ smartReplies: [] }),

  // 8.1 — Search
  searchMessages: async (q) => {
    try {
      const res = await axiosInstance.get(`/message/search?q=${encodeURIComponent(q)}`);
      return res.data;
    } catch {
      return [];
    }
  },

  // 8.3 — AI Summary
  summarizeConversation: async () => {
    const { selectedUser } = get();
    if (!selectedUser) return null;
    try {
      const res = await axiosInstance.post("/ai/summarize", { conversationUserId: selectedUser._id });
      return res.data.summary;
    } catch {
      return "Failed to generate summary.";
    }
  },

  // 8.6 — Bookmark
  toggleBookmark: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/message/${messageId}/bookmark`);
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isBookmarked: res.data.isBookmarked } : m
        ),
      });
    } catch {
      toast.error("Failed to bookmark");
    }
  },

  getBookmarks: async () => {
    try {
      const res = await axiosInstance.get("/message/bookmarks");
      return res.data;
    } catch {
      return [];
    }
  },

  setReplyingTo: (message) => set({ replyingTo: message }),
  clearReplyingTo: () => set({ replyingTo: null }),

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      if (newMessage.senderId !== selectedUser._id) return;
      set({ messages: [...get().messages, newMessage] });
      axiosInstance.put(`/message/read/${selectedUser._id}`).catch(() => {});
      get().fetchSmartReplies();
    });

    // Update profile pic / mood in users list when someone updates their profile
    socket.on("profileUpdated", ({ userId, profilePic, fullName, mood }) => {
      set({
        users: get().users.map((u) =>
          u._id === userId ? { ...u, profilePic, fullName, mood } : u
        ),
      });
    });

    socket.on("userTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) set({ isTyping: true, typingUserId: senderId });
    });

    socket.on("userStopTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) set({ isTyping: false, typingUserId: null });
    });

    socket.on("messagesRead", ({ byUserId }) => {
      if (byUserId === selectedUser._id) {
        set({
          messages: get().messages.map((m) =>
            m.status !== "read" ? { ...m, status: "read" } : m
          ),
        });
      }
    });

    socket.on("messagesDelivered", ({ messageIds }) => {
      set({
        messages: get().messages.map((m) =>
          messageIds.includes(m._id) && m.status === "sent"
            ? { ...m, status: "delivered" }
            : m
        ),
      });
    });

    // Reactions
    socket.on("reactionUpdate", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      });
    });

    // Pin
    socket.on("messagePinned", ({ messageId, isPinned }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isPinned } : m
        ),
        pinnedMessages: isPinned
          ? [get().messages.find((m) => m._id === messageId), ...get().pinnedMessages].filter(Boolean)
          : get().pinnedMessages.filter((m) => m._id !== messageId),
      });
    });

    // Self-destruct
    socket.on("messageExpired", ({ messageId }) => {
      set({
        messages: get().messages.filter((m) => m._id !== messageId),
        pinnedMessages: get().pinnedMessages.filter((m) => m._id !== messageId),
      });
    });
  },

  unSubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("userTyping");
    socket.off("userStopTyping");
    socket.off("messagesRead");
    socket.off("messagesDelivered");
    socket.off("reactionUpdate");
    socket.off("messagePinned");
    socket.off("messageExpired");
    socket.off("profileUpdated");
  },

  emitTyping: (receiverId) => {
    useAuthStore.getState().socket?.emit("typing", { receiverId });
  },

  emitStopTyping: (receiverId) => {
    useAuthStore.getState().socket?.emit("stopTyping", { receiverId });
  },

  setSelectedUser: (selectedUser) => {
    set({
      selectedUser,
      messages: [],
      isTyping: false,
      typingUserId: null,
      replyingTo: null,
      smartReplies: [],
      pinnedMessages: [],
    });
  },
}));
