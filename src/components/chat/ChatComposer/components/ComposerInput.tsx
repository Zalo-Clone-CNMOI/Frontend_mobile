import React from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Smile, Mic, Image as ImageIcon, Send } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EmojiKeyboard, EmojiType } from 'rn-emoji-keyboard';
import { styles } from '../styles';

interface ComposerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  canSend: boolean;
  onPickImage: () => void;
  theme: any;
}

export const ComposerInput: React.FC<ComposerInputProps> = ({
  value,
  onChangeText,
  onSend,
  onTypingStart,
  onTypingStop,
  canSend,
  onPickImage,
  theme,
}) => {
  const { t } = useTranslation();
  const [showEmoji, setShowEmoji] = React.useState(false);

  const handleTextChange = (text: string) => {
    onChangeText(text);
    if (onTypingStart) onTypingStart();
  };

  const handlePickEmoji = (emoji: EmojiType) => {
    handleTextChange(value + emoji.emoji);
  };

  return (
    <>
      <View style={styles.composer}>
        <Pressable
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.card },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            setShowEmoji(true);
          }}
        >
          <Smile size={20} color={theme.colors.icon} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder={t('chat.placeholder')}
          placeholderTextColor="#8e8e93"
          multiline
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          onFocus={() => setShowEmoji(false)}
        />

        <Pressable
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.card },
          ]}
          onPress={onPickImage}
        >
          <ImageIcon size={20} color={theme.colors.icon} />
        </Pressable>

        {canSend ? (
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={onSend}
          >
            <Send size={18} color={theme.colors.icon} />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.iconBtn,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Mic size={20} color={theme.colors.icon} />
          </Pressable>
        )}
      </View>

      {showEmoji && (
        <View style={{ height: 300 }}>
          <EmojiKeyboard
            onEmojiSelected={handlePickEmoji}
            theme={{
              container: theme.colors.card,
              header: theme.colors.text,
            }}
            styles={{
              container: { borderRadius: 0 },
            }}
          />
        </View>
      )}
    </>
  );
};
