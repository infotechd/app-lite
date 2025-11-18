// Pequeno util de analytics para centralizar logs de UX
// Requisitos: imprimir no console e adicionar um breadcrumb no Sentry

import { addBreadcrumb } from '@/utils/sentry';

export type AnalyticsLevel = 'info' | 'warning' | 'error';

export type AnalyticsData = Record<string, unknown> | undefined;

export function trackEvent(
  category: string,
  action: string,
  label?: string,
  data?: AnalyticsData,
  level: AnalyticsLevel = 'info',
): void {
  try {
    // Log estruturado no console
    const payload = { category, action, label, ...((data as object) ?? {}) };
    // Mantém um prefixo identificável para facilitar debugging
    // eslint-disable-next-line no-console
    console.log('[Analytics]', payload);

    // Breadcrumb no Sentry (categoria analytics)
    const message = label ? `${category}:${action} • ${label}` : `${category}:${action}`;
    addBreadcrumb(message, data, 'analytics', level);
  } catch {
    // No-op para garantir robustez em ambientes sem console/Sentry
  }
}

// Helpers específicos (opcionais) para dar semântica e padronizar dados
export function trackCardClick(ofertaId: string | number | undefined, extra?: AnalyticsData): void {
  trackEvent('ofertas', 'card_click', ofertaId ? String(ofertaId) : undefined, extra);
}

export function trackApplyFilters(extra?: AnalyticsData): void {
  trackEvent('ofertas', 'apply_filters', undefined, extra);
}

export function trackChangeSort(from: string, to: string, extra?: AnalyticsData): void {
  trackEvent('ofertas', 'change_sort', `${from} -> ${to}`, { from, to, ...(extra ?? {}) });
}
