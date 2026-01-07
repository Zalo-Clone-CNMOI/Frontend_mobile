export type ContactType = 'friend' | 'group' | 'oa';

export interface Contact {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  type: ContactType;
}

export const FRIENDS_MOCK_DATA: Contact[] = [
  { id: '1', name: 'Hoàng Vũ', subtitle: 'Đang hoạt động', avatar: 'https://i.pravatar.cc/150?u=1', type: 'friend' },
  { id: '2', name: 'Thái', subtitle: 'Vừa truy cập', avatar: 'https://i.pravatar.cc/150?u=2', type: 'friend' },
  { id: '3', name: 'Phạm Hoàng Vũ', subtitle: 'Đang hoạt động', avatar: 'https://i.pravatar.cc/150?u=3', type: 'friend' },
  { id: '4', name: 'Tấn Minh', subtitle: 'Không hoạt động', avatar: 'https://i.pravatar.cc/150?u=4', type: 'friend' },
  { id: '5', name: 'Tấn Minh', subtitle: 'Không hoạt động', avatar: 'https://i.pravatar.cc/150?u=5', type: 'friend' },
  { id: '6', name: 'Tấn Minh', subtitle: 'Không hoạt động', avatar: 'https://i.pravatar.cc/150?u=6', type: 'friend' },
  { id: '7', name: 'Tấn Minh', subtitle: 'Không hoạt động', avatar: 'https://i.pravatar.cc/150?u=7', type: 'friend' },
];

export const GROUPS_MOCK_DATA: Contact[] = [
  { id: 'g1', name: 'Nhóm Gia Đình', subtitle: '4 thành viên', avatar: 'https://i.pravatar.cc/150?u=g1', type: 'group' },
  { id: 'g2', name: 'Dự Án Zalo 2026', subtitle: '10 thành viên', avatar: 'https://i.pravatar.cc/150?u=g2', type: 'group' },
  { id: 'g3', name: 'Dự Án Zalo 2026', subtitle: '10 thành viên', avatar: 'https://i.pravatar.cc/150?u=g2', type: 'group' },
  { id: 'g4', name: 'Dự Án Zalo 2026', subtitle: '10 thành viên', avatar: 'https://i.pravatar.cc/150?u=g2', type: 'group' },
  { id: 'g5', name: 'Dự Án Zalo 2026', subtitle: '10 thành viên', avatar: 'https://i.pravatar.cc/150?u=g2', type: 'group' },
];

export const OA_MOCK_DATA: Contact[] = [
  { id: 'oa1', name: 'Thời Tiết', subtitle: 'Tài khoản chính thức', avatar: 'https://i.pravatar.cc/150?u=oa1', type: 'oa' },
  { id: 'oa2', name: 'Thời Tiết', subtitle: 'Tài khoản chính thức', avatar: 'https://i.pravatar.cc/150?u=oa1', type: 'oa' },
  { id: 'oa3', name: 'Thời Tiết', subtitle: 'Tài khoản chính thức', avatar: 'https://i.pravatar.cc/150?u=oa1', type: 'oa' },
  { id: 'oa4', name: 'Thời Tiết', subtitle: 'Tài khoản chính thức', avatar: 'https://i.pravatar.cc/150?u=oa1', type: 'oa' },
  { id: 'oa5', name: 'Thời Tiết', subtitle: 'Tài khoản chính thức', avatar: 'https://i.pravatar.cc/150?u=oa1', type: 'oa' },
];

export const ALL_CONTACTS_MOCK_DATA: Contact[] = [
  ...FRIENDS_MOCK_DATA,
  ...GROUPS_MOCK_DATA,
  ...OA_MOCK_DATA,
];
