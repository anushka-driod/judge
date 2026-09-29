/**
 * Centralized Gemini LLM Client Service
 * Vidhi Setu AI + RAG Architecture
 *
 * Implements:
 * - Official @google/genai SDK integration
 * - Secure API key management via environment (backend only)
 * - Configurable model selection (GEMINI_MODEL, default gemini-2.5-flash / gemini-3.8-flash)
 * - Safe diagnostic logging (NEVER logs API keys or raw tokens)
 * - Timeout handling and resilient error classification
 * - Text and structured JSON generation
 */

import { GoogleGenAI } from '@google/genai';
<<<<<<< HEAD
import { networkManager } from '../../../../src/services/networkManager.js';
=======
>>>>>>> origin/main

export class GeminiClient {
  constructor() {
    this._cachedClient = null;
    this._cachedKey = null;
  }

  /**
<<<<<<< HEAD
   * Returns whether the Gemini API key is configured and online connectivity is active.
   * If offline, returns false immediately to skip remote network timeouts.
   * @returns {boolean}
   */
  isConfigured() {
    if (!networkManager.isOnline()) {
      return false;
    }
=======
   * Returns whether the Gemini API key is configured in the environment.
   * @returns {boolean}
   */
  isConfigured() {
>>>>>>> origin/main
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0 && !key.includes('your_gemini_api_key'));
  }

  /**
   * Safely reads the Gemini API key from environment without exposing it.
   * @returns {string}
   */
  getApiKey() {
    return (process.env.GEMINI_API_KEY || '').trim();
  }

  /**
   * Resolves the configured model name from environment or defaults to current stable flash model.
   * @returns {string}
   */
  getModel() {
    return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  }

  /**
   * Retrieves or initializes the GoogleGenAI instance.
   * @private
   */
  getClient() {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('your_gemini_api_key')) {
      const err = new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env');
      err.code = 'MISSING_API_KEY';
      err.status = 503;
      throw err;
    }

    if (!this._cachedClient || this._cachedKey !== apiKey) {
      this._cachedClient = new GoogleGenAI({ apiKey });
      this._cachedKey = apiKey;
    }

