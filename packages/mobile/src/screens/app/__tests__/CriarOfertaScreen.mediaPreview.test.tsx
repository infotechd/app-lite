import React from 'react';
import renderer from 'react-test-renderer';
// Mock serviços para evitar carregar API/ESM
jest.mock('@/services/ofertaService', () => ({ ofertaService: { createOferta: jest.fn() } }));
jest.mock('@/services/uploadService', () => ({ uploadFiles: jest.fn(async () => ({ images: [], videos: [] })) }));

import CriarOfertaScreen from '@/screens/app/CriarOfertaScreen';

// Mocks de dependências que não impactam o Preview
jest.mock('@/components/CategorySubcategoryPicker', () => () => null);
jest.mock('@/components/EstadoSelect', () => () => null);
jest.mock('@/components/MediaOptionsMenu', () => () => null);
jest.mock('@/hooks/useMediaPicker', () => ({
  useMediaPicker: () => ({ pickFromGallery: jest.fn(), takePhoto: jest.fn() }),
}));
jest.mock('@/components/common/VideoPlayer', () => {
  const React = require('react');
  return ({ uri }: { uri: string }) => React.createElement('VideoMock', { testID: 'video', uri });
});

describe('CriarOfertaScreen - MediaPreview', () => {
  it('inicia com prévia vazia e exibe botão "Adicionar Mídia"', () => {
    const navigation: any = { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };

    const tree = renderer.create(
      // @ts-ignore - a tela usa apenas navigation
      <CriarOfertaScreen navigation={navigation} />
    );

    // Nenhum item de mídia no início (logo, sem botões de remover)
    const removeButtons = tree.root.findAllByType('RNPIconButton' as any);
    expect(removeButtons).toHaveLength(0);

    // Botão de adicionar mídia deve estar visível (RNPButton com children "Adicionar Mídia")
    const addButtons = tree.root.findAll(
      (node) => node.type === 'RNPButton' && node.props.children === 'Adicionar Mídia'
    );
    expect(addButtons.length).toBeGreaterThan(0);
  });
});
