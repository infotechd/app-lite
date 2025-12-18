import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleProp, ViewStyle, useColorScheme } from 'react-native';
import { colors, radius as tokensRadius } from '@/styles/theme';

// Função pura exportada para facilitar testes unitários
export const getShimmerColor = (scheme: 'light' | 'dark' | null | undefined) =>
  scheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)';

type SkeletonBoxProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * SkeletonBox
 * - Shimmer horizontal suave (sem dependências externas).
 * - Base usa colors.border; uma "faixa" translúcida cruza para simular brilho.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ width = '100%', height = 12, radius = tokensRadius.md, style, testID }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);
  const colorScheme = useColorScheme() ?? 'light';
  const isNumeric = typeof width === 'number';
  const overlayWidth = isNumeric ? Math.min(120, Math.max(40, width * 0.3)) : 120;

  // Cor dinâmica do brilho (shimmer) de acordo com o tema do SO
  const shimmerColor = getShimmerColor(colorScheme);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-overlayWidth, containerW + overlayWidth],
  });

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -overlayWidth,
          top: 0,
          bottom: 0,
          width: overlayWidth,
          transform: [{ translateX }],
          backgroundColor: shimmerColor,
        }}
        testID="skeleton-shimmer"
      />
    </View>
  );
};

/**
 * SkeletonGroup
 * Wrapper opcional para agrupar skeletons e marcar acessibilidade.
 */
export const SkeletonGroup: React.FC<React.PropsWithChildren> = ({ children }) => (
  <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
    {children}
  </View>
);

export default SkeletonBox;
