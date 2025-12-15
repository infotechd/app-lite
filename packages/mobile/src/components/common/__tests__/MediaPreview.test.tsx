import React from 'react';
import renderer from 'react-test-renderer';
import MediaPreview from '@/components/common/MediaPreview';
import { MediaFile } from '@/types/media';

// Mock o VideoPlayer para evitar dependências do expo-video
jest.mock('@/components/common/VideoPlayer', () => {
  const React = require('react');
  return ({ uri }: { uri: string }) => React.createElement('VideoMock', { testID: 'video', uri });
});

describe('MediaPreview', () => {
  it('renderiza itens de mídia e chama onRemove com o índice correto', () => {
    const mediaFiles: MediaFile[] = [
      { uri: 'https://server/img1.jpg', type: 'image', name: 'img1.jpg' },
      { uri: 'https://server/vid1.mp4', type: 'video', name: 'vid1.mp4' },
      { uri: 'file:///local/img2.jpg', type: 'image', name: 'img2.jpg' },
    ];

    const onRemove = jest.fn();

    const tree = renderer.create(
      <MediaPreview mediaFiles={mediaFiles} onRemove={onRemove} />
    );

    // Cada item possui um IconButton no mock global
    let removeButtons = tree.root.findAllByType('RNPIconButton' as any);
    expect(removeButtons).toHaveLength(mediaFiles.length);

    // Aciona o segundo botão (índice 1)
    removeButtons[1].props.onPress?.();
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
