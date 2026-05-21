export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('Network Error') ||
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('ERR_NETWORK') ||
    error?.message?.includes('ERR_INTERNET_DISCONNECTED') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.code === 'ERR_NETWORK' ||
    error?.message?.includes('Failed to connect')
  );
};

export const isTimeoutError = (error: any): boolean => {
  return (
    error?.message?.includes('timeout') ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'TIMEOUT' ||
    error?.message?.includes('aborted')
  );
};

export const isRetryableRequestError = (error: any): boolean =>
  isNetworkError(error) || isTimeoutError(error);

export const getErrorMessage = (error: any): string => {
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection.';
  }
  
  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.';
  }
  
  if (error?.response?.status === 400) {
    const errorData = error?.response?.data;
    if (Array.isArray(errorData?.message)) {
      return errorData.message.join(', ');
    }
    if (typeof errorData?.message === 'string') {
      return errorData.message;
    }
    return 'Invalid request. Please check your input.';
  }
  
  if (error?.response?.status === 401) {
    return 'Authentication expired. Please log in again.';
  }
  
  if (error?.response?.status === 404) {
    return 'Service not available. Please try again later.';
  }
  
  if (error?.response?.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  return error?.message || 'An unexpected error occurred.';
};

export default {
  isNetworkError,
  isRetryableRequestError,
  isTimeoutError,
  getErrorMessage,
};
