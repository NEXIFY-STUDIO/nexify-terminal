import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { pathToFileURL } from 'node:url';

const DEFAULT_PROVIDER = 'github-models';
const DEFAULT_GITHUB_MODEL = 'openai/gpt-4.1-mini';
const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_GAMMA_MODEL = 'gamma-4b4';
const DEFAULT_SYSTEM_PROMPT = [
  'You are the NEXIFY TECH CENTER assistant.',
  'You MUST always communicate and answer EXCLUSIVELY in the Slovak language (slovenský jazyk).',
  'You MUST listen to EVERY SINGLE WORD the user says and NEVER skip, ignore, or misinterpret anything.',
  'You MUST NEVER generate nonsense, hallucinate, or make up information.',
  'If you are unsure, ASK for clarification instead of guessing.',
  'Answer as a concise, precise senior engineer with implementation-ready solutions.',
  'Be direct, clear, and never add unnecessary words or fluff.',
  'Every response must be useful, accurate, and follow the user instructions EXACTLY.',
].join(' ');

function normalizeProvider(provider = '') {
  const normalized = String(provider).trim().toLowerCase();
  if (normalized === 'github' || normalized === 'github-models') return 'github-models';
  if (normalized === 'mistral' || normalized === 'mistral-api') return 'mistral';
  if (normalized === 'gemini' || normalized === 'google' || normalized === 'google-gemini') return 'gemini';
  if (normalized === 'gamma' || normalized === 'gamma-4b4' || normalized === 'gamma4b4') return 'gamma';
  return DEFAULT_PROVIDER;
}

export function getAiProxyConfig(env = process.env) {
  return {
    host: env.AI_PROXY_HOST || '127.0.0.1',
    port: Number(env.AI_PROXY_PORT || 8787),
    provider: normalizeProvider(env.AI_PROVIDER),
    allowedOrigin: env.AI_ALLOWED_ORIGIN || 'http://127.0.0.1:5173',
    systemPrompt: env.AI_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    temperature: Number(env.AI_TEMPERATURE || 0.3),
    maxTokens: Number(env.AI_MAX_TOKENS || 400),
    githubToken: env.GITHUB_MODELS_TOKEN || '',
    githubModel: env.GITHUB_MODELS_MODEL || DEFAULT_GITHUB_MODEL,
    githubOrg: env.GITHUB_MODELS_ORG || '',
    mistralApiKey: env.MISTRAL_API_KEY || env.MISTRAL_API_KEY_1 || '',
    mistralApiKey1: env.MISTRAL_API_KEY_1 || env.MISTRAL_API_KEY || '',
    mistralApiKey2: env.MISTRAL_API_KEY_2 || '',
    mistralModel: env.MISTRAL_MODEL || DEFAULT_MISTRAL_MODEL,
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    gammaApiKey: env.GAMMA_API_KEY || '',
    gammaModel: env.GAMMA_MODEL || DEFAULT_GAMMA_MODEL,
    gammaEndpoint: env.GAMMA_ENDPOINT || 'https://api.gamma.ai/v1/chat/completions',
  };
}

function resolveProviderOverride(config, requested) {
  if (!requested) return config;
  const normalized = normalizeProvider(requested);
  if (normalized === config.provider) return config;
  return { ...config, provider: normalized };
}

function getActiveModel(config) {
  if (config.provider === 'mistral') return config.mistralModel;
  if (config.provider === 'gemini') return config.geminiModel;
  if (config.provider === 'gamma') return config.gammaModel;
  return config.githubModel;
}

function parseResponseContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text') return item.text || '';
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function extractGeminiAnswer(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('').trim();
  return text || null;
}

function extractAnswer(payload, provider) {
  if (provider === 'gemini') return extractGeminiAnswer(payload);
  if (provider === 'gamma') return parseResponseContent(payload?.choices?.[0]?.message?.content);
  const answer = parseResponseContent(payload?.choices?.[0]?.message?.content);
  return answer || null;
}

