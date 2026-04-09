import { FirebaseMessagingAdapter, ForegroundNotificationPayload } from "../../types/realtimeBff";

type FirebaseGetToken = (
  messaging: unknown,
  options: { vapidKey: string },
) => Promise<string>;

type FirebaseOnMessage = (
  messaging: unknown,
  callback: (payload: ForegroundNotificationPayload) => void,
) => () => void;

type FirebaseDeleteToken = (messaging: unknown) => Promise<boolean | void>;

type CreateFirebaseWebMessagingAdapterOptions = {
  messaging: unknown;
  getToken: FirebaseGetToken;
  onMessage: FirebaseOnMessage;
  deleteToken?: FirebaseDeleteToken;
};

export const createFirebaseWebMessagingAdapter = ({
  messaging,
  getToken,
  onMessage,
  deleteToken,
}: CreateFirebaseWebMessagingAdapterOptions): FirebaseMessagingAdapter => ({
  getToken: (options) => getToken(messaging, options),
  deleteToken: deleteToken ? () => deleteToken(messaging) : undefined,
  onMessage: (callback) => onMessage(messaging, callback),
});
