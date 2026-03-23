import api from './http';

export const getFriends = async (params?: any) => {
  return api.get('/api/friends', { params });
};

export const getPendingRequests = (params?: any) =>
  api.get('/api/friends/requests/pending', { params });

export const getSentRequests = (params?: any) =>
  api.get('/api/friends/requests/sent', { params });

export const sendFriendRequest = (payload: any) =>
  api.post('/api/friends/requests', payload);

export const updateFriendRequest = (requestId: string, payload: any) =>
  api.patch(`/api/friends/requests/${requestId}`, payload);

export const deleteFriendRequest = (requestId: string) =>
  api.delete(`/api/friends/requests/${requestId}`);

export const blockUser = (payload: any) =>
  api.post('/api/friends/block', payload);

export default {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  updateFriendRequest,
  deleteFriendRequest,
  blockUser,
};
