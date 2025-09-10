import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const Settings: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text variant="titleLarge">Configurações</Text>
            <Text>Preferências do aplicativo e conta.</Text>
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
