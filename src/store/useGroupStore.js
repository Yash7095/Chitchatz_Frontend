import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

// Named handler refs so socket.off() removes exactly the right listener
let _newGroupMessageHandler = null;
let _groupUpdatedHandler = null;
let _removedFromGroupHandler = null;

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isLoadingGroups: false,
  isLoadingMessages: false,

  getGroups: async () => {
    set({ isLoadingGroups: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch {
      toast.error("Failed to load groups");
    } finally {
      set({ isLoadingGroups: false });
    }
  },

  createGroup: async ({ name, description, memberIds, groupPic }) => {
    try {
      const res = await axiosInstance.post("/groups", { name, description, memberIds, groupPic });
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created!");
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch {
      toast.error("Failed to load messages");
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendGroupMessage: async (messageData) => {
    const { selectedGroup, groupMessages } = get();
    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, messageData);
      set({ groupMessages: [...groupMessages, res.data] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    }
  },

  setSelectedGroup: (group) => set({ selectedGroup: group, groupMessages: [] }),

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove any stale handlers before adding new ones
    get().unsubscribeFromGroupMessages();

    _newGroupMessageHandler = ({ groupId, message }) => {
      if (groupId !== get().selectedGroup?._id) return;
      set({ groupMessages: [...get().groupMessages, message] });
    };

    _groupUpdatedHandler = (updatedGroup) => {
      set({
        groups: get().groups.map((g) => g._id === updatedGroup._id ? updatedGroup : g),
        selectedGroup: get().selectedGroup?._id === updatedGroup._id ? updatedGroup : get().selectedGroup,
      });
    };

    _removedFromGroupHandler = ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
      toast("You were removed from a group");
    };

    socket.on("newGroupMessage", _newGroupMessageHandler);
    socket.on("groupUpdated", _groupUpdatedHandler);
    socket.on("removedFromGroup", _removedFromGroupHandler);
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    if (_newGroupMessageHandler) {
      socket.off("newGroupMessage", _newGroupMessageHandler);
      _newGroupMessageHandler = null;
    }
    if (_groupUpdatedHandler) {
      socket.off("groupUpdated", _groupUpdatedHandler);
      _groupUpdatedHandler = null;
    }
    if (_removedFromGroupHandler) {
      socket.off("removedFromGroup", _removedFromGroupHandler);
      _removedFromGroupHandler = null;
    }
  },

  listenForNewGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.on("groupCreated", (group) => {
      const exists = get().groups.some((g) => g._id === group._id);
      if (!exists) set({ groups: [group, ...get().groups] });
    });
  },

  stopListeningForNewGroups: () => {
    useAuthStore.getState().socket?.off("groupCreated");
  },
}));
