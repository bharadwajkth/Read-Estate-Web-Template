import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildCatalogContext,
  filterValidPropertyIds,
  rankSuitableProperties,
  type AdvisorResponse,
  type ChatTurn,
} from '../src/lib/aiMatcher';
import type { AgencySettings, Property } from '../src/types';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generatePropertyAdvisorReply(params: {
  message: string;
  history: ChatTurn[];
  agency: AgencySettings;
  properties: Property[];
}): Promise<AdvisorResponse & { provider: 'gemini' | 'catalog-matcher' }> {
  const { message, history, agency, properties } = params;
  const trimmedMessage = message.trim();

  const ai = createGeminiClient();
  if (!ai) {
    // Deterministic catalog matching fallback when no GEMINI_API_KEY is configured in environment
    const topMatches = rankSuitableProperties(properties, trimmedMessage, 3);
    const reply =
      topMatches.length > 0
        ? `Based on our current listings, here ${
            topMatches.length === 1 ? 'is the best match' : 'are the top matching options'
          } sorted by suitability and budget: ${topMatches
            .map((p) => `${p.title} (${p.priceDisplay}, ${p.specs.areaSqFt.toLocaleString('en-IN')} sq.ft)`)
            .join('; ')}. Select any listing below to review full specifications or request a site visit.`
        : `No active listings matched those exact criteria. Contact our brokerage desk at ${agency.phoneDisplay} for off-market sourcing.`;

    return {
      reply,
      recommendedPropertyIds: topMatches.map((p) => p.id),
      followUpSuggestions: [
        'Most affordable lease options',
        'Warehouses with loading docks',
        'Industrial plots for sale',
      ],
      provider: 'catalog-matcher',
    };
  }

  const catalogContext = buildCatalogContext(agency, properties);
  const systemInstruction = [
    `You are the Property Advisory Assistant for ${agency.agencyName} (${agency.categoryLabel}).`,
    `Help prospective tenants and buyers find affordable and suitable industrial or commercial properties strictly from the active inventory provided below.`,
    `Never invent property IDs, prices, square footage, or addresses not present in the catalog.`,
    `Keep your reply concise (2-4 clear sentences), practical, and transparent about pricing, floor/plot area, power load, and corridor fit.`,
    `If no listing fits the exact budget, mention the closest affordable alternative in the catalog and suggest contacting the desk at ${agency.phoneDisplay}.`,
    `Return up to 3 most relevant property IDs in recommendedPropertyIds.`,
    ``,
    catalogContext,
  ].join('\n');

  const recentTurns = history
    .slice(-8)
    .map((t) => `${t.role === 'user' ? 'User' : 'Advisor'}: ${t.text}`)
    .join('\n');

  const contents = recentTurns
    ? `Previous conversation:\n${recentTurns}\n\nLatest User Question: ${trimmedMessage}`
    : trimmedMessage;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description:
              'Concise, helpful recommendation explaining why the suggested properties fit the user budget and operational needs.',
          },
          recommendedPropertyIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              'Up to 3 exact property IDs from the active catalog (e.g., prop-1) matching the user query.',
          },
          followUpSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              '2 to 3 short follow-up questions the user might ask next (under 7 words each).',
          },
        },
        required: ['reply', 'recommendedPropertyIds', 'followUpSuggestions'],
      },
    },
  });

  const rawJson = (response.text ?? '').trim();
  const parsed = JSON.parse(rawJson) as Partial<AdvisorResponse>;

  const validIds = filterValidPropertyIds(parsed.recommendedPropertyIds, properties);
  const suggestions = Array.isArray(parsed.followUpSuggestions)
    ? parsed.followUpSuggestions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 3)
    : [];

  return {
    reply:
      typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
        ? parsed.reply.trim()
        : 'Here are the closest matching properties from our current portfolio.',
    recommendedPropertyIds: validIds,
    followUpSuggestions:
      suggestions.length > 0
        ? suggestions
        : ['Most affordable lease options', 'Show industrial plots for sale'],
    provider: 'gemini',
  };
}
