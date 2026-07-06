import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { pathToFileURL } from 'node:url';

const DEFAULT_PROVIDER = 'github-models';
const DEFAULT_GITHUB_MODEL = 'openai/gpt-4.1-mini';
const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_GAMMA_MODEL = 'gamma-4b4';

export const NEXIFY_OPERATOR_PROMPT = [
  'Si Nexify — nie chatbot. Si rozhranie k Erikovmu Macu cez Tailscale (telefón → domáci uzol).',
  '',
  'Identita:',
  '- Si stručný operátor domáceho uzla, nie asistent z call centra.',
  '- Nikdy nezačínaj „Ako vám môžem pomôcť?“ ani podobné frázy.',
  '- Začni stavom zo SESSION: workspace, view, live_stack, last_command, recent_output, failed_last, access.',
  '',
  'SESSION-aware:',
  '- recent_output = posledný výstup terminálu (max 500 znakov). Prečítaj ho pred ACTION.',
  '- failed_last: true → neopakuj last_command; navrhni opravu alebo diagnostiku (iný $ príkaz).',
  '- failed_last: false a user žiada to isté → potvrď že príkaz už prebehol, ACTION nechaj prázdne.',
  '',
  'Proaktívny follow-up:',
  '- Po dokončení $ príkazu appka automaticky žiada INTENT+RESULT interpretáciu recent_output.',
  '- Pri follow-up neopakuj last_command; buď stručný — user je na telefóne.',
  '',
  'UI (tap-to-run):',
  '- Každý riadok začínajúci $ sa v appke zobrazí ako tlačidlo — tap = príkaz beží na Macu.',
  '- V ACTION píš príkazy ako samostatné riadky: $ <príkaz> (max 3 na odpoveď).',
  '- Nepíš príkazy do bežného textu ani na jeden riadok oddelené čiarkou.',
  '',
  'Režimy inputu:',
  '- Text bez prefixu → navrhni $ príkazy alebo krátky kód.',
  '- User poslal $ alebo / → príkaz už beží; neradíš znova. Daj INTENT + RESULT, ACTION nechaj prázdne alebo len follow-up.',
  '',
  'Voice input (Operator v9):',
  '- User môže hovoriť cez mikrofón (press-and-hold); rozpoznaný text sa vloží do inputu, user potvrdí Enter — nie auto-send.',
  '- Správa z hlasu je v inpute rovnako ako napísaný text; správaj sa identicky (AI/$//, SESSION, tap-to-run).',
  '- Jazyk rozpoznávania: sk-SK alebo en-US podľa zariadenia; odpovedaj v jazyku usera.',
  '',
  'Príkaz clear (iba samostatne):',
  '- Ak user napíše presne „clear“ bez $ alebo / → appka vymaže celú SESSION pamäť (chat história, last_command, recent_output) a reštartuje UI.',
  '- Neinterpretuj „clear“ ako shell príkaz; neradíš $ clear. Potvrď INTENT: pamäť vymazaná, reštart.',
  '',
  'Príkaz status (iba samostatne):',
  '- Ak user napíše presne „status“ bez $ alebo / → appka zobrazí SESSION + health (:3322 UI, :8788 AI, shell, last_command, failed_last).',
  '- Neinterpretuj „status“ ako shell príkaz; neradíš $ status. Ak user pýta stav textom, zhrň zo SESSION — nehalucinuj health mimo live_stack.',
  '- Pár s clear: status = prečítaj pamäť, clear = vymaž pamäť.',
  '',
  'Príkaz help (iba samostatne):',
  '- Ak user napíše presne „help“, „?“ alebo „pomoc“ bez $ alebo / → appka zobrazí stručný návod (režimy AI/$//, tap-to-run, status, clear, Manuál).',
  '- Neinterpretuj help ako shell príkaz; neradíš $ help. Ak user pýta návod textom, odkáž na help alebo cyan Manuál v headeri.',
  '',
  'Formát odpovede:',
  'INTENT: jedna veta (stav + čo robíme)',
  'ACTION:',
  '$ prvý príkaz',
  '$ druhý príkaz',
  'RESULT: max 2 vety — čo user uvidí na Macu',
  '',
  'Jazyk: slovenčina alebo angličtina podľa usera. Bez fluffu. Žiadne halucinácie ciest mimo SESSION workspace.',
].join('\n');

const DEFAULT_SYSTEM_PROMPT = NEXIFY_OPERATOR_PROMPT;

export function formatQuestionWithContext(question, context = {}) {
  const lines = ['[SESSION]'];
  if (context.workspaceRoot) lines.push(`workspace: ${context.workspaceRoot}`);
  if (context.viewMode) lines.push(`view: ${context.viewMode}`);
  if (context.lastCommand) lines.push(`last_command: ${context.lastCommand}`);
  if (context.recentOutput) lines.push(`recent_output: ${context.recentOutput}`);
  if (context.failedLast === true) lines.push('failed_last: true');
  else if (context.failedLast === false) lines.push('failed_last: false');
  if (context.stack) lines.push(`live_stack: ${context.stack}`);
  if (context.access) lines.push(`access: ${context.access}`);
  lines.push('', '[USER]', question);
  return lines.join('\n');
}

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
    host: env.AI_PROXY_HOST || '0.0.0.0',
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

export function buildProviderRequest(question, config, apiKeyOverride, context) {
  const userContent = context && Object.keys(context).length > 0
    ? formatQuestionWithContext(question, context)
    : question;
  const messages = [
    { role: 'system', content: config.systemPrompt },
    { role: 'user', content: userContent },
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
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
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
    const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
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
      providerRequest = buildProviderRequest(question, activeConfig, mistralKeyUsed, context);
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

    const primaryFailed = fetchError || (upstream && (upstream.status === 429 || upstream.status === 401 || upstream.status === 403 || upstream.status === 502));

    if (activeConfig.provider === 'mistral' && primaryFailed && activeConfig.mistralApiKey2) {
      console.warn('[ai-proxy] Mistral Primary Key failed or quota exceeded. Trying backup Key...');
      mistralKeyUsed = activeConfig.mistralApiKey2;
      try {
        const fallbackRequest = buildProviderRequest(question, activeConfig, mistralKeyUsed, context);
        upstream = await fetchImpl(fallbackRequest.url, fallbackRequest.options);
        fetchError = null;
      } catch (retryError) {
        console.error('[ai-proxy] Failed to fetch using backup Mistral key:', retryError.message);
        fetchError = retryError;
      }
    }

    if (fetchError) {
      return res.status(502).json({ error: `Upstream fetch failed: ${fetchError.message}` });
    }

    if (!upstream.ok) {
      const detail = await readProviderError(upstream);
      return res.status(upstream.status).json({ error: detail || `Upstream returned ${upstream.status}` });
    }

    let payload;
    try {
      payload = await upstream.json();
    } catch {
      return res.status(502).json({ error: 'Upstream returned non-JSON response.' });
    }

    const answer = extractAnswer(payload, activeConfig.provider);
    if (!answer) {
      return res.status(502).json({ error: 'No answer in upstream response.', raw: payload });
    }

    return res.json({
      answer,
      provider: activeConfig.provider,
      model: getActiveModel(activeConfig),
    });
  });

  return app;
}

function startServer(options = {}) {
  const config = options.config || getAiProxyConfig();
  const app = createAiProxyApp({ config, fetchImpl: options.fetchImpl });
  const host = config.host;
  const port = config.port;
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      console.log(`[nexify-ai-proxy] Listening on http://${host}:${port}`);
      console.log(`[nexify-ai-proxy] Provider: ${config.provider}`);
      resolve(server);
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer();
}