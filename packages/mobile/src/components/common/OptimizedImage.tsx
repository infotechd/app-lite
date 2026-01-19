import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';

export interface OptimizedImageProps {
  source: { uri: string };
  blurhash?: string;        // se presente, usa como placeholder
  lqipUri?: string;         // fallback LQIP (miniatura)
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageProps['contentFit'];
  cachePolicy?: ImageProps['cachePolicy'];
  transition?: number;      // ms da transição ao carregar
  onError?: ImageProps['onError'];
}

export default function OptimizedImage({
  source,
  blurhash,
  lqipUri,
  style,
  contentFit = 'cover',
  cachePolicy = 'memory-disk',
  transition = 200,
  onError,
}: OptimizedImageProps) {
  const placeholder = blurhash
    ? { blurhash }
    : lqipUri
    ? { uri: lqipUri }
    : undefined;

  return (
    <View style={style}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        placeholder={placeholder}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        transition={transition}
        onError={onError}
      />
    </View>
  );
}

