import React from 'react';
import { Text } from 'react-native';
import type { WsMention } from '@/src/realtime/events';

interface MentionHighlightProps {
  text: string;
  mentions: WsMention[];
  textColor: string;
  highlightColor: string;
}

export function MentionHighlight({ text, mentions, textColor, highlightColor }: MentionHighlightProps) {
  if (!mentions || mentions.length === 0) {
    return <Text style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>{text}</Text>;
  }

  const sorted = [...mentions].sort((a, b) => a.offset - b.offset);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sorted.forEach((mention, idx) => {
    if (mention.offset > lastIndex && mention.offset < text.length) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>
          {text.slice(lastIndex, mention.offset)}
        </Text>,
      );
    }

    const mentionEnd = Math.min(mention.offset + mention.length, text.length);
    const mentionText = text.slice(mention.offset, mentionEnd);

    parts.push(
      <Text
        key={`m-${idx}`}
        style={{
          color: textColor,
          fontSize: 15,
          lineHeight: 22,
          backgroundColor: highlightColor,
          borderRadius: 3,
        }}
      >
        {mentionText}
      </Text>,
    );

    lastIndex = mentionEnd;
  });

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${lastIndex}`} style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return <Text>{parts}</Text>;
}