    return this._cachedClient;
  }

  /**
   * Generates text content using the Gemini model.
   *
   * @param {Object} options
   * @param {string} options.prompt - User or assembled prompt
   * @param {string} [options.systemInstruction] - System prompt instructions
   * @param {number} [options.temperature=0.2] - Sampling temperature
   * @param {number} [options.timeoutMs=30000] - Request timeout in ms
   * @param {string} [options.model] - Override model name
   * @returns {Promise<{ text: string, modelUsed: string, durationMs: number }>}
   */
  async generateText(options) {
    const {
      prompt,
      systemInstruction,
      temperature = 0.2,
      timeoutMs = 30000,
      model,
    } = options;

    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt cannot be empty for Gemini text generation.');
    }

    const ai = this.getClient();
    const primaryModel = model || this.getModel();
    const startTime = Date.now();

    const config = {
      temperature,
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    console.log(`[GeminiClient] Dispatching prompt to model "${primaryModel}" (approx chars: ${prompt.length})`);

    try {
      const generatePromise = ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config,
      });

      const response = await this.withTimeout(generatePromise, timeoutMs, primaryModel);
      const durationMs = Date.now() - startTime;
      const text = response.text || '';

      console.log(`[GeminiClient] Response received from "${primaryModel}" in ${durationMs}ms (chars: ${text.length})`);

      return {
        text,
        modelUsed: primaryModel,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const classifiedError = this.classifyError(err, primaryModel, durationMs);

      // Resilient fallback across active Gemini models for high demand (503), quota (429), not found (404), or timeout (504)
      const allCandidates = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash'];
      const triedModels = options._triedModels ? new Set(options._triedModels) : new Set([primaryModel]);
      triedModels.add(primaryModel);
      const remainingCandidates = allCandidates.filter((m) => !triedModels.has(m));

      const isRecoverableError =
        classifiedError.status === 429 ||
        classifiedError.status === 503 ||
        classifiedError.status === 504 ||
        classifiedError.code === 'MODEL_UNAVAILABLE' ||
        classifiedError.code === 'RATE_LIMIT' ||
        classifiedError.message.includes('high demand') ||
        classifiedError.message.includes('not found') ||
        classifiedError.message.includes('quota') ||
        classifiedError.message.includes('UNAVAILABLE');

      if (isRecoverableError && remainingCandidates.length > 0) {
        const nextModel = remainingCandidates[0];
        console.warn(`[GeminiClient] Model "${primaryModel}" encountered recoverable error (${classifiedError.code || classifiedError.message}). Retrying with resilient fallback model "${nextModel}"...`);
        return this.generateText({
          ...options,
          model: nextModel,
          _triedModels: Array.from(triedModels),
        });
      }

      console.error(`[GeminiClient] Generation failed after ${durationMs}ms: [${classifiedError.code}] ${classifiedError.message}`);
      throw classifiedError;
    }
  }

  /**
   * Generates structured JSON output using Gemini.
   *
   * @param {Object} options
   * @param {string} options.prompt - Prompt requesting JSON
   * @param {string} [options.systemInstruction] - System prompt instructions
   * @param {Object} [options.schema] - Optional JSON schema
   * @param {number} [options.temperature=0.1]
   * @param {number} [options.timeoutMs=30000]
   * @param {string} [options.model]
   * @returns {Promise<{ data: Object, text: string, modelUsed: string, durationMs: number }>}
   */
  async generateStructured(options) {
    const {
      prompt,
      systemInstruction,
      schema,
      temperature = 0.1,
      timeoutMs = 30000,
      model,
    } = options;

    const ai = this.getClient();
    const primaryModel = model || this.getModel();
    const startTime = Date.now();

    const config = {
      temperature,
      responseMimeType: 'application/json',
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (schema) {
      config.responseSchema = schema;
    }

    console.log(`[GeminiClient] Requesting structured JSON from "${primaryModel}"`);

    try {
      const generatePromise = ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config,
      });

      const response = await this.withTimeout(generatePromise, timeoutMs, primaryModel);
      const durationMs = Date.now() - startTime;
      const rawText = response.text || '';

      const parsed = this.parseJsonSafe(rawText);
      console.log(`[GeminiClient] Structured JSON parsed successfully in ${durationMs}ms`);

      return {
        data: parsed,
        text: rawText,
        modelUsed: primaryModel,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const classifiedError = this.classifyError(err, primaryModel, durationMs);

      // Resilient fallback across active Gemini models for high demand (503), quota (429), not found (404), or timeout (504)
      const allCandidates = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash'];
      const triedModels = options._triedModels ? new Set(options._triedModels) : new Set([primaryModel]);
      triedModels.add(primaryModel);
      const remainingCandidates = allCandidates.filter((m) => !triedModels.has(m));

      const isRecoverableError =
        classifiedError.status === 429 ||
        classifiedError.status === 503 ||
        classifiedError.status === 504 ||
        classifiedError.code === 'MODEL_UNAVAILABLE' ||
        classifiedError.code === 'RATE_LIMIT' ||
        classifiedError.message.includes('high demand') ||
        classifiedError.message.includes('not found') ||
        classifiedError.message.includes('quota') ||
        classifiedError.message.includes('UNAVAILABLE');

      if (isRecoverableError && remainingCandidates.length > 0) {
        const nextModel = remainingCandidates[0];
        console.warn(`[GeminiClient] Structured generation on "${primaryModel}" encountered recoverable error (${classifiedError.code || classifiedError.message}). Retrying with resilient fallback model "${nextModel}"...`);
        return this.generateStructured({
          ...options,
          model: nextModel,
          _triedModels: Array.from(triedModels),
        });
      }

      console.error(`[GeminiClient] Structured generation failed: [${classifiedError.code}] ${classifiedError.message}`);
      throw classifiedError;
    }
  }

  /**
   * Helper to wrap promise with a timeout
   * @private
   */
  async withTimeout(promise, timeoutMs, modelName) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`Gemini API call to "${modelName}" timed out after ${timeoutMs}ms.`);
        err.code = 'TIMEOUT';
        err.status = 504;
        reject(err);
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Strips markdown fences and parses JSON safely
   * @private
   */
  parseJsonSafe(rawText) {
    let clean = (rawText || '').trim();

    // Remove markdown code fences if present: ```json ... ```
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
      return JSON.parse(clean);
    } catch (parseErr) {
      // Try to find the first { ... } or [ ... ] substring
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
        } catch (_) {}
      }

      const err = new Error(`Failed to parse structured JSON from LLM: ${parseErr.message}`);
      err.code = 'JSON_PARSE_ERROR';
      err.rawOutput = rawText?.slice(0, 300);
      throw err;
    }
  }

  /**
   * Classifies error details without leaking sensitive keys
   * @private
   */
  classifyError(err, modelName, durationMs) {
    if (err.code === 'TIMEOUT') return err;
    if (err.code === 'JSON_PARSE_ERROR') return err;
    if (err.code === 'MISSING_API_KEY') return err;

    const message = err.message || '';
    const errorObj = new Error();
    errorObj.originalError = err;
    errorObj.model = modelName;
    errorObj.durationMs = durationMs;

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid') || err.status === 400 && message.includes('API key')) {
      errorObj.message = 'The configured Gemini API key is invalid. Please verify GEMINI_API_KEY in backend/.env.';
      errorObj.code = 'INVALID_API_KEY';
      errorObj.status = 401;
    } else if (err.status === 403 || message.includes('PERMISSION_DENIED')) {
      errorObj.message = 'Gemini API permission denied. Ensure your API key has Generative Language API enabled.';
      errorObj.code = 'PERMISSION_DENIED';
      errorObj.status = 403;
    } else if (err.status === 404 || message.includes('not found') || message.includes('is not supported')) {
      errorObj.message = `Gemini model "${modelName}" is not available or not supported on this API tier.`;
      errorObj.code = 'MODEL_UNAVAILABLE';
      errorObj.status = 404;
    } else if (err.status === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
      errorObj.message = 'Gemini API quota or rate limit exceeded. Please try again shortly.';
      errorObj.code = 'RATE_LIMIT';
      errorObj.status = 429;
<<<<<<< HEAD
    } else if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
      errorObj.message = 'Unable to connect to Google Gemini API servers. Operating in offline legal guidance mode.';
      errorObj.code = 'NETWORK_ERROR';
      errorObj.status = 502;
      networkManager.recordNetworkFailure(err);
=======
    } else if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      errorObj.message = 'Unable to connect to Google Gemini API servers. Please check your network connection.';
      errorObj.code = 'NETWORK_ERROR';
      errorObj.status = 502;
>>>>>>> origin/main
    } else {
      errorObj.message = `Gemini API generation error: ${message}`;
      errorObj.code = 'LLM_GENERATE_FAILED';
      errorObj.status = err.status || 500;
    }

    return errorObj;
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
