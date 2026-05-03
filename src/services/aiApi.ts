import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

// Entity Info API is in BFF service, not API service
const ENTITY_INFO_BASE_URL = NETWORK_CONFIG.BFF_BASE_URL;

// Make HTTP request with auth refresh
const request = async (
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  useBFF: boolean = true, // Use BFF for Entity Info API
) => {
  const baseUrl = useBFF ? ENTITY_INFO_BASE_URL : NETWORK_CONFIG.API_BASE_URL;
  const response = await apiCallWithRefresh(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return { data, status: response.status };
};

// Entity Info API types
export interface EntityInfoRequest {
  text: string;
  type: 'tool' | 'company' | 'person' | 'concept' | 'location' | 'product' | 'other';
  lang?: 'vi' | 'en';
  user_id?: string;
}

export interface EntityInfoResponse {
  entity_text: string;
  entity_type: 'tool' | 'company' | 'person' | 'concept' | 'location' | 'product' | 'other';
  title: string;
  summary: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface AIChatRequest {
  message: string;
  conversation_id?: string;
  context?: {
    previous_messages?: {
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }[];
    user_preferences?: Record<string, any>;
    current_conversation?: string;
  };
}

export interface AIChatResponse {
  response: string;
  entities?: {
    text: string;
    type: string;
    confidence: number;
  }[];
  suggestions?: string[];
  confidence: number;
  processing_time_ms: number;
  needs_clarification?: boolean;
  follow_up_questions?: string[];
}

/**
 * Get entity information from text
 * Uses Entity Info API to extract and analyze entities
 */
export const getEntityInfo = async (payload: EntityInfoRequest): Promise<{ data: EntityInfoResponse; status: number }> => {
  // Validation
  if (!payload.text || payload.text.trim().length === 0) {
    throw new Error('Text is required for entity detection');
  }
  
  if (payload.text.length > 200) {
    throw new Error('Text must not exceed 200 characters');
  }

  // Backend Entity Info API uses GET with query parameters
  const queryParams = new URLSearchParams({
    text: payload.text,
    type: payload.type,
    lang: payload.lang || 'vi',
    user_id: payload.user_id || 'unknown', // Backend requires user_id
  });

  const result = await request('GET', `/entity-info?${queryParams.toString()}`, undefined, true);
  return result as { data: EntityInfoResponse; status: number };
};

/**
 * Send message to AI chat with entity analysis
 * Combines chat functionality with entity detection
 */
export const sendAIChatMessage = async (payload: AIChatRequest): Promise<{ data: AIChatResponse; status: number }> => {
  // Validation
  if (!payload.message || payload.message.trim().length === 0) {
    throw new Error('Message is required');
  }
  
  if (payload.message.length > 2000) {
    throw new Error('Message must not exceed 2000 characters');
  }

  // Try different endpoints for AI chat
  const endpoints = [
    '/ai/chat',
    '/chat/ai',
    '/entity-info/chat',
  ];

  for (const endpoint of endpoints) {
    try {
      const result = await request('POST', endpoint, payload);
      return result as { data: AIChatResponse; status: number };
    } catch (error: any) {
      // Continue trying other endpoints if not found
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        continue;
      }
      throw error;
    }
  }

  // If no endpoint works, fallback to entity info + mock response
  try {
    const entityResult = await getEntityInfo({ 
      text: payload.message,
      type: 'other', // Default type for fallback
      lang: 'vi',
      user_id: payload.context?.user_preferences?.userId || 'unknown'
    });
    
    // Generate contextual response based on entity info
    const entity = entityResult.data;
    let contextualResponse = 'Tôi đã phân tích tin nhắn của bạn. ';
    
    if (entity.entity_text && entity.entity_type) {
      contextualResponse += `Tôi phát hiện thực thể: `;
      contextualResponse += `${entity.entity_type} "${entity.entity_text}". `;
    }
    
    contextualResponse += 'Để tôi giúp bạn thêm thông tin về những gì bạn vừa nhắc đến...';

    const hasEntity = !!(entity.entity_text && entity.entity_type);
    const mockAIResponse: AIChatResponse = {
      response: contextualResponse,
      entities: hasEntity ? [{
        text: entity.entity_text!,
        type: entity.entity_type!,
        confidence: 0.8, // Default confidence for fallback
      }] : [],
      suggestions: hasEntity ? [
        `Tìm hiểu thêm về ${entity.entity_type}`,
        `Xem các thông tin liên quan đến ${entity.entity_text}`,
        'Đặt câu hỏi chi tiết hơn'
      ] : [
        'Cho tôi biết thêm chi tiết',
        'Bạn có thể làm rõ hơn không?',
        'Tôi có thể giúp gì nữa?'
      ],
      confidence: hasEntity ? 0.8 : 0.5,
      processing_time_ms: 1000, // Default processing time for fallback
      needs_clarification: !hasEntity,
      follow_up_questions: hasEntity ? [
        `Bạn muốn biết thêm về ${entity.entity_text}?`,
        `Có liên quan đến ${entity.entity_type} khác không?`
      ] : [
        'Bạn đang tìm kiếm thông tin về gì?',
        'Có thể cho tôi thêm bối cảnh không?'
      ]
    };

    return { data: mockAIResponse, status: 200 };
  } catch {
    // Final fallback
    const fallbackResponse: AIChatResponse = {
      response: 'Xin lỗi, tôi đang gặp sự cố kết nối đến dịch vụ AI. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
      confidence: 0,
      processing_time_ms: 0,
      suggestions: ['Thử lại sau', 'Kiểm tra kết nối mạng'],
      needs_clarification: true,
    };
    
    return { data: fallbackResponse, status: 200 };
  }
};

/**
 * Get AI suggestions based on context
 */
export const getAISuggestions = async (context?: string): Promise<string[]> => {
  const suggestions = [
    'Tìm kiếm thông tin về người dùng',
    'Phân tích tin nhắn gần đây',
    'Gợi ý câu trả lời cho cuộc trò chuyện',
    'Tóm tắt cuộc trò chuyện',
    'Phát hiện thực thể quan trọng',
  ];

  // If context is provided, try to get contextual suggestions
  if (context && context.trim().length > 0) {
    try {
      const result = await getEntityInfo({ 
        text: context,
        type: 'other', // Default type for suggestions
        lang: 'vi',
        user_id: 'unknown' // Fallback user_id for suggestions
      });
      const entity = result.data;
      
      if (entity.entity_text && entity.entity_type) {
        return [
          `Tìm hiểu thêm về ${entity.entity_type}`,
          `Phân tích các ${entity.entity_type} liên quan`,
          `Gợi ý về ${entity.entity_type}`,
          ...suggestions.slice(0, 2)
        ];
      }
    } catch {
      // Fallback to default suggestions
    }
  }

  return suggestions;
};

export default {
  getEntityInfo,
  sendAIChatMessage,
  getAISuggestions,
};
