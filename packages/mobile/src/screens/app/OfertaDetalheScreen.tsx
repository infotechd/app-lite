import React from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '@/styles/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ofertaService } from '@/services/ofertaService';
import { toAbsoluteMediaUrl, toAbsoluteMediaUrls } from '@/utils/mediaUrl';
import { Video, ResizeMode } from 'expo-av';
import { formatCurrencyBRL } from '@/utils/currency';


type Props = NativeStackScreenProps<OfertasStackParamList, 'OfferDetail'>;

const OfertaDetalheScreen: React.FC<Props> = ({ route, navigation }) => {
    const { oferta } = route.params;
    const { user } = useAuth();
    const prestadorIdRaw: any = oferta?.prestador?._id as any;
    const prestadorId = typeof prestadorIdRaw === 'object' && prestadorIdRaw?._id ? String(prestadorIdRaw._id) : String(prestadorIdRaw);
    const isOwner = !!user && String(user._id) === prestadorId;

    const preco = oferta.preco;
    const prestadorNome = oferta?.prestador?.nome ?? 'Prestador';
    const avaliacaoNum = typeof oferta?.prestador?.avaliacao === 'number' ? oferta.prestador.avaliacao : Number(oferta?.prestador?.avaliacao ?? 0);
    const cidade = oferta?.localizacao?.cidade ?? 'Cidade';
    const estado = oferta?.localizacao?.estado ?? 'UF';
    const primeiraImagemRaw = Array.isArray(oferta?.imagens) && oferta.imagens.length > 0 ? oferta.imagens[0] : undefined;
    const primeiraImagem = toAbsoluteMediaUrl(primeiraImagemRaw);
    const videoUrls = Array.isArray((oferta as any).videos) ? toAbsoluteMediaUrls((oferta as any).videos) : [];

    const handleEdit = () => {
        navigation.navigate('EditOferta', { oferta });
    };

    const handleDelete = () => {
        Alert.alert('Excluir oferta', 'Tem certeza que deseja excluir esta oferta? Esta ação não pode ser desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await ofertaService.deleteOferta(oferta._id);
                        Alert.alert('Sucesso', 'Oferta excluída com sucesso.');
                        navigation.goBack();
                    } catch (e: any) {
                        const message = e?.response?.data?.message || e?.message || 'Não foi possível excluir a oferta.';
                        Alert.alert('Erro', String(message));
                    }
                },
            },
        ]);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.card}>
                {primeiraImagem ? (
                    <Image source={{ uri: primeiraImagem }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                        <Icon name="image-off" size={48} color={colors.textSecondary} />
                    </View>
                )}
                <Card.Content>
                    <View style={styles.headerRow}>
                        <Text variant="titleLarge" style={styles.title}>{oferta.titulo}</Text>
                        <Text style={styles.price}>{formatCurrencyBRL(preco)}</Text>
                    </View>

                    <Chip mode="outlined" style={styles.categoryChip}>{oferta.categoria}</Chip>

                    <View style={styles.providerRow}>
                        <Icon name="account" size={18} color={colors.textSecondary} />
                        <Text style={styles.providerName}>{prestadorNome}</Text>
                        <Icon name="star" size={18} color={colors.warning} />
                        <Text style={styles.rating}>{avaliacaoNum.toFixed(1)}</Text>
                    </View>

                    <View style={styles.locationRow}>
                        <Icon name="map-marker" size={18} color={colors.textSecondary} />
                        <Text style={styles.location}>{cidade}, {estado}</Text>
                    </View>

                    <Text style={styles.description}>{oferta.descricao}</Text>

                    {videoUrls.length > 0 && (
                        <View style={{ marginTop: spacing.md }} accessibilityLabel="Vídeos da oferta">
                            {videoUrls.map((v, i) => (
                                <View key={`vid-${i}`} style={{ marginBottom: spacing.sm }}>
                                    <Video
                                        source={{ uri: v }}
                                        useNativeControls
                                        resizeMode={ResizeMode.CONTAIN}
                                        style={styles.video}
                                        shouldPlay={false}
                                        isLooping={false}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {isOwner && (
                        <View style={styles.ownerActions} accessibilityLabel="Ações do proprietário">
                            <Button mode="outlined" icon="pencil" onPress={handleEdit} style={styles.actionBtn}>
                                Editar
                            </Button>
                            <Button
                                mode="contained"
                                icon="delete"
                                onPress={handleDelete}
                                style={styles.actionBtn}
                                buttonColor={colors.error}
                                textColor="#FFFFFF"
                            >
                                Excluir
                            </Button>
                        </View>
                    )}
                </Card.Content>
            </Card>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    card: {
        marginBottom: spacing.md,
    },
    image: {
        width: '100%',
        height: 200,
        backgroundColor: colors.surface,
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: spacing.sm,
    },
    title: {
        flex: 1,
        marginRight: spacing.md,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },
    categoryChip: {
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
    },
    providerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    providerName: {
        marginLeft: spacing.xs,
        marginRight: spacing.sm,
        color: colors.text,
    },
    rating: {
        marginLeft: spacing.xs,
        color: colors.text,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    location: {
        marginLeft: spacing.xs,
        color: colors.textSecondary,
    },
    description: {
        marginTop: spacing.md,
        color: colors.text,
    },
    ownerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.md,
    },
    actionBtn: {
        marginLeft: spacing.xs,
    },
    video: {
        width: '100%',
        height: 220,
        backgroundColor: colors.surface,
        borderRadius: 8,
    },
});

export default OfertaDetalheScreen;
