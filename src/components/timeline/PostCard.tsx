import { useTheme } from '@/src/theme/themeContext';
import { formatTimeAgo } from '@/src/utils/formatTimeAgo';
import { ShareUtils } from '@/src/utils/shareUtils';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Comment } from './CommentModal';
import { CommentModal } from './CommentModal';
import { PostOptions } from './PostOptions';
import { useTranslation } from 'react-i18next';

export type PostAuthor = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type PostCardProps = {
  author: PostAuthor;
  content: string;
  createdAt: number | string | Date;
  liked?: boolean;
  likes?: number;
  comments?: number;
  shares?: number;
  images?: string[];
  onPressMore?: () => void;
  onPressLike?: () => void;
  onPressComment?: () => void;
  onPressShare?: () => void;
  onPressMedia?: (uri: string) => void;
};

export function PostCard({
  author,
  content,
  createdAt,
  liked = false,
  likes = 0,
  comments = 0,
  shares = 0,
  images,
  onPressMore,
  onPressLike,
  onPressComment,
  onPressShare,
  onPressMedia,
}: PostCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [postComments, setPostComments] = useState<Comment[]>([]);

  const createdAtMs = useMemo(() => {
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === 'number') return createdAt;
    const d = new Date(createdAt);
    return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
  }, [createdAt]);

  const timeLabel = useMemo(() => formatTimeAgo(createdAtMs), [createdAtMs]);

  const firstImage = useMemo(() => images?.[0], [images]);

  const secondaryTextStyle = useMemo(
    () => ({ color: theme.colors.text, opacity: 0.6 }),
    [theme.colors.text],
  );

  const defaultActionColor = theme.colors.icon;
  const activeActionColor = theme.colors.primary;

  const handleShare = async () => {
    try {
      await ShareUtils.sharePost(content, author.name, images);
      onPressShare?.();
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleChatWithAuthor = () => {
    // Navigate to chat with author
    router.push(`/chat/${author.id}`);
  };

  const handleMoreOptions = () => {
    setShowOptions(true);
    onPressMore?.();
  };

  const handleComments = () => {
    setShowComments(true);
    onPressComment?.();
  };

  const handleAddComment = (postId: string, content: string) => {
    // This would typically get user info from auth context
    const currentUserId = 'user-me'; // This should come from auth context
    const currentUserName = 'Bạn (Me)';
    const currentUserAvatar = 'https://i.pravatar.cc/150?u=user-me';
    
    // For now, just update local state
    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      postId,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      content,
      createdAt: Date.now(),
    };
    
    setPostComments(prev => [...prev, newComment]);
  };

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            ...(Platform.OS === 'ios'
              ? { shadowColor: theme.colors.border }
              : null),
          },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={{ uri: author.avatarUrl || '' }}
            style={[styles.avatar, { backgroundColor: theme.colors.background }]}
          />

          <View style={styles.headerContent}>
            <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
              {author.name}
            </Text>
            <Text style={[styles.createdAt, secondaryTextStyle]} numberOfLines={1}>
              {timeLabel}
            </Text>
          </View>

          <Pressable
            onPress={handleMoreOptions}
            hitSlop={10}
            style={styles.moreButton}
          >
            <MoreHorizontal size={20} color={theme.colors.icon} />
          </Pressable>
        </View>

        <Text
          style={[styles.content, { color: theme.colors.text }]}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {content}
        </Text>

        {firstImage ? (
          <Pressable onPress={() => onPressMedia?.(firstImage)}>
            <Image
              source={{ uri: firstImage }}
              style={[styles.media, { backgroundColor: theme.colors.background }]}
            />
          </Pressable>
        ) : null}

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Pressable
            onPress={onPressLike}
            style={styles.action}
            hitSlop={6}
          >
            <Heart
              size={18}
              color={liked ? activeActionColor : defaultActionColor}
            />
            <Text
              style={[
                styles.actionLabel,
                {
                  color: liked ? activeActionColor : defaultActionColor,
                },
              ]}
              numberOfLines={1}
            >
              {likes > 0 ? likes : 'Like'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleComments}
            style={styles.action}
            hitSlop={6}
          >
            <MessageCircle size={18} color={defaultActionColor} />
            <Text
              style={[styles.actionLabel, { color: defaultActionColor }]}
              numberOfLines={1}
            >
              {comments > 0 ? comments : 'Comment'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={styles.action}
            hitSlop={6}
          >
            <Share2 size={18} color={defaultActionColor} />
            <Text
              style={[styles.actionLabel, { color: defaultActionColor }]}
              numberOfLines={1}
            >
              {shares > 0 ? shares : 'Share'}
            </Text>
          </Pressable>
        </View>
      </View>
      
      {showOptions && (
        <PostOptions
          postId={author.id}
          postContent={content}
          postAuthor={author.name}
          postImages={images}
          onChatWithAuthor={handleChatWithAuthor}
          onSharePost={handleShare}
          visible={showOptions}
          onClose={() => setShowOptions(false)}
        />
      )}

      {showComments && (
        <CommentModal
          visible={showComments}
          onClose={() => setShowComments(false)}
          postId={author.id}
          postAuthor={author.name}
          comments={postComments}
          onAddComment={handleAddComment}
          currentUserId="user-me"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  createdAt: {
    fontSize: 12,
    marginTop: 1,
  },
  moreButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  content: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  media: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionLabel: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
});
