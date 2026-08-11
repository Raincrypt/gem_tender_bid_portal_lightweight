import {
  OLLAMA_GENERATE_URL,
  OLLAMA_MODEL,
  OLLAMA_TEMPERATURE,
  AI_FALLBACK_TEXT_LIMIT,
} from '../config/config.js';
import { logServer } from './logService.js';

export async function extractFallback(text) {
  logServer('AI fallback called - processing extractFallback');
  const truncatedText = text ? text.substring(0, AI_FALLBACK_TEXT_LIMIT) : '';

  const prompt = `Extract these 4 exact fields from the contract text:
1. woNumber: Contract/WO/GeM Number (e.g. GEMC-12345, WO-9988)
2. woValue: Total Value with taxes (e.g. 48,12,345.00 or Rs. 500000)
3. date: Contract Date (DD-MM-YYYY or DD-Mon-YYYY)
4. ministry: Buyer Ministry / Organization Name

If missing or unreadable, output "Not Found".

Text:
"""
${truncatedText}
"""`;

  const fallbackResponse = {
    woNumber: "Not Found",
    woValue: "Not Found",
    date: "Not Found",
    ministry: "Not Found"
  };

  try {
    const response = await fetch(OLLAMA_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: { temperature: OLLAMA_TEMPERATURE },
        format: {
          type: "object",
          properties: {
            woNumber: { type: "string" },
            woValue: { type: "string" },
            date: { type: "string" },
            ministry: { type: "string" }
          },
          required: ["woNumber", "woValue", "date", "ministry"]
        }
      })
    });

    if (!response.ok) {
      logServer(`Ollama returned ${response.status}`);
      return fallbackResponse;
    }

    const data = await response.json();
    let rawText = data.response;

    if (!rawText) {
      logServer('Empty response from Ollama');
      return fallbackResponse;
    }

    const parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    logServer('AI extracted successfully');
    return parsed;
  } catch (err) {
    logServer(`Ollama Local AI Fallback execution error: ${err.message}`);
    console.error("Ollama Local AI Fallback execution error:", err.message);
    return fallbackResponse;
  }
}
