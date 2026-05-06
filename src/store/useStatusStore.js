import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useStatusStore = create((set, get) => ({
  statusGroups: [],   // [{ user, statuses[], hasUnseen }]
  isLoading: false,
  isUploading: false,
  viewerOpen: false,
  viewerGroupIdx: 0,
  viewerStatusIdx: 0,

  getStatuses: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/status");
      set({ statusGroups: res.data });
    } catch (err) {
      console.log("Error fetching statuses:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  createStatus: async ({ media, mediaType, caption }) => {
    set({ isUploading: true });
    try {
      await axiosInstance.post("/status", { media, mediaType, caption });
      toast.success("Status posted!");
      get().getStatuses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post status");
    } finally {
      set({ isUploading: false });
    }
  },

  viewStatus: async (statusId) => {
    try {
      await axiosInstance.put(`/status/${statusId}/view`);
      set({
        statusGroups: get().statusGroups.map((g) => ({
          ...g,
          statuses: g.statuses.map((s) =>
            s._id === statusId ? { ...s, viewed: true } : s
          ),
        })),
      });
    } catch (_) {}
  },

  deleteStatus: async (statusId) => {
    try {
      await axiosInstance.delete(`/status/${statusId}`);
      toast.success("Status deleted");
      get().getStatuses();
    } catch (err) {
      toast.error("Failed to delete");
    }
  },

  openViewer: (groupIdx, statusIdx = 0) => {
    set({ viewerOpen: true, viewerGroupIdx: groupIdx, viewerStatusIdx: statusIdx });
  },

  closeViewer: () => set({ viewerOpen: false }),

  nextStatus: () => {
    const { viewerGroupIdx, viewerStatusIdx, statusGroups } = get();
    const group = statusGroups[viewerGroupIdx];
    if (viewerStatusIdx < group.statuses.length - 1) {
      set({ viewerStatusIdx: viewerStatusIdx + 1 });
    } else if (viewerGroupIdx < statusGroups.length - 1) {
      set({ viewerGroupIdx: viewerGroupIdx + 1, viewerStatusIdx: 0 });
    } else {
      set({ viewerOpen: false });
    }
  },

  prevStatus: () => {
    const { viewerGroupIdx, viewerStatusIdx, statusGroups } = get();
    if (viewerStatusIdx > 0) {
      set({ viewerStatusIdx: viewerStatusIdx - 1 });
    } else if (viewerGroupIdx > 0) {
      const prevGroup = statusGroups[viewerGroupIdx - 1];
      set({
        viewerGroupIdx: viewerGroupIdx - 1,
        viewerStatusIdx: prevGroup.statuses.length - 1,
      });
    }
  },
}));