export function buildProviderRequest(question, config, apiKeyOverride) {
  const messages = [
    { role: 'system', content: config.systemPrompt },
    { role: 'user', content: question },
  ];

  if (config.provider === 'gemini') {
    if (!config.geminiApiKey) {
      throw new Error('Missing GEMINI_API_KEY for provider=gemini');
    }
    const model = config.geminiModel || DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    return {
      url,
      model,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: config.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
          },
        }),
      },
    };
  }

  if (config.provider === 'mistral') {
    const apiKey = apiKeyOverride || config.mistralApiKey || config.mistralApiKey1;
    if (!apiKey) {
      throw new Error('Missing MISTRAL_API_KEY for provider=mistral');
    }

    return {
      url: 'https://api.mistral.ai/v1/chat/completions',
      model: config.mistralModel,
      options: {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.mistralModel,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
      },
    };
  }

  if (config.provider === 'gamma') {
    if (!config.gammaApiKey) {
      throw new Error('Missing GAMMA_API_KEY for provider=gamma');
    }
    return {
      url: config.gammaEndpoint,
      model: config.gammaModel,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.gammaApiKey}`,
        },
        body: JSON.stringify({
          model: config.gammaModel,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
      },
    };
  }

  if (!config.githubToken) {
    throw new Error('Missing GITHUB_MODELS_TOKEN for provider=github-models');
  }

  const githubUrl = config.githubOrg
    ? `https://models.github.ai/orgs/${config.githubOrg}/inference/chat/completions`
    : 'https://models.github.ai/inference/chat/completions';

  return {
    url: githubUrl,
    model: config.githubModel,
    options: {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.githubToken}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        model: config.githubModel,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    },
  };
}

async function readProviderError(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.error || payload?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export function createAiProxyApp({
  config = getAiProxyConfig(),
  fetchImpl = fetch,
} = {}) {
  const app = express();
  const corsOrigin = config.allowedOrigin === '*' ? true : config.allowedOrigin;

  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_req, res) => {
    let model;
    if (config.provider === 'mistral') model = config.mistralModel;
    else if (config.provider === 'gemini') model = config.geminiModel;
    else if (config.provider === 'gamma') model = config.gammaModel;
    else model = config.githubModel;
    res.json({ status: 'ok', provider: config.provider, model });
  });

  app.post('/api/ai', async (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const requestedProvider = req.body?.provider;
    const requestedModel = req.body?.model;
    const activeConfig = {
      ...config,
      ...(requestedProvider ? { provider: normalizeProvider(requestedProvider) } : {}),
      ...(requestedModel ? {
        githubModel: requestedModel,
        mistralModel: requestedModel,
        geminiModel: requestedModel
      } : {})
    };

    let providerRequest;
    let mistralKeyUsed = activeConfig.mistralApiKey1 || activeConfig.mistralApiKey;
    try {
      providerRequest = buildProviderRequest(question, activeConfig, mistralKeyUsed);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    let upstream;
    let fetchError;
    try {
      upstream = await fetchImpl(providerRequest.url, providerRequest.options);
    } catch (err) {
      fetchError = err;
    }

    // Determine if we should attempt fallback key (either fetch failed or returned quota/auth error)
    const primaryFailed = fetchError || (upstream && (upstream.status === 429 || upstream.status === 401 || upstream.status === 403 || upstream.status === 502));

    if (activeConfig.provider === 'mistral' && primaryFailed && activeConfig.mistralApiKey2) {
      console.warn('[ai-proxy] Mistral Primary Key failed or quota exceeded. Trying backup Key...');
      mistralKeyUsed = activeConfig.mistralApiKey2;
      try {
        const fallbackRequest = buildProviderRequest(question, activeConfig, mistralKeyUsed);
        upstream = await fetchImpl(fallbackRequest.url, fallbackRequest.options);
        fetchError = null; // Clear primary error if fallback fetch completed
      } catch (retryError) {
        console.error('[ai-proxy] Failed to fetch using backup Mistral key:', retryError.message);
        fetchError = retryError; // Set error to fallback error
      }
    }

    if (fetchError) {
      return res.status(502).json({
        error: `Failed to reach ${activeConfig.provider}: ${fetchError.message}`,
      });
    }

    try {
      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('Retry-After');
        if (retryAfter) res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({ error: `Provider rate limit hit for ${activeConfig.provider}.` });
      }

      if (!upstream.ok) {
        const errorMessage = await readProviderError(upstream);
        return res.status(502).json({
          error: `Upstream ${activeConfig.provider} error (${upstream.status}): ${errorMessage}`,
        });
      }

      const payload = await upstream.json();
      const answer = extractAnswer(payload, activeConfig.provider);
      if (!answer) {
        return res.status(502).json({ error: `Invalid ${activeConfig.provider} response.` });
      }

      return res.json({
        answer,
        provider: activeConfig.provider,
        model: providerRequest.model,
      });
    } catch (error) {
      return res.status(502).json({
        error: `Failed to process ${activeConfig.provider} response: ${error.message}`,
      });
    }
  });

  return app;
}

export function startAiProxy(options = {}) {
  const config = options.config || getAiProxyConfig();
  const app = createAiProxyApp({ ...options, config });
  return app.listen(config.port, config.host, () => {
    console.log(`[nexify-ai-proxy] Listening on http://${config.host}:${config.port}`);
    console.log(`[nexify-ai-proxy] Provider: ${config.provider}`);
  });
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startAiProxy();
}
