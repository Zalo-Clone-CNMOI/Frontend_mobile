import { Alert } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
}

class ToastService {
  private toastQueue: Array<{ type: ToastType; options: ToastOptions }> = [];
  private isShowing = false;

  show(type: ToastType, options: ToastOptions) {
    this.toastQueue.push({ type, options });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isShowing || this.toastQueue.length === 0) {
      return;
    }

    this.isShowing = true;
    const { type, options } = this.toastQueue.shift()!;

    const title = options.title || this.getDefaultTitle(type);
    
    Alert.alert(title, options.message, [
      { text: 'OK', style: type === 'error' ? 'destructive' : 'default' }
    ]);

    // Wait for alert to be dismissed (approximate)
    setTimeout(() => {
      this.isShowing = false;
      this.processQueue();
    }, 100);
  }

  private getDefaultTitle(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'info':
        return 'Info';
      default:
        return 'Notification';
    }
  }

  success(message: string, title?: string) {
    this.show('success', { message, title });
  }

  error(message: string, title?: string) {
    this.show('error', { message, title });
  }

  info(message: string, title?: string) {
    this.show('info', { message, title });
  }
}

export const toast = new ToastService();
