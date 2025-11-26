import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileHeaderSkeleton from '@/components/profile/skeletons/ProfileHeaderSkeleton';
import ProfileTabs from './ProfileTabs';
import { TrustFooter } from '@/components/profile/TrustFooter';

const ProfileHome: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false); // evita flicker

  useEffect(() => {
    // Delay para evitar piscada em carregamentos muito rápidos
    const delay = setTimeout(() => setShowSkeleton(true), 200);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowSkeleton(false);
    }, 2000);
    return () => {
      clearTimeout(timer);
      clearTimeout(delay);
    };
  }, []);

  return (
    <View style={styles.container}>
      {isLoading && showSkeleton ? (
        <ProfileHeaderSkeleton />
      ) : (
        <ProfileHeader user={user} />
      )}

      <Divider style={{ marginVertical: spacing.lg }} />

      {/* Nova Seção de Confiança */}
      <TrustFooter user={user} />

      <Divider style={{ marginVertical: spacing.lg }} />

      {/* Conteúdo em abas */}
      <View style={styles.tabsContainer}>
        <ProfileTabs isLoading={isLoading && showSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    tabsContainer: {
        flex: 1,
    },
    
});

export default ProfileHome;
