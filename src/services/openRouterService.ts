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

  const response = await fetch("/api/chat", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

    },

    body: JSON.stringify({

      "model": "google/gemini-2.0-flash-001",

      "messages": messages,

      "tools": tools,

      "tool_choice": tools ? "auto" : undefined,

    })

  });



  if (!response.ok) {

    const errorData = await response.json();

    const errorMessage = typeof errorData.error === 'string' 

      ? errorData.error 

      : (errorData.error?.message || JSON.stringify(errorData.error || errorData) || "Failed to fetch from OpenRouter");

    throw new Error(errorMessage);

  }



  return response.json();

}
