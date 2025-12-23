import { getShimmerColor } from '../SkeletonPrimitives';

describe('getShimmerColor', () => {
  it('retorna cor com maior contraste no modo claro', () => {
    expect(getShimmerColor('light')).toBe('rgba(255, 255, 255, 0.5)');
    expect(getShimmerColor(undefined)).toBe('rgba(255, 255, 255, 0.5)');
    expect(getShimmerColor(null)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('retorna cor sutil no modo escuro', () => {
    expect(getShimmerColor('dark')).toBe('rgba(255, 255, 255, 0.15)');
  });
});
