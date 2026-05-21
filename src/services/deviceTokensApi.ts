import { apiJsonRequest } from './apiRequest';
import api from './http';

export async function registerDeviceToken(payload: {
  token: string;
  platform: 'android' | 'ios';
}) {
  return apiJsonRequest('POST', '/device-tokens', { body: payload });
}

export const deleteDeviceToken = async (tokenId: string) => {
  const response = await api.delete(`/device-tokens/${encodeURIComponent(tokenId)}`);
  return response;
};

export const getDeviceTokens = async () => {
  const response = await api.get('/device-tokens');
  return response.data?.data || response.data || [];
};

export default {
  registerDeviceToken,
  deleteDeviceToken,
  getDeviceTokens,
};
