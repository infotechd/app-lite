// packages/mobile/src/services/AnalyticsService.ts

export type AnalyticsProperties = Record<string, any>;

export type AnalyticsProvider = {
  track: (eventName: string, properties?: AnalyticsProperties) => void;
};

class ConsoleProvider implements AnalyticsProvider {
  track(eventName: string, properties?: AnalyticsProperties) {
    const props = properties && Object.keys(properties).length ? properties : '';
    // eslint-disable-next-line no-console
    console.log(`[ANALYTICS] Event: ${eventName}`, props);
  }
}

class AnalyticsService {
  private static provider: AnalyticsProvider = new ConsoleProvider();

  static setProvider(provider: AnalyticsProvider) {
    this.provider = provider;
  }

  static track(eventName: string, properties?: AnalyticsProperties) {
    if (!eventName) {
      // eslint-disable-next-line no-console
      console.warn('[ANALYTICS] Ignorado: eventName inválido', eventName);
      return;
    }
    try {
      this.provider.track(eventName, properties);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ANALYTICS] Falha ao enviar evento', eventName, e);
    }
  }
}

export default AnalyticsService;
