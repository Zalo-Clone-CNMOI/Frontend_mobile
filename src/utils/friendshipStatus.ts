export interface FriendshipStatusInfo {
  label: string;
  color: string;
  textColor: string;
}

export function mapFriendshipStatus(status?: string): FriendshipStatusInfo {
  const s = (status || '').toString().toLowerCase();
  switch (s) {
    case 'friends':
      return { label: 'Friends', color: '#32D74B', textColor: '#ffffff' };
    case 'requested':
      return { label: 'Requested', color: '#FF9F0A', textColor: '#000000' };
    case 'pending':
      return { label: 'Pending', color: '#FF9F0A', textColor: '#000000' };
    case 'none':
      return { label: 'Add', color: '#0A84FF', textColor: '#ffffff' };
    case 'blocked':
      return { label: 'Blocked', color: '#FF3B30', textColor: '#ffffff' };
    default:
      return { label: status || '', color: '#8E8E93', textColor: '#ffffff' };
  }
}

export default mapFriendshipStatus;
