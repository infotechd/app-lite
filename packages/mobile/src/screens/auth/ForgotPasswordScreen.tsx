import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = React.useState('');

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.title}>Recuperar senha</Text>

            <TextInput
                mode="outlined"
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
            />

            <Button mode="contained" onPress={() => navigation.navigate('Login')}>
                Enviar link de recuperação
            </Button>
            <Button onPress={() => navigation.navigate('Login')} style={styles.link}>
                Voltar ao login
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    title: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    link: {
        marginTop: 8,
    },
});

export default ForgotPasswordScreen;
