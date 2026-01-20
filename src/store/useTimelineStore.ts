import { create } from 'zustand';
import { TIMELINE_V2, TimelinePost, TimelinePostV2 } from '../data/timelineMockData';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: number;
}

interface TimelineState {
  // State
  posts: TimelinePost[];
  // v2 posts
  postsV2: TimelinePostV2[];
  comments: Comment[];

  // Actions
  initializePosts: () => void;
  getPosts: () => TimelinePost[];
  getPostsV2: () => TimelinePostV2[];
  addPost: (post: TimelinePost) => void;
  deletePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<TimelinePost>) => void;
  
  // v2 post interactions
  toggleLike: (postId: string) => void;
  incrementComments: (postId: string) => void;
  incrementShares: (postId: string) => void;
  
  // Comments
  addComment: (postId: string, userId: string, userName: string, content: string, userAvatar?: string) => void;
  deleteComment: (commentId: string) => void;
  getCommentsByPostId: (postId: string) => Comment[];
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // State
  posts: [],
  postsV2: [],
  comments: [],

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

  // v2 post interactions
  toggleLike: (postId: string) => {
    set((state) => ({
      postsV2: state.postsV2.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? (post.likes || 0) - 1 : (post.likes || 0) + 1,
            }
          : post
      ),
    }));
  },

  incrementComments: (postId: string) => {
    set((state) => ({
      postsV2: state.postsV2.map((post) =>
        post.id === postId
          ? { ...post, comments: (post.comments || 0) + 1 }
          : post
      ),
    }));
  },

  incrementShares: (postId: string) => {
    set((state) => ({
      postsV2: state.postsV2.map((post) =>
        post.id === postId
          ? { ...post, shares: (post.shares || 0) + 1 }
          : post
      ),
    }));
  },

  // Comments
  addComment: (postId: string, userId: string, userName: string, content: string, userAvatar?: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      postId,
      userId,
      userName,
      userAvatar,
      content,
      createdAt: Date.now(),
    };

    set((state) => ({
      comments: [...state.comments, newComment],
      postsV2: state.postsV2.map((post) =>
        post.id === postId
          ? { ...post, comments: (post.comments || 0) + 1 }
          : post
      ),
    }));
  },

  deleteComment: (commentId: string) => {
    set((state) => {
      const commentToDelete = state.comments.find(c => c.id === commentId);
      if (!commentToDelete) return state;

      return {
        ...state,
        comments: state.comments.filter(c => c.id !== commentId),
        postsV2: state.postsV2.map((post) =>
          post.id === commentToDelete.postId
            ? { ...post, comments: Math.max(0, (post.comments || 0) - 1) }
            : post
        ),
      };
    });
  },

  getCommentsByPostId: (postId: string) => {
    return get().comments.filter(comment => comment.postId === postId);
  },
}));
