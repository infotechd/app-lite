import React, { memo, useMemo, useRef, useState } from 'react';
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { colors, radius, spacing } from '@/styles/theme';
import type { Badge } from './types';

interface BadgeCarouselProps {
  badges: Badge[];
}

const DOT_SIZE = 6;

const BadgeCarousel: React.FC<BadgeCarouselProps> = ({ badges }) => {
  const { width } = useWindowDimensions();
  const itemWidth = useMemo(() => Math.min(260, Math.max(200, width * 0.78)), [width]);
  const gap = spacing.sm + 4; // levemente maior que xs
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<Badge | null>(null);
  const [visible, setVisible] = useState(false);
  const listRef = useRef<FlatList<Badge>>(null);

  if (!badges?.length) return null;

  const keyExtractor = (b: Badge) => b.id;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = e.nativeEvent;
    const idx = Math.round(contentOffset.x / (itemWidth + gap));
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const renderItem = ({ item }: { item: Badge }) => (
    <TouchableOpacity
      style={[styles.card, { width: itemWidth }]}
      onPress={() => {
        setSelected(item);
        setVisible(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Badge ${item.title}`}
    >
      <Image source={{ uri: item.iconUrl }} style={styles.icon} />
      <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      {!!item.description && (
        <Text variant="bodyMedium" style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View>
      <FlatList
        ref={listRef}
        data={badges}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={itemWidth + gap}
        snapToAlignment="start"
        disableIntervalMomentum
        ItemSeparatorComponent={() => <View style={{ width: gap }} />}
      />

      {badges.length > 1 && (
        <View style={styles.dotsRow} accessibilityLabel="Indicadores de página do carrossel">
          {badges.map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  opacity: i === activeIndex ? 1 : 0.35,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          ))}
        </View>
      )}

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modalContainer}>
          {selected && (
            <View>
              <View style={styles.modalHeader}>
                <Image source={{ uri: selected.iconUrl }} style={styles.modalIcon} />
                <Text variant="titleLarge" style={{ color: colors.text, marginLeft: spacing.sm }}>
                  {selected.title}
                </Text>
              </View>
              {!!selected.description && (
                <Text variant="bodyMedium" style={{ color: colors.text, marginBottom: spacing.xs }}>
                  {selected.description}
                </Text>
              )}
              {!!selected.earnedAt && (
                <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7 }}>
                  Obtido em: {new Date(selected.earnedAt).toLocaleDateString()}
                </Text>
              )}
              <Button mode="contained" style={{ marginTop: spacing.md }} onPress={() => setVisible(false)}>
                Fechar
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    marginBottom: 2,
  },
  desc: {
    color: colors.text,
    opacity: 0.8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: 3,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

export default memo(BadgeCarousel);
