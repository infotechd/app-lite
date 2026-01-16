import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { OfertaServico } from '@/types/oferta';
import { OfertasStackParamList } from '@/types';
import { formatCurrencyBRL } from '@/utils/currency';
import { trackCardClick } from '@/utils/analytics';
import { toAbsoluteMediaUrl } from '@/utils/mediaUrl';
import { colors, spacing, elevation, radius } from '@/styles/theme';

export interface OfferCardProps {
    item: OfertaServico;
    onPress?: (item: OfertaServico) => void;
}

/**
 * Constrói o objeto de acessibilidade para o card de oferta.
 */
export const buildOfferCardA11y = (
    item: OfertaServico,
    precoFmt: string,
    avaliacao: number,
    cidade: string,
    estado: string,
    distancia?: string,
) => ({
    accessibilityRole: 'button' as const,
    accessibilityLabel: `Oferta: ${item.titulo}. Preço ${precoFmt}. Prestador ${item?.prestador?.nome ?? 'Prestador'}. Avaliação ${avaliacao.toFixed(1)}. Localização ${cidade}, ${estado}${distancia ? ' • ' + distancia : ''}.`,
    accessibilityHint: 'Abre os detalhes da oferta',
});

/**
 * Componente de Card para exibição de uma oferta de serviço.
 */
export const OfferCard = React.memo(({ item, onPress }: OfferCardProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<OfertasStackParamList>>();

    // Defensive formatting to avoid runtime crashes from unexpected/null fields
    const preco = typeof item?.preco === 'number' ? item.preco : Number(item?.preco ?? 0);
    const prestadorNome = item?.prestador?.nome ?? 'Prestador';
    const avaliacaoNum = typeof item?.prestador?.avaliacao === 'number' ? item.prestador.avaliacao : Number(item?.prestador?.avaliacao ?? 0);
    const avaliacoesCount = typeof (item as any)?.prestador?.avaliacoesCount === 'number'
        ? (item as any).prestador.avaliacoesCount
        : (typeof (item as any)?.prestador?.reviewsCount === 'number'
            ? (item as any).prestador.reviewsCount
            : (typeof (item as any)?.prestador?.qtdAvaliacoes === 'number'
                ? (item as any).prestador.qtdAvaliacoes
                : 0));
    const cidade = item?.localizacao?.cidade ?? 'Cidade';
    const estado = item?.localizacao?.estado ?? 'UF';

    const handlePress = useCallback(() => {
        if (onPress) {
            onPress(item);
            return;
        }

        // Analytics de clique no card
        try {
            const ofertaId = (item as any)?._id ?? (item as any)?.id;
            trackCardClick(ofertaId, {
                titulo: item?.titulo,
                preco: preco,
                categoria: item?.categoria,
                prestadorId: (item as any)?.prestador?.id,
            });
        } catch {}
        navigation.navigate('OfferDetail', { oferta: item });
    }, [item, preco, onPress, navigation]);

    // Distância formatada (quando disponível)
    const distanciaM = typeof item?.distancia === 'number' ? item.distancia : undefined;
    const distanciaStr = typeof distanciaM === 'number' ? (distanciaM >= 1000 ? `${(distanciaM/1000).toFixed(1)} km` : `${Math.round(distanciaM)} m`) : undefined;
    
    const unidadeMap: Record<NonNullable<OfertaServico['unidadePreco']>, string> = {
        hora: '/hora',
        diaria: '/diária',
        mes: '/mês',
        aula: '/aula',
        pacote: ' (pacote)',
    } as const;
    const unidadeLabel = item.unidadePreco ? unidadeMap[item.unidadePreco] : '';
    const precoFmtWithUnit = `${formatCurrencyBRL(preco)}${unidadeLabel}`;

    const thumbnailUrl = useMemo(() => {
        const primeiraImagem = item.imagens?.[0];
        return toAbsoluteMediaUrl(primeiraImagem);
    }, [item.imagens]);

    return (
        <Card
            style={styles.card}
            onPress={handlePress}
            {...buildOfferCardA11y(item, precoFmtWithUnit, avaliacaoNum, cidade, estado, distanciaStr)}
        >
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderContent}>
                        <Text
                            variant="titleMedium"
                            numberOfLines={2}
                            ellipsizeMode="tail"
                            style={styles.cardTitle}
                        >
                            {item.titulo}
                        </Text>
                        <Text style={styles.price} numberOfLines={1} accessibilityLabel={`Preço ${precoFmtWithUnit}`}>
                            {precoFmtWithUnit}
                        </Text>
                    </View>

                    {thumbnailUrl ? (
                        <Image
                            source={{ uri: thumbnailUrl }}
                            style={styles.thumbnail}
                            contentFit="cover"
                            transition={300}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Icon name="image-off" size={24} color={colors.textSecondary} />
                        </View>
                    )}
                </View>

                {/* Chips: categoria e distância logo abaixo do título/preço */}
                <View style={styles.chipsRow}>
                    {item.categoria ? (
                        <Chip mode="outlined" style={styles.categoryChip}>
                            {item.categoria}
                        </Chip>
                    ) : null}
                    {distanciaStr ? (
                        <Chip mode="outlined" style={styles.distanceChip} icon="map-marker-distance">
                            {distanciaStr}
                        </Chip>
                    ) : null}
                </View>

                <Text numberOfLines={2} style={styles.description}>
                    {item.descricao}
                </Text>

                {/* Rodapé em linha única: prestador • rating (com contagem) • localização */}
                <View style={styles.cardFooter}>
                    <Icon name="account" size={16} color={colors.textSecondary} />
                    <Text style={styles.footerText}>{prestadorNome}</Text>
                    <RNText style={styles.separator}> • </RNText>
                    <Icon name="star" size={16} color={colors.warning} />
                    <Text style={styles.footerText}>
                        {avaliacaoNum.toFixed(1)}{avaliacoesCount > 0 ? ` (${avaliacoesCount})` : ''}
                    </Text>
                    <RNText style={styles.separator}> • </RNText>
                    <Icon name="map-marker" size={16} color={colors.textSecondary} />
                    <Text style={[styles.footerText, styles.location]}>
                        {cidade}, {estado}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );
});

const styles = StyleSheet.create({
    card: {
        marginBottom: spacing.md,
        elevation: elevation.level1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    cardHeaderContent: {
        flex: 1,
    },
    cardTitle: {
        marginBottom: 2,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: radius.md,
        marginLeft: spacing.sm,
    },
    imagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: radius.md,
        backgroundColor: colors.backdrop,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    description: {
        marginBottom: spacing.sm,
        color: colors.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        marginTop: spacing.xs,
    },
    footerText: {
        marginLeft: spacing.xs,
        color: colors.text,
        fontSize: 12,
        flexShrink: 1,
    },
    separator: {
        color: colors.textSecondary,
        marginHorizontal: spacing.xs,
        fontSize: 12,
    },
    location: {
        marginLeft: spacing.xs,
        color: colors.textSecondary,
        fontSize: 12,
    },
    categoryChip: {
        alignSelf: 'flex-start',
        marginRight: spacing.xs,
        minHeight: 44,
    },
    distanceChip: {
        alignSelf: 'flex-start',
        minHeight: 44,
    },
    chipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
});
