import { Alert, Platform, Share as RNShare } from 'react-native';

export interface ShareContent {
  title?: string;
  message: string;
  url?: string;
}

export class ShareUtils {
  /**
   * Share content using native share dialog
   */
  static async shareContent(content: ShareContent): Promise<void> {
    try {
      const shareOptions: any = {
        title: content.title || 'Chia sẻ bài viết',
        message: content.message,
        url: content.url,
      };

      if (Platform.OS === 'ios') {
        shareOptions.subject = content.title || 'Bài viết từ Zalo Clone';
        shareOptions.excludedActivityTypes = [
          'com.apple.UIKit.activity.PostToWeibo',
          'com.apple.UIKit.activity.Print',
          'com.apple.UIKit.activity.AssignToContact',
          'com.apple.UIKit.activity.SaveToCameraRoll',
          'com.apple.UIKit.activity.AddToReadingList',
          'com.apple.UIKit.activity.PostToFlickr',
          'com.apple.UIKit.activity.PostToVimeo',
          'com.apple.UIKit.activity.PostToTencentWeibo',
          'com.apple.UIKit.activity.AirDrop',
        ];
      }

      await RNShare.share(shareOptions);
    } catch (error) {
      console.error('Share error:', error);
      // User cancelled sharing is not an error
      if (error instanceof Error && !error.message.includes('User did not share')) {
        Alert.alert('Lỗi', 'Không thể chia sẻ bài viết. Vui lòng thử lại.');
      }
    }
  }

  /**
   * Share a post with text and optional images
   */
  static async sharePost(
    content: string,
    authorName: string,
    images?: string[]
  ): Promise<void> {
    const shareMessage = `📝 ${authorName}\n\n${content}\n\n— từ Zalo Clone`;
    
    if (images && images.length > 0) {
      // For now, just share the first image URL
      // In a real app, you might want to download and share the actual image
      await this.shareContent({
        title: 'Bài viết từ Zalo Clone',
        message: shareMessage,
        url: images[0],
      });
    } else {
      await this.shareContent({
        title: 'Bài viết từ Zalo Clone',
        message: shareMessage,
      });
    }
  }

  /**
   * Share just text content
   */
  static async shareText(text: string, title?: string): Promise<void> {
    await this.shareContent({
      title: title || 'Chia sẻ',
      message: text,
    });
  }

  /**
   * Share URL
   */
  static async shareUrl(url: string, title?: string): Promise<void> {
    await this.shareContent({
      title: title || 'Chia sẻ liên kết',
      message: url,
      url: url,
    });
  }
}
