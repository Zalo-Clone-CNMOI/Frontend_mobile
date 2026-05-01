type UnknownRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

export const getStringField = (
  payload: UnknownRecord,
  fields: string[],
): string | undefined => {
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
};

export const getNumberField = (
  payload: UnknownRecord,
  fields: string[],
): number | undefined => {
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return undefined;
};

export interface ChatMessageSocketPayload extends UnknownRecord {
  attachments?: unknown[];
}

export const isChatMessageSocketPayload = (
  payload: unknown,
): payload is ChatMessageSocketPayload => {
  if (!isRecord(payload)) {
    return false;
  }

  const conversationId = getStringField(payload, ['conversation_id', 'conversationId']);
  const messageId = getStringField(payload, ['id', 'message_id', 'messageId']);

  return Boolean(conversationId && messageId);
};

export interface ChatReactionSocketPayload extends UnknownRecord {
  conversation_id: string;
  message_id: string;
  user_id: string;
  reaction_type?: string;
}

export const isChatReactionSocketPayload = (
  payload: unknown,
): payload is ChatReactionSocketPayload => {
  if (!isRecord(payload)) {
    return false;
  }

  return Boolean(
    getStringField(payload, ['conversation_id']) &&
      getStringField(payload, ['message_id']) &&
      getStringField(payload, ['user_id']),
  );
};

export interface SocketAckPayload extends UnknownRecord {
  message_id: string;
  status?: string;
}

export const isSocketAckPayload = (payload: unknown): payload is SocketAckPayload => {
  if (!isRecord(payload)) {
    return false;
  }

  return Boolean(getStringField(payload, ['message_id']));
};
