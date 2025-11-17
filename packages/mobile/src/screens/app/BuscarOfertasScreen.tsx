import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Text as RNText } from 'react-native';
import { Searchbar, Card, Text, FAB, Chip, Button, Portal, Menu, Snackbar } from 'react-native-paper';
import { OfertaServico, OfertaFilters, SortOption } from '@/types/oferta';
import { ofertaService } from '@/services/ofertaService';
// Telemetria e tracing
import { captureException, addBreadcrumb, startSpan } from '@/utils/sentry';
// import AsyncStorage from '@react-native-async-storage/async-storage'; // não utilizado aqui
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { openAuthModal } from '@/navigation/RootNavigation';
import { formatCurrencyBRL } from '@/utils/currency';
import FiltersModal, { FiltersDraft } from '@/components/FiltersModal';
import { CATEGORIES } from '@/constants/oferta';
import { parseNumber, isValidUF, validatePriceRange } from '@/utils/filtersValidation';

// Rótulos para opções de ordenação
const SORT_LABELS: Record<SortOption, string> = {
    relevancia: '🎯 Mais Relevante',
    preco_menor: '💰 Menor Preço',
    preco_maior: '💎 Maior Preço',
    avaliacao: '⭐ Melhor Avaliação',
    recente: '🆕 Mais Recente',
    distancia: '📍 Mais Próximo',
};

// Helpers de A11Y/i18n (PT-BR por enquanto)
const getSortButtonA11yLabel = (sortBy: SortOption) => `Ordenar por: ${SORT_LABELS[sortBy]}`;
const getSortButtonA11yHint = () => 'Abre as opções de ordenação';

const getAppliedChipA11y = (label: string) => ({
    accessibilityLabel: `Filtro aplicado: ${label}. Toque para remover`,
    accessibilityHint: 'Remove este filtro',
    accessibilityRole: 'button' as const,
    accessibilityState: { selected: true },
});

// getChoiceChipA11y removido: lógica de A11y agora vive dentro do componente FiltersModal

