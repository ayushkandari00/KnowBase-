import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { StrOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { getLLM } from './llm.js';
import { createRetriever } from './retriever.js';
import { reformulateQuestion, buildLangChainHistory } from './conversationalRag.js';
import { formatDocsAsContext, extractSources } from './ragChain.js';
import { ragPrompt, FALLBACK_RESPONSE } from './prompts.js';
import { Source } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// State annotation – typed state for the LangGraph nodes
// ---------------------------------------------------------------------------
const RAGStateAnnotation = Annotation.Root({
  question: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  standaloneQuestion: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  conversationHistory: Annotation<Array<{ role: string; content: string }>>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  documents: Annotation<Document[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  context: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  answer: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  sources: Annotation<Source[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  retrievalQuality: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  isFallback: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

type RAGState = typeof RAGStateAnnotation.State;

// ---------------------------------------------------------------------------
// Node: Reformulate the question into a standalone question
// ---------------------------------------------------------------------------
async function reformulateNode(state: RAGState): Promise<Partial<RAGState>> {
  logger.debug('Graph node: reformulate_question');

  const standaloneQuestion = await reformulateQuestion(
    state.question,
    state.conversationHistory
  );

  return { standaloneQuestion };
}

// ---------------------------------------------------------------------------
// Node: Retrieve relevant documents using the standalone question
// ---------------------------------------------------------------------------
async function retrieveNode(state: RAGState): Promise<Partial<RAGState>> {
  logger.debug('Graph node: retrieve');

  const retriever = createRetriever();
  const documents = await retriever._getRelevantDocuments(state.standaloneQuestion);

  const context = formatDocsAsContext(documents);
  const sources = extractSources(documents);

  // Compute retrieval quality as mean similarity score
  const avgSimilarity =
    documents.length > 0
      ? documents.reduce((sum, doc) => sum + ((doc.metadata.similarity as number) ?? 0), 0) /
        documents.length
      : 0;

  return { documents, context, sources, retrievalQuality: avgSimilarity };
}

// ---------------------------------------------------------------------------
// Node: Generate answer using retrieved context
// ---------------------------------------------------------------------------
async function generateNode(state: RAGState): Promise<Partial<RAGState>> {
  logger.debug('Graph node: generate');

  if (state.documents.length === 0) {
    return { answer: FALLBACK_RESPONSE, isFallback: true };
  }

  const llm = getLLM();
  const outputParser = new StrOutputParser();

  const chatHistory: Array<HumanMessage | AIMessage> = buildLangChainHistory(
    state.conversationHistory
  );

  const chain = RunnableSequence.from([
    {
      context: (input: { context: string; question: string; chat_history: Array<HumanMessage | AIMessage> }) =>
        input.context,
      question: (input: { context: string; question: string; chat_history: Array<HumanMessage | AIMessage> }) =>
        input.question,
      chat_history: (input: { context: string; question: string; chat_history: Array<HumanMessage | AIMessage> }) =>
        input.chat_history,
    },
    ragPrompt,
    llm,
    outputParser,
  ]);

  try {
    const answer = await chain.invoke({
      context: state.context,
      question: state.standaloneQuestion,
      chat_history: chatHistory,
    });

    return { answer, isFallback: false };
  } catch (error) {
    logger.error('Generation failed', { error });
    return { answer: FALLBACK_RESPONSE, isFallback: true };
  }
}

// ---------------------------------------------------------------------------
// Conditional edge: decide whether to generate or fall back
// ---------------------------------------------------------------------------
function shouldGenerate(state: RAGState): 'generate' | 'fallback' {
  if (state.documents.length === 0) {
    return 'fallback';
  }
  return 'generate';
}

// ---------------------------------------------------------------------------
// Node: Fallback when no relevant documents were found
// ---------------------------------------------------------------------------
async function fallbackNode(state: RAGState): Promise<Partial<RAGState>> {
  logger.debug('Graph node: fallback');
  return { answer: FALLBACK_RESPONSE, isFallback: true };
}

// ---------------------------------------------------------------------------
// Build and compile the graph
// ---------------------------------------------------------------------------
export function buildRAGGraph() {
  const graph = new StateGraph(RAGStateAnnotation)
    .addNode('reformulate', reformulateNode)
    .addNode('retrieve', retrieveNode)
    .addNode('generate', generateNode)
    .addNode('fallback', fallbackNode)
    .addEdge(START, 'reformulate')
    .addEdge('reformulate', 'retrieve')
    .addConditionalEdges('retrieve', shouldGenerate, {
      generate: 'generate',
      fallback: 'fallback',
    })
    .addEdge('generate', END)
    .addEdge('fallback', END);

  return graph.compile();
}

// Singleton compiled graph
let compiledGraph: ReturnType<typeof buildRAGGraph> | null = null;

export function getRAGGraph() {
  if (!compiledGraph) {
    compiledGraph = buildRAGGraph();
  }
  return compiledGraph;
}

// ---------------------------------------------------------------------------
// Convenience: run the full RAG pipeline
// ---------------------------------------------------------------------------
export async function runRAGPipeline(
  question: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{
  answer: string;
  sources: Source[];
  isFallback: boolean;
  retrievalQuality: number;
}> {
  const graph = getRAGGraph();

  const result = await graph.invoke({
    question,
    conversationHistory,
    standaloneQuestion: question,
    documents: [],
    context: '',
    answer: '',
    sources: [],
    retrievalQuality: 0,
    isFallback: false,
  });

  return {
    answer: result.answer,
    sources: result.sources,
    isFallback: result.isFallback,
    retrievalQuality: result.retrievalQuality,
  };
}
