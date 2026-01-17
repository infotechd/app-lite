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

/**
 * Propriedades para o componente OfferCard.
 * 
 * @interface OfferCardProps
 * @property {OfertaServico} item - O objeto da oferta de serviço contendo todos os detalhes (título, preço, prestador, etc.).
 * @property {function} [onPress] - Função opcional de callback disparada ao pressionar o card. Se não fornecida, navega para os detalhes.
 */
export interface OfferCardProps {
    item: OfertaServico;
    onPress?: (item: OfertaServico) => void;
}

/**
 * Constrói o objeto de acessibilidade (A11y) para o card de oferta.
 * 
 * Esta função centraliza a lógica de acessibilidade, garantindo que leitores de tela
 * forneçam uma descrição completa e contextual da oferta.
 * 
 * @param {OfertaServico} item - O objeto da oferta original.
 * @param {string} precoFmt - O preço já formatado com moeda e unidade.
 * @param {number} avaliacao - A nota média do prestador.
 * @param {string} cidade - Nome da cidade da oferta.
 * @param {string} estado - Sigla ou nome do estado.
 * @param {string} [distancia] - String opcional da distância formatada (ex: "1.2 km").
 * @returns {object} Objeto contendo propriedades de acessibilidade do React Native.
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
 * Componente de Card para exibição resumida de uma oferta de serviço.
 * 
 * Exibe informações principais como título, preço, imagem (thumbnail), categoria,
 * distância, avaliação do prestador e localização. Utiliza memoização para otimizar a performance.
 * 
 * @param {OfferCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export const OfferCard = React.memo(({ item, onPress }: OfferCardProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<OfertasStackParamList>>();

    // Formatação defensiva para evitar quebras em tempo de execução devido a campos inesperados ou nulos
    // Garante que 'preco' seja sempre um número válido
    const preco = typeof item?.preco === 'number' ? item.preco : Number(item?.preco ?? 0);
    
    // Nome do prestador com fallback para valor genérico
    const prestadorNome = item?.prestador?.nome ?? 'Prestador';
    
    // Avaliação numérica com tratamento de erro
    const avaliacaoNum = typeof item?.prestador?.avaliacao === 'number' ? item.prestador.avaliacao : Number(item?.prestador?.avaliacao ?? 0);
    
    // Lógica complexa de fallback para contagem de avaliações, suportando diferentes estruturas de API
    const avaliacoesCount = typeof (item as any)?.prestador?.avaliacoesCount === 'number'
        ? (item as any).prestador.avaliacoesCount
        : (typeof (item as any)?.prestador?.reviewsCount === 'number'
            ? (item as any).prestador.reviewsCount
            : (typeof (item as any)?.prestador?.qtdAvaliacoes === 'number'
                ? (item as any).prestador.qtdAvaliacoes
                : 0));
                
    // Localização com valores padrão
    const cidade = item?.localizacao?.cidade ?? 'Cidade';
    const estado = item?.localizacao?.estado ?? 'UF';

    /**
     * Manipula o clique no card.
     * Dispara o callback onPress se fornecido, caso contrário realiza o rastreamento (analytics)
     * e navega para a tela de detalhes da oferta.
     */
    const handlePress = useCallback(() => {
        if (onPress) {
            onPress(item);
            return;
        }

        // Tenta registrar o evento de clique no analytics
        try {
            const ofertaId = (item as any)?._id ?? (item as any)?.id;
            trackCardClick(ofertaId, {
                titulo: item?.titulo,
                preco: preco,
                categoria: item?.categoria,
                prestadorId: (item as any)?.prestador?.id,
            });
        } catch (err) {
            // Falha silenciosa no analytics para não interromper a navegação
        }
        
        // Navegação para a tela de detalhes
        navigation.navigate('OfferDetail', { oferta: item });
    }, [item, preco, onPress, navigation]);

    // Cálculo da distância formatada (km ou m) baseada no valor em metros
    const distanciaM = typeof item?.distancia === 'number' ? item.distancia : undefined;
    const distanciaStr = typeof distanciaM === 'number' ? (distanciaM >= 1000 ? `${(distanciaM/1000).toFixed(1)} km` : `${Math.round(distanciaM)} m`) : undefined;
    
    // Mapeamento de unidades de preço para exibição amigável
    const unidadeMap: Record<NonNullable<OfertaServico['unidadePreco']>, string> = {
        hora: '/hora',
        diaria: '/diária',
        mes: '/mês',
        aula: '/aula',
        pacote: ' (pacote)',
    } as const;
    
    // Montagem da string de preço final com unidade
    const unidadeLabel = item.unidadePreco ? unidadeMap[item.unidadePreco] : '';
    const precoFmtWithUnit = `${formatCurrencyBRL(preco)}${unidadeLabel}`;

    // Obtém a URL absoluta da primeira imagem da oferta para o thumbnail
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
                {/* Cabeçalho do Card: Título e Preço à esquerda, Thumbnail à direita */}
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

                    {/* Exibição da Imagem ou Placeholder caso não exista imagem */}
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

                {/* Linha de Chips: Exibe categoria e distância se disponíveis */}
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

                {/* Descrição resumida da oferta */}
                <Text numberOfLines={2} style={styles.description}>
                    {item.descricao}
                </Text>

                {/* Rodapé do Card: Informações do Prestador, Avaliação e Localização */}
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

/**
 * Estilos para o componente OfferCard.
 * Organizados seguindo o tema centralizado da aplicação.
 */
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
        minHeight: 44, // Altura mínima recomendada para acessibilidade (touch target)
    },
    distanceChip: {
        alignSelf: 'flex-start',
        minHeight: 44, // Altura mínima recomendada para acessibilidade (touch target)
    },
    chipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
});
