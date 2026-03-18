import AsyncStorage from "@react-native-async-storage/async-storage";

// Keys cho AsyncStorage
const AUTH_KEYS = {
  ACCESS_TOKEN: "@access_token",
  REFRESH_TOKEN: "@refresh_token",
  USER_INFO: "@user_info",
  PHONE_NUMBER: "@phone_number",
  IS_LOGGED_IN: "@is_logged_in",
};

// Interface cho user info
export interface UserInfo {
  phone: string;
  password?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  loginTime?: number;
}

// Lưu thông tin đăng nhập
export const saveAuthData = async (userInfo: UserInfo) => {
  try {
    await AsyncStorage.multiSet([
      [AUTH_KEYS.ACCESS_TOKEN, userInfo.tokens?.accessToken || ""],
      [AUTH_KEYS.REFRESH_TOKEN, userInfo.tokens?.refreshToken || ""],
      [AUTH_KEYS.USER_INFO, JSON.stringify(userInfo)],
      [AUTH_KEYS.PHONE_NUMBER, userInfo.phone],
      [AUTH_KEYS.IS_LOGGED_IN, "true"],
    ]);
    console.log("Auth data saved successfully");
    console.log(userInfo);
  } catch (error) {
    console.error("Error saving auth data:", error);
  }
};

// Lấy thông tin đăng nhập
export const getAuthData = async (): Promise<UserInfo | null> => {
  try {
    const results = await AsyncStorage.multiGet([
      AUTH_KEYS.ACCESS_TOKEN,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN,
    ]);

    const accessToken = results[0]?.[1] || null;
    const refreshToken = results[1]?.[1] || null;
    const userInfoStr = results[2]?.[1] || null;
    const phoneNumber = results[3]?.[1] || null;
    const isLoggedIn = results[4]?.[1] || null;

    if (isLoggedIn === "true" && userInfoStr && phoneNumber) {
      const userInfo = JSON.parse(userInfoStr);
      return {
        ...userInfo,
        tokens: {
          accessToken: accessToken || userInfo.tokens?.accessToken || "",
          refreshToken: refreshToken || userInfo.tokens?.refreshToken || "",
          expiresIn: userInfo.tokens?.expiresIn || 0,
        },
        phone: phoneNumber,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting auth data:", error);
    return null;
  }
};

// Xóa thông tin đăng nhập (logout)
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_KEYS.ACCESS_TOKEN,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN,
    ]);
    console.log("Auth data cleared successfully");
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};

// Kiểm tra xem đã đăng nhập chưa
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const isLoggedIn = await AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN);
    return isLoggedIn === "true";
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

// Lấy token hiện tại
export const getCurrentToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// Lấy refresh token hiện tại
export const getCurrentRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return null;
  }
};

// Refresh access token
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    console.log("🔄 Starting token refresh...");

    const refreshToken = await getCurrentRefreshToken();
    if (!refreshToken) {
      console.error("❌ No refresh token available");
      throw new Error("No refresh token available");
    }

    console.log("📡 Sending refresh request to server...");
    console.log(
      "Refresh token (first 20 chars):",
      refreshToken.substring(0, 20) + "...",
    );

    // Try multiple fallback endpoints
    const refreshEndpoints = [
      "http://175.41.136.189:5000/api/auth/refresh",
      "http://54.179.206.215:5000/api/auth/refresh",
      "http://175.41.136.189:3000/api/auth/refresh",
      "http://localhost:5000/api/auth/refresh"
    ];

    let lastError: any = null;

    for (const endpoint of refreshEndpoints) {
      try {
        console.log(`🔄 Trying refresh endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`📡 Response status from ${endpoint}:`, response.status);
        console.log(`📡 Response ok from ${endpoint}:`, response.ok);

        const data = await response.json();
        console.log(`📡 Response data from ${endpoint}:`, JSON.stringify(data, null, 2));

        if (!response.ok) {
          console.error(
            `❌ Server ${endpoint} returned error:`,
            response.status,
            data.message || "Unknown error",
          );
          lastError = new Error(
            data.message || `Failed to refresh token (${response.status})`,
          );
          continue; // Try next endpoint
        }

        // Save new tokens
        const currentAuthData = await getAuthData();
        if (currentAuthData) {
          const newAccessToken = data.tokens?.accessToken || data.accessToken || "";
          const newRefreshToken =
            data.tokens?.refreshToken || data.refreshToken || refreshToken;
          const expiresIn = data.tokens?.expiresIn || data.expiresIn || 0;

          console.log("💾 Saving new tokens...");
          console.log("New access token length:", newAccessToken.length);
          console.log("New refresh token length:", newRefreshToken.length);

          const updatedAuthData = {
            ...currentAuthData,
            tokens: {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              expiresIn: expiresIn,
            },
          };

          await saveAuthData(updatedAuthData);
          console.log(`✅ Token refreshed and saved successfully from ${endpoint}`);
          return newAccessToken;
        }

        console.error("❌ No current auth data found");
        return null;

      } catch (endpointError: any) {
        console.warn(`❌ Refresh endpoint ${endpoint} failed:`, endpointError.message);
        lastError = endpointError;
        continue; // Try next endpoint
      }
    }

    // All endpoints failed
    console.error("❌ All refresh endpoints failed");
    throw lastError || new Error("All refresh endpoints failed");

  } catch (error) {
    console.error("❌ Error refreshing token:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });

    // If refresh fails, clear auth data and force login
    console.log("🗑️ Clearing auth data due to refresh failure...");
    await clearAuthData();
    return null;
  }
};

// Lấy thông tin user hiện tại
export const getCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const userInfoStr = await AsyncStorage.getItem(AUTH_KEYS.USER_INFO);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// API wrapper with auto-refresh token
export const apiCallWithRefresh = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  try {
    console.log("🌐 Making API call to:", url);

    // Get current access token
    let accessToken = await getCurrentToken();

    // If no access token, try to refresh
    if (!accessToken) {
      console.log("🔄 No access token found, attempting refresh...");
      accessToken = await refreshAccessToken();
      if (!accessToken) {
        throw new Error("No valid token available after refresh");
      }
    }

    console.log("📡 Making initial API call...");

    // Make initial API call
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Initial response status:", response.status);

    // If token expired (401), try refresh once
    if (response.status === 401) {
      console.log("🔄 Token expired (401), attempting refresh...");
      const newAccessToken = await refreshAccessToken();

      if (!newAccessToken) {
        throw new Error("Failed to refresh token after 401");
      }

      console.log("📡 Retrying API call with new token...");

      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
          "Content-Type": "application/json",
        },
      });
    }

    return response;
  } catch (error) {
    console.error("❌ API call error:", error);
    console.error("❌ API call details:", {
      url,
      method: options.method || "GET",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};
