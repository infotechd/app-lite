/**
 * Tela de detalhes da oferta com suporte a expo-video (substituindo expo-av deprecado)
 *
 * CORREÇÕES IMPLEMENTADAS:
 * - Migrado de expo-av para expo-video (não deprecado)
 * - Adicionado carrossel unificado de mídias
 * - Melhorado controles de vídeo
 * - Suporte completo para Android e iOS
 */


import React from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Dimensions } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '@/styles/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ofertaService } from '@/services/ofertaService';
import { toAbsoluteMediaUrls } from '@/utils/mediaUrl';
import { VideoView, useVideoPlayer } from 'expo-video';
import { formatCurrencyBRL } from '@/utils/currency';

type Props = NativeStackScreenProps<OfertasStackParamList, 'OfferDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_WIDTH = SCREEN_WIDTH - (spacing.md * 2);
const MEDIA_HEIGHT = 250;

const OfertaDetalheScreen: React.FC<Props> = ({ route, navigation }) => {
    const { oferta } = route.params;
    const { user } = useAuth();

    const prestadorIdRaw: any = oferta?.prestador?._id as any;
    const prestadorId = typeof prestadorIdRaw === 'object' && prestadorIdRaw?._id
        ? String(prestadorIdRaw._id)
        : String(prestadorIdRaw);
    const userId = user?.id ?? (user as any)?._id;
    const isOwner = !!userId && String(userId) === prestadorId;

    const preco = oferta.preco;
    const unit: any = (oferta as any)?.unidadePreco;
    const unitSuffix = unit === 'hora' ? '/hora'
        : unit === 'diaria' ? '/diária'
            : unit === 'mes' ? '/mês'
                : unit === 'aula' ? '/aula'
                    : unit === 'pacote' ? ' (pacote)'
                        : '';

    const prestadorNome = oferta?.prestador?.nome ?? 'Prestador';
    const avaliacaoNum = typeof oferta?.prestador?.avaliacao === 'number'
        ? oferta.prestador.avaliacao
        : Number(oferta?.prestador?.avaliacao ?? 0);
    const cidade = oferta?.localizacao?.cidade ?? 'Cidade';
    const estado = oferta?.localizacao?.estado ?? 'UF';

    // Unificar todas as mídias (imagens e vídeos)
    const imageUrls = Array.isArray(oferta?.imagens)
        ? toAbsoluteMediaUrls(oferta.imagens)
        : [];
    const videoUrls = Array.isArray((oferta as any).videos)
        ? toAbsoluteMediaUrls((oferta as any).videos)
        : [];

    const allMedia = [
        ...imageUrls.map(url => ({ type: 'image' as const, url })),
        ...videoUrls.map(url => ({ type: 'video' as const, url })),
    ];

    const handleEdit = () => {
        navigation.navigate('EditOferta', { oferta });
    };

    const handleDelete = () => {
        Alert.alert(
            'Excluir oferta',
            'Tem certeza que deseja excluir esta oferta? Esta ação não pode ser desfeita.',
            [
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
                            const message = e?.response?.data?.message
                                || e?.message
                                || 'Não foi possível excluir a oferta.';
                            Alert.alert('Erro', String(message));
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.card}>
                {/* Carrossel de Mídias */}
                {allMedia.length > 0 ? (
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        style={styles.mediaCarousel}
                    >
                        {allMedia.map((media, index) => (
                            <View key={`media-${index}`} style={styles.mediaContainer}>
                                {media.type === 'image' ? (
                                    <Image
                                        source={{ uri: media.url }}
                                        style={styles.mediaContent}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <VideoPlayer videoUrl={media.url} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={[styles.mediaContainer, styles.mediaPlaceholder]}>
                        <Icon name="image-off" size={48} color={colors.textSecondary} />
                    </View>
                )}

                <Card.Content>
                    <View style={styles.headerRow}>
                        <Text variant="titleLarge" style={styles.title}>
                            {oferta.titulo}
                        </Text>
                        <Text style={styles.price}>
                            {`${formatCurrencyBRL(preco)}${unitSuffix}`}
                        </Text>
                    </View>

                    <Chip mode="outlined" style={styles.categoryChip}>
                        {oferta.categoria}
                    </Chip>

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

                    {isOwner && (
                        <View style={styles.ownerActions}>
                            <Button
                                mode="outlined"
                                icon="pencil"
                                onPress={handleEdit}
                                style={styles.actionBtn}
                            >
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

/**
 * Componente de player de vídeo usando expo-video
 */
const VideoPlayer: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = false;
        player.muted = false;
    });

    return (
        <VideoView
            player={player}
            style={styles.mediaContent}
            contentFit="cover"
            nativeControls
        />
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
    mediaCarousel: {
        height: MEDIA_HEIGHT,
    },
    mediaContainer: {
        width: MEDIA_WIDTH,
        height: MEDIA_HEIGHT,
        backgroundColor: colors.surface,
    },
    mediaPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContent: {
        width: '100%',
        height: '100%',
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
});

export default OfertaDetalheScreen;
