import React from 'react';
import renderer from 'react-test-renderer';
// Mock serviços para evitar carregar API/ESM
jest.mock('@/services/ofertaService', () => ({ ofertaService: { updateOferta: jest.fn() } }));
jest.mock('@/services/uploadService', () => ({ uploadFiles: jest.fn(async () => ({ images: [], videos: [] })) }));

import EditarOfertaScreen from '@/screens/app/EditarOfertaScreen';

// Mocks de dependências pesadas que não são foco dos testes
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

describe('EditarOfertaScreen - MediaPreview', () => {
  const makeRoute = (imgs: string[], vids: string[]) => ({
    key: 'EditOferta',
    name: 'EditOferta',
    params: {
      oferta: {
        _id: 'off-1',
        titulo: 'Serviço X',
        descricao: 'Desc',
        preco: 120,
        unidadePreco: 'pacote',
        categoria: 'cat1',
        localizacao: { cidade: 'São Paulo', estado: 'SP' },
        imagens: imgs,
        videos: vids,
      },
    },
  });

  it('renderiza mídias existentes (imagens e vídeos) e permite remover', () => {
    const imagens = ['https://server/img1.jpg', 'https://server/img2.jpg'];
    const videos = ['https://server/v1.mp4'];

    const route: any = makeRoute(imagens, videos);
    const navigation: any = { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };

    const tree = renderer.create(
      <EditarOfertaScreen route={route} navigation={navigation} />
    );

    // Ícones de remover existem para cada item do preview
    const total = imagens.length + videos.length;
    let removeButtons = tree.root.findAllByType('RNPIconButton' as any);
    expect(removeButtons).toHaveLength(total);

    // Remove o primeiro item e verifica que a quantidade reduz
    removeButtons[0].props.onPress?.();
    // Recoleta nós após atualização
    removeButtons = tree.root.findAllByType('RNPIconButton' as any);
    expect(removeButtons).toHaveLength(total - 1);
  });
});
