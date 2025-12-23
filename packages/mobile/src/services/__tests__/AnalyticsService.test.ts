import AnalyticsService from '../AnalyticsService';

describe('AnalyticsService', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('deve logar um aviso se eventName for uma string vazia, nula ou indefinida', () => {
    AnalyticsService.track('');
    expect(warnSpy).toHaveBeenCalledWith('[ANALYTICS] Ignorado: eventName inválido', '');

    AnalyticsService.track(null as any);
    expect(warnSpy).toHaveBeenCalledWith('[ANALYTICS] Ignorado: eventName inválido', null);

    AnalyticsService.track(undefined as any);
    expect(warnSpy).toHaveBeenCalledWith('[ANALYTICS] Ignorado: eventName inválido', undefined);
  });

  it('deve funcionar corretamente com um eventName válido', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    AnalyticsService.track('test_event');
    expect(logSpy).toHaveBeenCalledWith('[ANALYTICS] Event: test_event', '');
    logSpy.mockRestore();
  });
});