const buildOfferCardA11y = (
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

const BuscarOfertasScreen: React.FC = () => {
    const [ofertas, setOfertas] = useState<OfertaServico[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Additional filters (applied)
    const [precoMin, setPrecoMin] = useState<number | undefined>(undefined);
    const [precoMax, setPrecoMax] = useState<number | undefined>(undefined);
    const [cidade, setCidade] = useState<string | undefined>(undefined);
    const [estado, setEstado] = useState<string | undefined>(undefined);
    const [total, setTotal] = useState<number>(0);

    // Novos filtros avançados
    const [sortBy, setSortBy] = useState<SortOption>('relevancia');
    const [comMidia, setComMidia] = useState<boolean>(false);
    const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ' | undefined>(undefined);
    const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
    const [userLat, setUserLat] = useState<number | undefined>(undefined);
    const [userLng, setUserLng] = useState<number | undefined>(undefined);

    // Filters modal visibility and draft values
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [draft, setDraft] = useState<FiltersDraft>({
        categoria: undefined,
        precoMin: '',
        precoMax: '',
        cidade: '',
        estado: undefined,
        comMidia: false,
        tipoPessoa: 'todos',
    });

    const { user, isAuthenticated, setPendingRedirect } = useAuth();
    // Mostrar CTA de criar oferta para convidados; se autenticado, somente para provider
    const canCreateOffer = isAuthenticated ? user?.tipo === 'provider' : true;
    const navigation = useNavigation<NativeStackNavigationProp<OfertasStackParamList>>();
    const hasInitialLoadedRef = useRef(false);
    // Robustness: track latest request to avoid stale updates overriding newer ones
    const requestIdRef = useRef(0);
    // Cancelamento: manter referência do AbortController da última requisição
    const abortRef = useRef<AbortController | null>(null);
    // Ref para controlar inicialização de carregamento (já usado em hasInitialLoadedRef)

    const onPressCriarOferta = useCallback(() => {
        if (isAuthenticated) {
            navigation.navigate('CreateOferta');
        } else {
            // Define o redirecionamento pós-login e abre o Auth
            setPendingRedirect({ routeName: 'CreateOferta' });
            openAuthModal({ screen: 'Login' });
        }
    }, [isAuthenticated, navigation, setPendingRedirect]);

    // Categorias centralizadas em constantes

    const loadOfertas = useCallback(async (pageNum = 1, refresh = false) => {
        const requestId = ++requestIdRef.current;

        // Aborta a requisição anterior, se existir
        try { abortRef.current?.abort(); } catch {}
        const controller = new AbortController();
        abortRef.current = controller;

        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        // Span de performance (no-op se Sentry não estiver ativo)
        const span = startSpan({ name: 'Buscar ofertas', op: 'http' });
        try {
            setError(null); // limpa erro antes de nova tentativa
            const filters: OfertaFilters = {
                busca: debouncedQuery || undefined,
                categoria: selectedCategory,
                precoMin,
                precoMax,
                cidade,
                estado,
                sort: sortBy,
                comMidia,
                tipoPessoa,
            };

            // Incluir coordenadas quando sort for por distância
            if (sortBy === 'distancia' && typeof userLat === 'number' && typeof userLng === 'number') {
                filters.lat = userLat;
                filters.lng = userLng;
            }

            const response = await ofertaService.getOfertas(filters, pageNum, 10, controller.signal);

            const novasOfertas = Array.isArray(response?.ofertas) ? response.ofertas : [];
            const totalPages = typeof response?.totalPages === 'number' ? response.totalPages : 1;
            const totalCount = typeof response?.total === 'number' ? response.total : 0;

            // Ignore stale responses
            if (requestId !== requestIdRef.current) {
                return;
            }

            if (refresh || pageNum === 1) {
                setOfertas(novasOfertas);
            } else {
                setOfertas(prev => [...prev, ...novasOfertas]);
            }

            setHasMore(pageNum < totalPages);
            setPage(pageNum);
            setTotal(totalCount);
        } catch (error: any) {
            const isAbort = error?.name === 'CanceledError' || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';
            if (isAbort) {
                // Silencioso: cancelada de propósito
            } else if (requestId === requestIdRef.current) {
                // Telemetria com contexto de filtros e paginação
                captureException(error, {
                    tags: {
                        screen: 'BuscarOfertas',
                        sort: sortBy,
                        hasUserLocation: String(typeof userLat === 'number' && typeof userLng === 'number'),
                    },
                    extra: {
                        query: debouncedQuery || undefined,
                        categoria: selectedCategory,
                        precoMin,
                        precoMax,
                        cidade,
                        estado,
                        comMidia,
                        tipoPessoa,
                        page: pageNum,
                        refresh,
                        hasMore,
                    },
                });

                console.warn?.('Falha ao carregar ofertas (rede/servidor):', error);
                setError('Não foi possível carregar as ofertas. Verifique sua conexão e tente novamente.');
            } else {
                // Stale request failed; ignore silently
                console.debug?.('Stale ofertas request failed, ignoring:', error);
            }
        } finally {
            // Only clear loading flags if this is the latest request
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
            // Encerra o span de performance
            try { span.end(); } catch {}
        }
    }, [debouncedQuery, selectedCategory, precoMin, precoMax, cidade, estado, sortBy, comMidia, tipoPessoa, userLat, userLng]);

    const retry = useCallback(() => {
        void loadOfertas(1, true);
    }, [loadOfertas]);

    // Debounce: update debouncedQuery 400ms after user stops typing
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(searchQuery), 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Trigger loading when search or any filter changes
    useEffect(() => {
        if (!hasInitialLoadedRef.current) return;
        void loadOfertas(1, true);
    }, [loadOfertas]);

    // Initial load on mount (ensures first render fetches immediately)
    useEffect(() => {
        void loadOfertas(1, true);
        hasInitialLoadedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Aborta requisição pendente ao desmontar a tela
    useEffect(() => {
        return () => {
            try { abortRef.current?.abort(); } catch {}
        };
    }, []);

    // A11y do modal movido para o componente FiltersModal


    const handleRefresh = () => {
        void loadOfertas(1, true);
    };

    const handleLoadMore = async () => {
        if (isLoadingMore || isRefreshing || isLoading || !hasMore) return;
        try {
            setIsLoadingMore(true);
            await loadOfertas(page + 1);
        } finally {
            setIsLoadingMore(false);
        }
    };


    const openFilters = () => {
        setDraft({
            categoria: selectedCategory,
            precoMin: typeof precoMin === 'number' ? String(precoMin) : '',
            precoMax: typeof precoMax === 'number' ? String(precoMax) : '',
            cidade: cidade ?? '',
            estado,
            comMidia,
            tipoPessoa: tipoPessoa ?? 'todos',
        });
        setIsFiltersVisible(true);
    };

    const applyFilters = () => {
        const min = parseNumber(draft.precoMin);
        const max = parseNumber(draft.precoMax);
        const priceError = validatePriceRange(min, max);
        if (priceError) {
            Alert.alert('Validação', priceError);
            return;
        }

        const ufRaw = (draft.estado || '').trim().toUpperCase();
        if (!isValidUF(ufRaw)) {
            Alert.alert('Validação', 'Estado (UF) deve ter 2 letras');
            return;
        }

        // Breadcrumb para diagnóstico das alterações de filtro
        addBreadcrumb('Aplicar filtros em BuscarOfertas', {
            categoria: draft.categoria,
            precoMin: min,
            precoMax: max,
            cidade: draft.cidade,
            estado: ufRaw || undefined,
            comMidia: draft.comMidia,
            tipoPessoa: draft.tipoPessoa,
        }, 'filtro', 'info');
        setSelectedCategory(draft.categoria);
        setPrecoMin(min);
        setPrecoMax(max);
        setCidade(draft.cidade.trim() || undefined);
        setEstado(ufRaw ? ufRaw : undefined);
        // novos filtros
        setComMidia(draft.comMidia === true);
        setTipoPessoa(draft.tipoPessoa === 'todos' ? undefined : draft.tipoPessoa);
        setIsFiltersVisible(false);
        // Carregamento será disparado pelo useEffect que depende de loadOfertas
    };

    const clearAllFilters = () => {
        setSelectedCategory(undefined);
        setPrecoMin(undefined);
        setPrecoMax(undefined);
        setCidade(undefined);
        setEstado(undefined);
        setComMidia(false);
        setTipoPessoa(undefined);
        setIsFiltersVisible(false);
        setDraft({
            categoria: undefined,
            precoMin: '',
            precoMax: '',
            cidade: '',
            estado: undefined,
            comMidia: false,
            tipoPessoa: 'todos',
        });
    };

    const clearFilter = (key: 'categoria' | 'cidade' | 'estado' | 'preco' | 'comMidia' | 'tipoPessoa') => {
        if (key === 'categoria') setSelectedCategory(undefined);
        if (key === 'cidade') setCidade(undefined);
        if (key === 'estado') setEstado(undefined);
        if (key === 'preco') { setPrecoMin(undefined); setPrecoMax(undefined); }
        if (key === 'comMidia') setComMidia(false);
        if (key === 'tipoPessoa') setTipoPessoa(undefined);
        // Carregamento será disparado pelo useEffect que depende de loadOfertas
    };

    // Card de oferta memoizado para evitar re-renders desnecessários
    const OfferCard = React.memo(({ item }: { item: OfertaServico }) => {
        // Defensive formatting to avoid runtime crashes from unexpected/null fields
        const preco = typeof item?.preco === 'number' ? item.preco : Number(item?.preco ?? 0);
        const prestadorNome = item?.prestador?.nome ?? 'Prestador';
        const avaliacaoNum = typeof item?.prestador?.avaliacao === 'number' ? item.prestador.avaliacao : Number(item?.prestador?.avaliacao ?? 0);
        const cidade = item?.localizacao?.cidade ?? 'Cidade';
        const estado = item?.localizacao?.estado ?? 'UF';
        const handlePress = useCallback(() => {
            navigation.navigate('OfferDetail', { oferta: item });
        }, [item]);

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

        return (
            <Card
                style={styles.card}
                onPress={handlePress}
                {...buildOfferCardA11y(item, precoFmtWithUnit, avaliacaoNum, cidade, estado, distanciaStr)}
            >
                <Card.Content>
                    <View style={styles.cardHeader}>
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

                    <Text numberOfLines={3} style={styles.description}>
                        {item.descricao}
                    </Text>

                    <View style={styles.cardFooter}>
                        <View style={styles.providerInfo}>
                            <Icon name="account" size={16} color={colors.textSecondary} />
                            <Text style={styles.providerName}>{prestadorNome}</Text>
                            <Icon name="star" size={16} color={colors.warning} />
                            <Text style={styles.rating}>{avaliacaoNum.toFixed(1)}</Text>
                        </View>

                        <View style={styles.locationInfo}>
                            <Icon name="map-marker" size={16} color={colors.textSecondary} />
                            <Text style={styles.location}>
                                {cidade}, {estado}{distanciaStr ? ` • ${distanciaStr}` : ''}
                            </Text>
                        </View>
                    </View>

                    <Chip mode="outlined" style={styles.categoryChip}>
                        {item.categoria}
                    </Chip>
                </Card.Content>
            </Card>
        );
    });

    const renderOferta = useCallback(({ item }: { item: OfertaServico }) => (
        <OfferCard item={item} />
    ), []);

    const keyExtractor = useCallback((item: OfertaServico) => item._id, []);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Icon name="store-search" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Não há ofertas para exibir no momento.</Text>
            <Text style={styles.emptySubtext}>
                Assim que novas ofertas forem cadastradas, elas aparecerão aqui. Você pode ajustar os filtros ou buscar por outros termos.
            </Text>
            {canCreateOffer && (
                <Button
                    mode="contained"
                    icon="plus"
                    onPress={onPressCriarOferta}
                    style={styles.emptyCta}
                    accessibilityLabel="Criar nova oferta"
                >
                    Criar Oferta
                </Button>
            )}
        </View>
    );

    // Placeholder de carregamento (skeleton) para cards
    const SkeletonCard = () => (
        <Card style={styles.card} accessible={false} importantForAccessibility="no-hide-descendants">
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={[styles.skel, { width: '60%', height: 20 }]} />
                    <View style={[styles.skel, { width: 90, height: 20 }]} />
                </View>
                <View style={[styles.skel, { width: '100%', height: 48, marginBottom: spacing.sm }]} />
                <View style={{ marginBottom: spacing.sm }}>
                    <View style={[styles.skel, { width: '50%', height: 14, marginBottom: spacing.xs }]} />
                    <View style={[styles.skel, { width: '40%', height: 14 }]} />
                </View>
                <View style={[styles.skel, { width: 96, height: 26, borderRadius: 16 }]} />
            </Card.Content>
        </Card>
    );

    return (
        <View
            style={styles.container}
            accessibilityElementsHidden={isFiltersVisible}
            importantForAccessibility={isFiltersVisible ? 'no-hide-descendants' : 'auto'}
        >
            <Searchbar
                placeholder="Buscar serviços..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                icon="magnify"
                accessibilityLabel="Buscar serviços"
                accessibilityHint="Digite um termo para filtrar ofertas"
            />

            <View style={styles.filtersHeader}>
                <View style={styles.filtersRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Button
                            mode="outlined"
                            icon="filter-variant"
                            onPress={openFilters}
                            accessibilityLabel="Abrir filtros"
                            accessibilityHint="Abre a modal com opções de filtro"
                        >
                            Filtros
                        </Button>
                        <Menu
                            visible={isSortMenuVisible}
                            onDismiss={() => setIsSortMenuVisible(false)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    icon="sort"
                                    onPress={() => setIsSortMenuVisible(true)}
                                    style={{ marginLeft: spacing.xs }}
                                    accessibilityLabel={getSortButtonA11yLabel(sortBy)}
                                    accessibilityHint={getSortButtonA11yHint()}
                                >
                                    {SORT_LABELS[sortBy]}
                                </Button>
                            }
                        >
                            {Object.entries(SORT_LABELS).map(([key, label]) => (
                                <Menu.Item
                                    key={key}
                                    onPress={async () => {
                                        const selected = key as SortOption;
                                        setIsSortMenuVisible(false);
                                        if (selected === 'distancia') {
                                            // Tentar obter localização do usuário
                                            try {
                                                const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
                                                    const navAny: any = navigator as any;
                                                    const geo = navAny?.geolocation;
                                                    if (!geo || !geo.getCurrentPosition) {
                                                        reject(new Error('Permissão de localização não disponível neste dispositivo.'));
                                                        return;
                                                    }
                                                    geo.getCurrentPosition(
                                                        (pos: any) => resolve(pos.coords),
                                                        (err: any) => reject(err),
                                                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                                                    );
                                                });
                                                setUserLat(coords.latitude);
                                                setUserLng(coords.longitude);
                                                setSortBy('distancia');
                                                addBreadcrumb('Alteração de ordenação', { sortBy: 'distancia', lat: coords.latitude, lng: coords.longitude }, 'ordenacao', 'info');
                                                // Recarregar com as novas coordenadas
                                                void loadOfertas(1, true);
                                            } catch (e: any) {
                                                setError('Não foi possível obter sua localização. Verifique as permissões.');
                                            }
                                        } else {
                                            setSortBy(selected);
                                            addBreadcrumb('Alteração de ordenação', { sortBy: selected }, 'ordenacao', 'info');
                                        }
                                    }}
                                    title={label}
                                    leadingIcon={sortBy === (key as SortOption) ? 'check' : undefined}
                                    accessibilityLabel={`${label}${sortBy === (key as SortOption) ? ', selecionado' : ''}`}
                                />
                            ))}
                        </Menu>
                    </View>
                    <RNText
                        style={styles.resultCount}
                        accessibilityLiveRegion="polite"
                        accessibilityLabel={`${total} resultados`}
                    >
                        {total} resultados
                    </RNText>
                </View>
                <View style={styles.appliedChipsContainer}>
                    {selectedCategory ? (
                        <Chip
                            mode="outlined"
                            onClose={() => clearFilter('categoria')}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y(`Categoria: ${selectedCategory}`)}
                        >
                            Categoria: {selectedCategory}
                        </Chip>
                    ) : null}
                    {cidade ? (
                        <Chip
                            mode="outlined"
                            onClose={() => clearFilter('cidade')}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y(`Cidade: ${cidade}`)}
                        >
                            {cidade}
                        </Chip>
                    ) : null}
                    {estado ? (
                        <Chip
                            mode="outlined"
                            onClose={() => clearFilter('estado')}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y(`Estado: ${estado}`)}
                        >
                            {estado}
                        </Chip>
                    ) : null}
                    {(typeof precoMin === 'number' || typeof precoMax === 'number') ? (
                        <Chip
                            mode="outlined"
                            onClose={() => clearFilter('preco')}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y(
                                `Faixa de preço: ${typeof precoMin === 'number' ? precoMin : 0}${typeof precoMax === 'number' ? ` a ${precoMax}` : ' ou mais'}`
                            )}
                        >
                            {`R$ ${typeof precoMin === 'number' ? precoMin : 0}${typeof precoMax === 'number' ? `–${precoMax}` : '+'}`}
                        </Chip>
                    ) : null}
                    {comMidia ? (
                        <Chip
                            mode="outlined"
                            icon="image"
                            onClose={() => clearFilter('comMidia')}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y('Com mídia')}
                        >
                            Com mídia
                        </Chip>
                    ) : null}
                    {tipoPessoa ? (
                        <Chip
                            mode="outlined"
                            onClose={() => clearFilter('tipoPessoa')}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y(`Tipo de prestador: ${tipoPessoa}`)}
                        >
                            {tipoPessoa}
                        </Chip>
                    ) : null}
                    {(selectedCategory || cidade || estado || typeof precoMin === 'number' || typeof precoMax === 'number' || comMidia || tipoPessoa) ? (
                        <Chip
                            mode="outlined"
                            icon="close-circle"
                            onPress={clearAllFilters}
                            style={styles.appliedChip}
                            accessibilityLabel="Limpar filtros"
                            accessibilityHint="Remove todos os filtros aplicados"
                            accessibilityRole="button"
                        >
                            Limpar
                        </Chip>
                    ) : null}
                </View>
            </View>

            <Portal>
                <FiltersModal
                    visible={isFiltersVisible}
                    onDismiss={() => setIsFiltersVisible(false)}
                    draft={draft}
                    onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                    onClear={clearAllFilters}
                    onApply={applyFilters}
                    categories={[...CATEGORIES]}
                />
            </Portal>

            {((ofertas.length === 0) && (isRefreshing || (isLoading && page === 1))) ? (
                <View style={styles.list}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={`skel-${i}`} />
                    ))}
                </View>
            ) : (
                <FlatList
                    testID="ofertas-list"
                    data={ofertas}
                    renderItem={renderOferta}
                    keyExtractor={keyExtractor}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={styles.list}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews
                    ListEmptyComponent={!isLoading ? renderEmpty : null}
                    ListFooterComponent={isLoadingMore ? (
                        <View>
                            {Array.from({ length: 2 }).map((_, i) => (
                                <SkeletonCard key={`skel-more-${i}`} />
                            ))}
                        </View>
                    ) : null}
                />
            )}

            <Snackbar
                visible={!!error}
                onDismiss={() => setError(null)}
                action={{ label: 'Tentar novamente', onPress: retry }}
                style={{ margin: spacing.md }}
                accessibilityLiveRegion="polite"
                accessibilityLabel={error || 'Erro'}
            >
                {error}
            </Snackbar>

            {canCreateOffer && (
                <FAB
                    mode="elevated"
                    size="large"
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    icon="plus"
                    label="Criar Oferta"
                    color="#FFFFFF"
                    accessibilityLabel="Criar nova oferta"
                    accessibilityHint="Abre a tela para criar uma nova oferta de serviço"
                    onPress={onPressCriarOferta}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchbar: {
        margin: spacing.md,
        marginBottom: spacing.sm,
    },
    filtersHeader: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    filtersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    resultCount: {
        marginLeft: spacing.sm,
        color: colors.textSecondary,
    },
    appliedChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: spacing.xs,
    },
    appliedChip: {
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
    modalContainer: {
        backgroundColor: colors.background,
        margin: spacing.md,
        borderRadius: 16,
        padding: spacing.md,
        maxHeight: '80%'
    },
    modalContent: {
        paddingBottom: spacing.lg,
    },
    sectionTitle: {
        marginBottom: spacing.sm,
    },
    chipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    categoryChoiceChip: {
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        minWidth: 92,
        justifyContent: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowItem: {
        flex: 1,
    },
    categoriesContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    categoryFilter: {
        marginRight: spacing.sm,
    },
    list: {
        padding: spacing.md,
        paddingTop: 0,
    },
    card: {
        marginBottom: spacing.md,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    cardTitle: {
        flex: 1,
        flexShrink: 1,
        marginRight: spacing.sm,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        flexShrink: 0,
        textAlign: 'right',
    },
    description: {
        marginBottom: spacing.sm,
        color: colors.textSecondary,
    },
    cardFooter: {
        marginBottom: spacing.sm,
    },
    providerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
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
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    location: {
        marginLeft: spacing.xs,
        color: colors.textSecondary,
        fontSize: 12,
    },
    categoryChip: {
        alignSelf: 'flex-start',
    },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        elevation: 6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
    },
    emptyCta: {
        marginTop: spacing.md,
        alignSelf: 'center',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    footerLoader: {
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skel: {
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
    },
});

export default BuscarOfertasScreen;