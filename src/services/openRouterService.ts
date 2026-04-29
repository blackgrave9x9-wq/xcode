export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
}

export interface ChatCompletionResponse {
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: {
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
  }[];
}

export async function chatCompletion(
  messages: Message[],
  tools?: any[]
): Promise<ChatCompletionResponse> {
  // Tunapiga OpenRouter moja kwa moja ili kuepuka Error 405 ya Cloudflare
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // WEKA API KEY YAKO HAPA CHINI (Badala ya 'SK-...')
      "Authorization": "Bearer WEKA_API_KEY_YAKO_HAPA",
      "HTTP-Referer": window.location.origin, 
      "X-Title": "Coty AI Concierge"
    },
    body: JSON.stringify({
      "model": "google/gemini-2.0-flash-001",
      "messages": messages,
      "tools": tools,
      "tool_choice": tools ? "auto" : undefined,
    })
  });

  // Ikitokea hitilafu (mfano: API Key mbaya au salio limeisha)
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Failed to fetch from OpenRouter";
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `Error ${response.status}: ${errorText}`;
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}
