export interface TimelinePost {
  id: string;
  name: string;
  time: string;
  content: string;
  avatar: string;
  photo: string;
}

// Legacy timeline posts removed — use `TIMELINE_V2` instead.

// Zalo v2 timeline posts (production-like). Uses real user IDs from USERS_V2 for authors.
export interface TimelinePostV2 {
  id: string;
  userId: string;
  content: string;
  images?: string[];
  createdAt: number;
  liked?: boolean;
  likes?: number;
  comments?: number;
  shares?: number;
}

export const TIMELINE_V2: TimelinePostV2[] = [
  {
    id: 'p-1',
    userId: 'u1',
    content: 'Hôm nay học Kiến trúc phần mềm, hơi căng nhưng vui.',
    images: ['https://picsum.photos/700/500?random=11'],
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    liked: false,
    likes: 12,
    comments: 5,
    shares: 2,
  },
  {
    id: 'p-2',
    userId: 'u3',
    content: 'Cuối tuần đi cà phê không?',
    images: ['https://picsum.photos/700/500?random=12'],
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    liked: true,
    likes: 8,
    comments: 3,
    shares: 1,
  },
];
