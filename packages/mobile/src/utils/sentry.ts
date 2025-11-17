/*
  Sentry wrapper util
  - Tenta usar 'sentry-expo' (Expo Managed). Se indisponível, tenta '@sentry/react-native'.
  - Se nenhum estiver instalado/DSN ausente, expõe no-ops para não quebrar testes/build locais.
*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any | null = null;
try {
  // Preferência para Expo
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('sentry-expo');
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require('@sentry/react-native');
  } catch {
    Sentry = null;
  }
}

let initialized = false;

export function initSentry(): void {
  if (!Sentry || initialized) return;

  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_DSN ||
    undefined;

  // Sem DSN, não inicializa (no-ops continuam disponíveis)
  if (!dsn) return;

  try {
    Sentry.init?.({
      dsn,
      enableInExpoDevelopment: false,
      debug: !!process.env.JEST_WORKER_ID ? false : (__DEV__ ?? false),
      tracesSampleRate: 0.2,
      beforeSend(event: any) {
        // Evita ruído de cancelamentos
        const type = event?.exception?.values?.[0]?.type;
        if (type === 'AbortError' || type === 'CanceledError') {
          return null;
        }
        return event;
      },
    });
    initialized = true;
  } catch {
    // silencioso
  }
}

type Context = {
  tags?: Record<string, string | number | boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: any;
};

// Safe telemetry helpers (no-ops quando desabilitado)
export function captureException(err: unknown, context?: Context): void {
  try {
    if (Sentry?.captureException) {
      Sentry.captureException(err, context);
      return;
    }
  } catch {
    // ignore
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>, category = 'app', level: 'info' | 'error' | 'warning' = 'info'): void {
  try {
    if (Sentry?.addBreadcrumb) {
      Sentry.addBreadcrumb({ category, message, level, data });
    }
  } catch {
    // ignore
  }
}

// Retorna um span compatível com end(), que pode ser no-op
export function startSpan(_options: { name: string; op?: string }): { end: () => void } {
  // Implementação no-op para manter compatibilidade sem dependências
  return { end: () => {} };
}

export const SentryClient = Sentry; // export para uso avançado, se necessário
