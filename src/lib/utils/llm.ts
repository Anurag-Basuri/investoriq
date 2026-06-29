// Shared LLM utility with retry + multi-provider fallback
import { ChatOpenAI } from "@langchain/openai";

interface ProviderConfig {
  name: string;
  modelName: string;
  apiKey: string | undefined;
  baseURL: string;
}

// Build provider chain lazily (env vars aren't available at module load in Next.js)
function getProviderChain(): ProviderConfig[] {
  return [
    {
      name: "Groq",
      modelName: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    },
    {
      name: "DeepSeek",
      modelName: "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    },
    {
      name: "OpenRouter",
      modelName: "meta-llama/llama-3.3-70b-instruct",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    },
    {
      name: "HuggingFace",
      modelName: "meta-llama/Meta-Llama-3-8B-Instruct",
      apiKey: process.env.HUGGINGFACE_API_KEY,
      baseURL: "https://api-inference.huggingface.co/v1",
    },
  ];
}

/**
 * Invoke the LLM with automatic retry and provider fallback.
 * Tries each provider in order. On rate-limit (429), retries with backoff
 * before falling back to the next provider.
 */
export async function invokeLLM(
  prompt: string,
  options: {
    temperature?: number;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const { temperature = 0.1, maxRetries = 2 } = options;
  let lastError: Error | null = null;

  // Filter to only providers that have an API key configured
  const activeProviders = getProviderChain().filter((p) => !!p.apiKey);

  if (activeProviders.length === 0) {
    throw new Error("No LLM API keys configured (Groq, DeepSeek, OpenRouter, or HuggingFace required).");
  }

  for (const provider of activeProviders) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const llm = new ChatOpenAI({
          modelName: provider.modelName,
          temperature,
          apiKey: provider.apiKey as string,
          configuration: {
            baseURL: provider.baseURL,
          },
          maxRetries: 0, // We handle retries manually for provider switching
        });

        // Use invoke (ChatOpenAI automatically formats string to HumanMessage)
        const response = await llm.invoke(prompt);
        
        const text =
          typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);
            
        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 429 Too Many Requests, or specific provider error codes
        const isRateLimit =
          lastError.message.includes("429") ||
          lastError.message.includes("quota") ||
          lastError.message.includes("Too Many Requests") ||
          lastError.message.includes("insufficient_quota");

        if (isRateLimit && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
          console.warn(
            `LLM rate limited (${provider.name} - attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (isRateLimit || lastError.message.includes("503") || lastError.message.includes("502")) {
          console.warn(`Provider ${provider.name} exhausted or unavailable. Trying next provider...`);
          break; // Try next provider in the chain
        }

        // Non-rate-limit error — throw immediately
        throw lastError;
      }
    }
  }

  throw lastError || new Error("All LLM providers failed");
}

/**
 * Parse a JSON response from the LLM, stripping markdown code fences.
 * Enhanced to handle extra text from open-weights models.
 */
export function parseLLMJson<T = Record<string, unknown>>(response: string): T {
  let cleaned = response.trim();
  
  // Try to extract content inside code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    cleaned = jsonMatch[1].trim();
  }
  
  // If no fences, try to extract the first { and last }
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse JSON:", cleaned.substring(0, 200) + "...");
    throw error;
  }
}
