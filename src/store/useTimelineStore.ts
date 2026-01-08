import { create } from 'zustand';
import { TIMELINE_V2, TimelinePost, TimelinePostV2 } from '../data/timelineMockData';

interface TimelineState {
  // State
  posts: TimelinePost[];
  // v2 posts
  postsV2: TimelinePostV2[];

  // Actions
  initializePosts: () => void;
  getPosts: () => TimelinePost[];
  getPostsV2: () => TimelinePostV2[];
  addPost: (post: TimelinePost) => void;
  deletePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<TimelinePost>) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // State
  posts: [],
  postsV2: [],

  // Actions
  initializePosts: () => {
    // Prefer v2 timeline posts directly
    if (TIMELINE_V2 && TIMELINE_V2.length) {
      set({ postsV2: TIMELINE_V2, posts: [] });
      return;
    }

    set({ posts: [], postsV2: [] });
  },

  getPosts: () => {
    return get().posts;
  },
  getPostsV2: () => {
    return get().postsV2;
  },

  addPost: (post: TimelinePost) => {
    set((state) => ({
      posts: [post, ...state.posts],
    }));
  },

  deletePost: (postId: string) => {
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));
  },

  updatePost: (postId: string, updates: Partial<TimelinePost>) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, ...updates } : p
      ),
    }));
  },
}));
