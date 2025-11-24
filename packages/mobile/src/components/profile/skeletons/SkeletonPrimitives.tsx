import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleProp, ViewStyle } from 'react-native';
import { colors, radius as tokensRadius } from '@/styles/theme';

type SkeletonBoxProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * SkeletonBox
 * - Shimmer horizontal suave (sem dependências externas).
 * - Base usa colors.border; uma "faixa" translúcida cruza para simular brilho.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ width = '100%', height = 12, radius = tokensRadius.md, style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);
  const overlayWidth = Math.min(120, typeof width === 'number' ? Math.max(40, width * 0.3) : 120);

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
          backgroundColor: 'rgba(255,255,255,0.18)',
        }}
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
