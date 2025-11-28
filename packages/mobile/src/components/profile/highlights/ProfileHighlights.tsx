import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import type { Badge, Interest } from './types';
import BadgeCarousel from './BadgeCarousel';
import InterestChips from './InterestChips';

interface ProfileHighlightsProps {
  badges?: Badge[];
  interests?: Interest[];
}

const ProfileHighlights: React.FC<ProfileHighlightsProps> = ({ badges = [], interests = [] }) => {
  const hasBadges = badges.length > 0;
  const hasInterests = interests.length > 0;
  if (!hasBadges && !hasInterests) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      {hasBadges && (
        <View>
          <Text variant="titleSmall" style={{ marginLeft: spacing.md, marginBottom: spacing.xs }}>
            Conquistas
          </Text>
          <BadgeCarousel badges={badges} />
        </View>
      )}

      {hasInterests && (
        <View>
          <Text variant="titleSmall" style={{ marginLeft: spacing.md, marginBottom: spacing.xs }}>
            Interesses
          </Text>
          <InterestChips interests={interests} />
        </View>
      )}
    </View>
  );
};

export default memo(ProfileHighlights);
