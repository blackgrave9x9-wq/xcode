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
  // HAPA NDIYO PANAPOFANYA KAZI: Tunaiambia iende Cloudflare badala ya Firebase
  const CLOUDFLARE_WORKER_URL = "https://weathered-cherry-987d.blackgrave9x9.workers.dev";

  const response = await fetch(CLOUDFLARE_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "prompt": messages[messages.length - 1].content,
      "messages": messages,
      "model": "google/gemini-2.0-flash-001"
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || "Tatizo limetokea kwenye Worker";
    throw new Error(errorMessage);
  }

  return response.json();
}
