import { StrOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { getLLM } from './llm.js';
import { questionReformulationPrompt } from './prompts.js';
import { logger } from '../utils/logger.js';

const MAX_HISTORY_MESSAGES = 10; // Limit to last 5 exchanges

export function limitHistory(
  history: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return history.slice(-MAX_HISTORY_MESSAGES);
}

export function buildLangChainHistory(
  history: Array<{ role: string; content: string }>
): Array<HumanMessage | AIMessage> {
  return history.map((msg) => {
    if (msg.role === 'USER' || msg.role === 'user') {
      return new HumanMessage(msg.content);
    }
    return new AIMessage(msg.content);
  });
}

export async function reformulateQuestion(
  question: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  if (history.length === 0) {
    return question;
  }

  try {
    const llm = getLLM();
    const outputParser = new StrOutputParser();
    const limitedHistory = limitHistory(history);
    const chatHistory = buildLangChainHistory(limitedHistory);

    const chain = RunnableSequence.from([
      {
        question: (input: { question: string; chat_history: Array<HumanMessage | AIMessage> }) =>
          input.question,
        chat_history: (input: { question: string; chat_history: Array<HumanMessage | AIMessage> }) =>
          input.chat_history,
      },
      questionReformulationPrompt,
      llm,
      outputParser,
    ]);

    const standaloneQuestion = await chain.invoke({
      question,
      chat_history: chatHistory,
    });

    logger.debug(`Question reformulated: "${question}" -> "${standaloneQuestion}"`);
    return standaloneQuestion.trim();
  } catch (error) {
    logger.warn('Question reformulation failed, using original', { error });
    return question;
  }
}
