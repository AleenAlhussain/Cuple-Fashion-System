"use client";
import { create } from "zustand";

const buildPreviewStories = (storyGroups, groupIndex) => {
  const group = storyGroups[groupIndex];

  if (!group?.thumbnail) {
    return [];
  }

  return [
    {
      id: group.id || group.story_id,
      title: group.title || "",
      title_ar: group.title_ar || "",
      media_type: "image",
      media_url: group.thumbnail,
      thumbnail_url: group.thumbnail,
      duration: group.duration || 5,
      creator_name: group.creator_name || "Story",
      time_remaining: group.time_remaining || "",
      link: group.link || null,
      created_at: group.latest_at || null,
      is_preview: true,
    },
  ];
};

const useStoryState = create((set, get) => ({
  // State
  storyGroups: [],           // Array of story groups (thumbnails)
  currentStories: [],        // Full stories for current viewing
  currentGroupIndex: 0,      // Which group we're viewing
  currentStoryIndex: 0,      // Which story in current group
  isViewerOpen: false,       // Is the viewer modal open
  viewedStories: [],         // IDs of viewed stories (session storage)
  isLoading: false,

  // Set story groups from API (thumbnails only)
  setStoryGroups: (groups) => {
    set({ storyGroups: groups });
  },

  // Set current stories (full data when viewer opens)
  setCurrentStories: (stories) => {
    set({ currentStories: stories });
  },

  // Open viewer for a specific group
  openViewer: (groupIndex) => {
    const { storyGroups } = get();

    set({
      isViewerOpen: true,
      currentGroupIndex: groupIndex,
      currentStoryIndex: 0,
      currentStories: buildPreviewStories(storyGroups, groupIndex),
    });
  },

  // Close viewer
  closeViewer: () => {
    set({
      isViewerOpen: false,
      currentStories: [],
      currentStoryIndex: 0,
    });
  },

  // Go to next story
  nextStory: () => {
    const { currentStories, currentStoryIndex, storyGroups, currentGroupIndex } = get();

    // If there are more stories in current group
    if (currentStoryIndex < currentStories.length - 1) {
      set({ currentStoryIndex: currentStoryIndex + 1 });
      return { action: "next_in_group" };
    }

    // If there are more groups
    if (currentGroupIndex < storyGroups.length - 1) {
      const nextGroupIndex = currentGroupIndex + 1;

      set({
        currentGroupIndex: nextGroupIndex,
        currentStoryIndex: 0,
        currentStories: buildPreviewStories(storyGroups, nextGroupIndex),
      });
      return { action: "next_group" };
    }

    // End of all stories
    get().closeViewer();
    return { action: "close" };
  },

  // Go to previous story
  prevStory: () => {
    const { currentStoryIndex, storyGroups, currentGroupIndex } = get();

    // If not at first story in group
    if (currentStoryIndex > 0) {
      set({ currentStoryIndex: currentStoryIndex - 1 });
      return { action: "prev_in_group" };
    }

    // If not at first group
    if (currentGroupIndex > 0) {
      const prevGroupIndex = currentGroupIndex - 1;

      set({
        currentGroupIndex: prevGroupIndex,
        currentStoryIndex: 0, // Will be set to last after load
        currentStories: buildPreviewStories(storyGroups, prevGroupIndex),
      });
      return { action: "prev_group", goToLast: true };
    }

    // Already at the beginning
    return { action: "at_start" };
  },

  // Mark story as viewed
  markViewed: (storyId) => {
    if (typeof window === "undefined") return;

    try {
      const viewed = JSON.parse(sessionStorage.getItem("viewedStories") || "[]");
      if (!viewed.includes(storyId)) {
        viewed.push(storyId);
        sessionStorage.setItem("viewedStories", JSON.stringify(viewed));
        set({ viewedStories: viewed });
      }
    } catch (error) {
      console.error("Error marking story as viewed:", error);
    }
  },

  // Check if a story group has unviewed stories
  hasUnviewedStories: (groupId) => {
    // For now, we just check if any story in the group hasn't been viewed this session
    // This would need to be enhanced with proper story IDs
    const { viewedStories } = get();
    return !viewedStories.some(id => String(id).startsWith(`${groupId}_`));
  },

  // Load viewed stories from session storage
  loadViewedStories: () => {
    if (typeof window === "undefined") return;

    try {
      const viewed = JSON.parse(sessionStorage.getItem("viewedStories") || "[]");
      set({ viewedStories: viewed });
    } catch {
      set({ viewedStories: [] });
    }
  },

  // Set loading state
  setLoading: (isLoading) => {
    set({ isLoading });
  },

  // Get current group
  getCurrentGroup: () => {
    const { storyGroups, currentGroupIndex } = get();
    return storyGroups[currentGroupIndex] || null;
  },

  // Get current story
  getCurrentStory: () => {
    const { currentStories, currentStoryIndex } = get();
    return currentStories[currentStoryIndex] || null;
  },
}));

export default useStoryState;
