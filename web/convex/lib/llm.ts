
export interface GeminiOptions {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

export async function callGemini(prompt: string, apiKey: string, options: GeminiOptions = {}): Promise<string> {
  const {
    temperature = 0.1,
    maxOutputTokens = 65536,
    responseMimeType = "application/json"
  } = options;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}
