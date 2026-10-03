import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env.js';

let llmInstance: ChatOpenAI | null = null;
let streamingLlmInstance: ChatOpenAI | null = null;

export function getLLM(): ChatOpenAI {
  if (!llmInstance) {
    llmInstance = new ChatOpenAI({
      modelName: env.LLM_MODEL,
      temperature: env.LLM_TEMPERATURE,
      openAIApiKey: env.LLM_API_KEY,
      configuration: {
        baseURL: env.LLM_BASE_URL,
        apiKey: env.LLM_API_KEY,
      },
      streaming: false,
    });
  }
  return llmInstance;
}

export function getStreamingLLM(): ChatOpenAI {
  if (!streamingLlmInstance) {
    streamingLlmInstance = new ChatOpenAI({
      modelName: env.LLM_MODEL,
      temperature: env.LLM_TEMPERATURE,
      openAIApiKey: env.LLM_API_KEY,
      configuration: {
        baseURL: env.LLM_BASE_URL,
        apiKey: env.LLM_API_KEY,
      },
      streaming: true,
    });
  }
  return streamingLlmInstance;
}
