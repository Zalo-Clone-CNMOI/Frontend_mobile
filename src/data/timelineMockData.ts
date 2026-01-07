export interface TimelinePost {
  id: string;
  name: string;
  time: string;
  content: string;
  avatar: string;
  photo: string;
}

export const TIMELINE_POSTS_MOCK_DATA: TimelinePost[] = [
  {
    id: '1',
    name: 'Phạm Hoàng Vũ',
    time: '2 giờ',
    content: 'Hôm nay học Kiến trúc phần mềm, hơi căng nhưng vui.',
    avatar: 'https://i.pravatar.cc/150?u=post-1',
    photo: 'https://picsum.photos/700/500?random=11',
  },
  {
    id: '2',
    name: 'Huỳnh Nguyệt',
    time: '6 giờ',
    content: 'Cuối tuần đi cà phê không?',
    avatar: 'https://i.pravatar.cc/150?u=post-2',
    photo: 'https://picsum.photos/700/500?random=12',
  },
];
