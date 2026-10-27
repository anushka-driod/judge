/**
 * VidhiSetu CORS Configuration
 * Handles cross-origin requests for production domains, local development, and preflight OPTIONS.
 */

// Production frontend origins that MUST always be permitted
export const DEFAULT_PRODUCTION_ORIGINS = [
  'https://vidhi-setu.in',
  'https://www.vidhi-setu.in',
];

// Local development origins permitted in non-production environments
export const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
];

/**
 * Normalizes an origin string by trimming whitespace and trailing slashes.
 */
export function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return '';
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Parses comma-, semicolon-, or whitespace-delimited origin lists from environment variables.
 */
export function parseOrigins(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeOrigin).filter(Boolean);
  return value
    .split(/[,;\s]+/)
    .map(normalizeOrigin)
    .filter(Boolean);
}

/**
 * Builds the complete list of allowed origins based on environment.
 */
export function getAllowedOrigins(env = process.env) {
  const configured = [
    ...parseOrigins(env.FRONTEND_URL),
    ...parseOrigins(env.ALLOWED_ORIGINS),
    ...parseOrigins(env.CORS_ALLOWED_ORIGINS),
    ...parseOrigins(env.BACKEND_URL),
    ...parseOrigins(env.API_URL),
  ];

  // Primary production frontend domains are always allowed
  const origins = new Set([
    ...DEFAULT_PRODUCTION_ORIGINS.map(normalizeOrigin),
    ...configured,
  ]);

  const isProd = env.NODE_ENV === 'production';
  if (!isProd) {
    DEFAULT_DEV_ORIGINS.forEach((o) => origins.add(normalizeOrigin(o)));
  }

  return Array.from(origins);
}

/**
 * Validates whether an origin is an allowed development tunnel or cloud preview provider.
 */
export const isAllowedTunnelOrCloud = (origin) => {
  if (!origin) return true;
  return /^(https?:\/\/)?([a-zA-Z0-9-]+\.)*(trycloudflare\.com|loca\.lt|ngrok-free\.app|ngrok\.io|vercel\.app|onrender\.com|railway\.app)(:\d+)?$/i.test(origin);
};

/**
 * Decides whether a given request origin is permitted.
 */
export function isOriginAllowed(origin, env = process.env) {
  // Allow non-browser requests (mobile apps, curl, server-to-server)
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  const isProd = env.NODE_ENV === 'production';

  // 1. Check against the explicit allowed origins list (case-insensitive)
  const allowedList = getAllowedOrigins(env);
  const normalizedLower = normalized.toLowerCase();
  if (allowedList.some((allowed) => allowed.toLowerCase() === normalizedLower)) {
    return true;
  }

  // 2. Allow-all override (only if explicitly enabled)
  if (env.ALLOW_ALL_CORS === 'true') {
    return true;
  }

  // 3. In non-production environments, allow localhost on any port and dev tunnels
  if (!isProd) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
      return true;
    }
    if (isAllowedTunnelOrCloud(normalized)) {
      return true;
    }
  } else {
    // 4. In production, also allow verified cloud hosting domains (e.g. onrender / vercel preview deployments)
    if (isAllowedTunnelOrCloud(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Full CORS middleware configuration for Express.
 */
export function createCorsOptions(envGetter = () => process.env) {
  return {
    origin: (origin, callback) => {
      const currentEnv = typeof envGetter === 'function' ? envGetter() : envGetter;
      if (isOriginAllowed(origin, currentEnv)) {
        return callback(null, true);
      }
      const corsError = new Error(`Origin ${origin} not allowed by CORS policy`);
      corsError.status = 403;
      corsError.code = 'CORS_NOT_ALLOWED';
      return callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours preflight cache
  };
}
