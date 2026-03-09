// /**
//  * ChatMessageSendCommand – shape of the payload sent to the server when a user
//  * sends a chat message.  Based on this we define a local type and export
//  * production-like mock data that can be loaded into the message store.
//  *
//  * Senders:
//  *   user_123 → "user-me"  (current user)
//  *   user_456 → "u6"       (peer in conv_001)
//  *   user_999 → "u7"       (peer in conv_002)
//  */

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type AttachmentType = 'image' | 'video' | 'file' | 'voice';

// export interface AttachmentSendCommand {
//   /** S3 / storage object key */
//   key: string;
//   type: AttachmentType;
//   name: string;
//   /** raw size in bytes */
//   size: number;
//   content_type: string;
//   /** optional pre-generated thumbnail key (for images/videos) */
//   thumbnail_key?: string;
// }

// export interface ChatMessageSendCommand {
//   message_id: string;
//   conversation_id: string;
//   sender_id: string;
//   /** text body – may be empty when the message is attachment-only */
//   body: string;
//   /** unix timestamp in milliseconds */
//   sent_at: number;
//   reply_to_message_id?: string;
//   attachments?: AttachmentSendCommand[];
//   trace_id: string;
// }

// // ─── Mock Data – conv_001 ─────────────────────────────────────────────────────

// export const mockMessages: ChatMessageSendCommand[] = [
//   {
//     message_id: 'msg_001',
//     conversation_id: 'conv_001',
//     sender_id: 'user_123',
//     body: 'Chào bạn, hôm nay họp lúc mấy giờ?',
//     sent_at: 1710000000000,
//     trace_id: 'trace_001',
//   },
//   {
//     message_id: 'msg_002',
//     conversation_id: 'conv_001',
//     sender_id: 'user_456',
//     body: '10h nhé',
//     sent_at: 1710000005000,
//     reply_to_message_id: 'msg_001',
//     trace_id: 'trace_002',
//   },
//   {
//     message_id: 'msg_003',
//     conversation_id: 'conv_001',
//     sender_id: 'user_123',
//     body: 'Gửi bạn hình tài liệu',
//     sent_at: 1710000010000,
//     attachments: [
//       {
//         key: 'attachments/images/img_001.jpg',
//         type: 'image',
//         name: 'design_mockup.jpg',
//         size: 245678,
//         content_type: 'image/jpeg',
//         thumbnail_key: 'attachments/images/thumb_img_001.jpg',
//       },
//     ],
//     trace_id: 'trace_003',
//   },
//   {
//     message_id: 'msg_004',
//     conversation_id: 'conv_001',
//     sender_id: 'user_456',
//     body: 'Đây là file PDF',
//     sent_at: 1710000015000,
//     attachments: [
//       {
//         key: 'attachments/files/file_001.pdf',
//         type: 'file',
//         name: 'project-spec.pdf',
//         size: 1048576,
//         content_type: 'application/pdf',
//       },
//     ],
//     trace_id: 'trace_004',
//   },
//   {
//     message_id: 'msg_005',
//     conversation_id: 'conv_001',
//     sender_id: 'user_123',
//     body: 'OK mình xem rồi 👍',
//     sent_at: 1710000020000,
//     reply_to_message_id: 'msg_004',
//     trace_id: 'trace_005',
//   },
// ];

// // ─── Mock Data – conv_002 ─────────────────────────────────────────────────────

// export const mockSendMessage: ChatMessageSendCommand = {
//   message_id: 'msg_100',
//   conversation_id: 'conv_002',
//   sender_id: 'user_999',
//   body: 'Check thử upload ảnh',
//   sent_at: Date.now(),
//   attachments: [
//     {
//       key: 'attachments/images/photo_test.png',
//       type: 'image',
//       name: 'photo_test.png',
//       size: 345222,
//       content_type: 'image/png',
//       thumbnail_key: 'attachments/images/thumb_photo_test.png',
//     },
//   ],
//   trace_id: 'trace_100',
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// /**
//  * Map a sender_id coming from the SendCommand API to the internal user-id
//  * used by the store / contacts mock.
//  *
//  * Extend this map as more external user IDs are added.
//  */
// export const SENDER_ID_MAP: Record<string, string> = {
//   user_123: 'user-me',  // current user
//   user_456: 'u6',       // peer 1
//   user_999: 'u7',       // peer 2
// };

// /**
//  * All SendCommand messages from every conversation combined into one flat
//  * array – convenient for bulk loading into the store.
//  */
// export const ALL_SEND_COMMANDS: ChatMessageSendCommand[] = [
//   ...mockMessages,
//   mockSendMessage,
// ];
