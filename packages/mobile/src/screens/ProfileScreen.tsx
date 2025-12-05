// packages/mobile/src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import ProfileHeader from '@/components/profile/ProfileHeader';
import AchievementsSummary from '@/components/profile/AchievementsSummary';
import AchievementDetailModal from '@/components/profile/AchievementDetailModal';
import ProfileTabs from '@/components/profile/ProfileTabs';
import { ACHIEVEMENTS_MOCK } from '@/mocks/achievements.mock';
import { Achievement } from '@/types/achievements';
import { spacing } from '@/styles/theme';

// Mock user data
const USER_MOCK = {
  id: '1',
  nome: 'Jane Doe',
  avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  verified: true,
};

const ProfileScreen: React.FC = () => {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const handleAchievementPress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  const handleViewAllAchievements = () => {
    // Navegar para uma tela com todas as conquistas
    console.log('Navegar para a tela de todas as conquistas');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader user={USER_MOCK} profileId={USER_MOCK.id} />
        <AchievementsSummary
          achievements={ACHIEVEMENTS_MOCK}
          onAchievementPress={handleAchievementPress}
          onViewAllPress={handleViewAllAchievements}
        />
        <View style={styles.tabsContainer}>
          <ProfileTabs />
        </View>
      </ScrollView>
      <AchievementDetailModal
        visible={isModalVisible}
        onDismiss={() => setModalVisible(false)}
        achievement={selectedAchievement}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    height: 500, // Altura fixa para o container das abas para demonstração
    paddingHorizontal: spacing.md,
  },
});

export default ProfileScreen;

