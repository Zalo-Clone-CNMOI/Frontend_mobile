import { create } from 'zustand';
import { TimelinePost } from '../data/timelineMockData';
import { TIMELINE_POSTS_MOCK_DATA } from '../data/timelineMockData';

interface TimelineState {
  // State
  posts: TimelinePost[];

  // Actions
  initializePosts: () => void;
  getPosts: () => TimelinePost[];
  addPost: (post: TimelinePost) => void;
  deletePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<TimelinePost>) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // State
  posts: [],

  // Actions
  initializePosts: () => {
    set({
      posts: TIMELINE_POSTS_MOCK_DATA,
    });
  },

  getPosts: () => {
    return get().posts;
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
