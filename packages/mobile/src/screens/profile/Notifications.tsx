import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const Notifications: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text variant="titleLarge">Notificações</Text>
            <Text>Suas notificações aparecerão aqui.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
});

export default Notifications;
