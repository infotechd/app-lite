import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs from './ProfileTabs';
import { TrustFooter } from '@/components/profile/TrustFooter';

const ProfileHome: React.FC = () => {
    const { user } = useAuth();

    return (
        <ScrollView style={styles.container}>
            <ProfileHeader user={user} />

            <Divider style={{ marginVertical: spacing.lg }} />

            {/* Nova Seção de Confiança */}
            <TrustFooter user={user} />

            <Divider style={{ marginVertical: spacing.lg }} />

            {/* Conteúdo em abas */}
            <ProfileTabs />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    
});

export default ProfileHome;
