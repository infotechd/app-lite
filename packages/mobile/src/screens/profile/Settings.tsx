import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const Settings: React.FC = () => {
    const { isAuthenticated, logout } = useAuth();
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <Text variant="titleLarge">Configurações</Text>
            <Text>Preferências do aplicativo e conta.</Text>

            {isAuthenticated && (
                <>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('ChangePassword' as never)}
                        style={{ marginTop: 16 }}
                        icon="lock-reset"
                    >
                        Alterar senha
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={logout}
                        style={{ marginTop: 16 }}
                        icon="logout-variant"
                    >
                        Sair
                    </Button>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
});

export default Settings;
