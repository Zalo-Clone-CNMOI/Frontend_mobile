import { apiJsonRequest } from './apiRequest';

export async function registerDeviceToken(payload: {
  token: string;
  platform: 'android' | 'ios';
}) {
  return apiJsonRequest('POST', '/device-tokens', { body: payload });
}

export default {
  registerDeviceToken,
};
