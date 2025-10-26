import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, ScrollView } from 'react-native';
import { Searchbar, Card, Text, FAB, Chip, ActivityIndicator, Button, Portal, Modal, TextInput, HelperText, Divider, Menu, Switch, SegmentedButtons } from 'react-native-paper';
import { OfertaServico, OfertaFilters, SortOption } from '@/types/oferta';
import { ofertaService } from '@/services/ofertaService';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { openAuthModal } from '@/navigation/RootNavigation';
import { formatCurrencyBRL } from '@/utils/currency';

// Rótulos para opções de ordenação
const SORT_LABELS: Record<SortOption, string> = {
    relevancia: '🎯 Mais Relevante',
    preco_menor: '💰 Menor Preço',
    preco_maior: '💎 Maior Preço',
    avaliacao: '⭐ Melhor Avaliação',
    recente: '🆕 Mais Recente',
};

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

    // Filters modal visibility and draft values
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [draftCategoria, setDraftCategoria] = useState<string | undefined>(undefined);
    const [draftPrecoMin, setDraftPrecoMin] = useState<string>('');
    const [draftPrecoMax, setDraftPrecoMax] = useState<string>('');
    const [draftCidade, setDraftCidade] = useState<string>('');
    const [draftEstado, setDraftEstado] = useState<string | undefined>(undefined);
    const [draftComMidia, setDraftComMidia] = useState<boolean>(false);
    const [draftTipoPessoa, setDraftTipoPessoa] = useState<'PF' | 'PJ' | 'todos'>('todos');

    const { user, isAuthenticated, setPendingRedirect } = useAuth();
    // Mostrar CTA de criar oferta para convidados; se autenticado, somente para provider
    const canCreateOffer = isAuthenticated ? user?.tipo === 'provider' : true;
    const navigation = useNavigation<NativeStackNavigationProp<OfertasStackParamList>>();
    const hasInitialLoadedRef = useRef(false);
    // Robustness: track latest request to avoid stale updates overriding newer ones
    const requestIdRef = useRef(0);

    const onPressCriarOferta = useCallback(() => {
        if (isAuthenticated) {
            navigation.navigate('CreateOferta');
        } else {
            // Define o redirecionamento pós-login e abre o Auth
            setPendingRedirect({ routeName: 'CreateOferta' });
            openAuthModal({ screen: 'Login' });
        }
    }, [isAuthenticated, navigation, setPendingRedirect]);

    const categories = ['Tecnologia','Saúde','Educação','Beleza','Limpeza','Consultoria','Construção','Jardinagem','Transporte','Alimentação','Eventos','Outros'];

    const loadOfertas = useCallback(async (pageNum = 1, refresh = false) => {
        const requestId = ++requestIdRef.current;
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
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

            const response = await ofertaService.getOfertas(filters, pageNum, 10);

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
            if (requestId === requestIdRef.current) {
                // Em caso de falha de rede ou servidor, não interromper com alerta.
                // Mantemos o estado atual e deixamos a UI exibir o estado vazio amigável quando aplicável.
                console.warn?.('Falha ao carregar ofertas (rede/servidor):', error);
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
        }
    }, [debouncedQuery, selectedCategory, precoMin, precoMax, cidade, estado, sortBy, comMidia, tipoPessoa]);

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
        setDraftCategoria(selectedCategory);
        setDraftPrecoMin(typeof precoMin === 'number' ? String(precoMin) : '');
        setDraftPrecoMax(typeof precoMax === 'number' ? String(precoMax) : '');
        setDraftCidade(cidade ?? '');
        setDraftEstado(estado);
        setDraftComMidia(comMidia);
        setDraftTipoPessoa(tipoPessoa ?? 'todos');
        setIsFiltersVisible(true);
    };

    const parseNumber = (s: string): number | undefined => {
        if (!s) return undefined;
        const normalized = s.replace(',', '.');
        const n = Number(normalized);
        return Number.isFinite(n) ? n : undefined;
    };

    const applyFilters = () => {
        const min = parseNumber(draftPrecoMin);
        const max = parseNumber(draftPrecoMax);
        if (typeof min === 'number' && typeof max === 'number' && min > max) {
            Alert.alert('Validação', 'Preço mínimo não pode ser maior que o máximo');
            return;
        }
        const ufRaw = (draftEstado || '').trim().toUpperCase();
        const ufValid = ufRaw === '' || /^[A-Z]{2}$/.test(ufRaw);
        if (!ufValid) {
            Alert.alert('Validação', 'Estado (UF) deve ter 2 letras');
            return;
        }
        setSelectedCategory(draftCategoria);
        setPrecoMin(min);
        setPrecoMax(max);
        setCidade(draftCidade.trim() || undefined);
        setEstado(ufRaw ? ufRaw : undefined);
        // novos filtros
        setComMidia(draftComMidia === true);
        setTipoPessoa(draftTipoPessoa === 'todos' ? undefined : draftTipoPessoa);
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
        setDraftCategoria(undefined);
        setDraftPrecoMin('');
        setDraftPrecoMax('');
        setDraftCidade('');
        setDraftEstado(undefined);
        setDraftComMidia(false);
        setDraftTipoPessoa('todos');
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

    const renderOferta = ({ item }: { item: OfertaServico }) => {
        // Defensive formatting to avoid runtime crashes from unexpected/null fields
        const preco = typeof item?.preco === 'number' ? item.preco : Number(item?.preco ?? 0);
        const prestadorNome = item?.prestador?.nome ?? 'Prestador';
        const avaliacaoNum = typeof item?.prestador?.avaliacao === 'number' ? item.prestador.avaliacao : Number(item?.prestador?.avaliacao ?? 0);
        const cidade = item?.localizacao?.cidade ?? 'Cidade';
        const estado = item?.localizacao?.estado ?? 'UF';

        return (
            <Card style={styles.card} onPress={() => navigation.navigate('OfferDetail', { oferta: item })}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <Text variant="titleMedium" numberOfLines={2}>{item.titulo}</Text>
                        <Text style={styles.price}>{formatCurrencyBRL(preco)}</Text>
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
                                {cidade}, {estado}
                            </Text>
                        </View>
                    </View>

                    <Chip mode="outlined" style={styles.categoryChip}>
                        {item.categoria}
                    </Chip>
                </Card.Content>
            </Card>
        );
    };

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

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Buscar serviços..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                icon="magnify"
            />

            <View style={styles.filtersHeader}>
                <View style={styles.filtersRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Button mode="outlined" icon="filter-variant" onPress={openFilters} accessibilityLabel="Abrir filtros">
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
                                >
                                    {SORT_LABELS[sortBy]}
                                </Button>
                            }
                        >
                            {Object.entries(SORT_LABELS).map(([key, label]) => (
                                <Menu.Item
                                    key={key}
                                    onPress={() => {
                                        setSortBy(key as SortOption);
                                        setIsSortMenuVisible(false);
                                    }}
                                    title={label}
                                    leadingIcon={sortBy === (key as SortOption) ? 'check' : undefined}
                                />
                            ))}
                        </Menu>
                    </View>
                    <Text style={styles.resultCount}>{total} resultados</Text>
                </View>
                <View style={styles.appliedChipsContainer}>
                    {selectedCategory ? (
                        <Chip mode="outlined" onClose={() => clearFilter('categoria')} style={styles.appliedChip}>
                            Categoria: {selectedCategory}
                        </Chip>
                    ) : null}
                    {cidade ? (
                        <Chip mode="outlined" onClose={() => clearFilter('cidade')} style={styles.appliedChip}>
                            {cidade}
                        </Chip>
                    ) : null}
                    {estado ? (
                        <Chip mode="outlined" onClose={() => clearFilter('estado')} style={styles.appliedChip}>
                            {estado}
                        </Chip>
                    ) : null}
                    {(typeof precoMin === 'number' || typeof precoMax === 'number') ? (
                        <Chip mode="outlined" onClose={() => clearFilter('preco')} style={styles.appliedChip}>
                            {`R$ ${typeof precoMin === 'number' ? precoMin : 0}${typeof precoMax === 'number' ? `–${precoMax}` : '+'}`}
                        </Chip>
                    ) : null}
                    {comMidia ? (
                        <Chip mode="outlined" icon="image" onClose={() => clearFilter('comMidia')} style={styles.appliedChip}>
                            Com mídia
                        </Chip>
                    ) : null}
                    {tipoPessoa ? (
                        <Chip mode="outlined" onClose={() => clearFilter('tipoPessoa')} style={styles.appliedChip}>
                            {tipoPessoa}
                        </Chip>
                    ) : null}
                    {(selectedCategory || cidade || estado || typeof precoMin === 'number' || typeof precoMax === 'number' || comMidia || tipoPessoa) ? (
                        <Chip mode="outlined" icon="close-circle" onPress={clearAllFilters} style={styles.appliedChip}>
                            Limpar
                        </Chip>
                    ) : null}
                </View>
            </View>

            <Portal>
                <Modal visible={isFiltersVisible} onDismiss={() => setIsFiltersVisible(false)} contentContainerStyle={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Categoria</Text>
                        <View style={styles.chipsGrid}>
                            {categories.map((cat) => (
                                <Chip
                                    key={cat}
                                    mode={draftCategoria === cat ? 'flat' : 'outlined'}
                                    selected={draftCategoria === cat}
                                    onPress={() => setDraftCategoria(draftCategoria === cat ? undefined : cat)}
                                    style={styles.categoryChoiceChip}
                                >
                                    {cat}
                                </Chip>
                            ))}
                        </View>

                        <Divider style={{ marginVertical: spacing.md }} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Preço</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="Mínimo"
                                mode="outlined"
                                keyboardType="numeric"
                                value={draftPrecoMin}
                                onChangeText={setDraftPrecoMin}
                                style={[styles.rowItem, { marginRight: spacing.sm }]}
                            />
                            <TextInput
                                label="Máximo"
                                mode="outlined"
                                keyboardType="numeric"
                                value={draftPrecoMax}
                                onChangeText={setDraftPrecoMax}
                                style={styles.rowItem}
                            />
                        </View>
                        <HelperText type="info" visible={true}>Deixe em branco para não filtrar</HelperText>

                        <Divider style={{ marginVertical: spacing.md }} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Localização</Text>
                        <TextInput
                            label="Cidade"
                            mode="outlined"
                            value={draftCidade}
                            onChangeText={setDraftCidade}
                            style={{ marginBottom: spacing.sm }}
                        />
                        <View style={styles.chipsGrid}>
                            {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map((uf) => (
                                <Chip
                                    key={uf}
                                    mode={draftEstado === uf ? 'flat' : 'outlined'}
                                    selected={draftEstado === uf}
                                    onPress={() => setDraftEstado(draftEstado === uf ? undefined : uf)}
                                    style={styles.categoryChoiceChip}
                                >
                                    {uf}
                                </Chip>
                            ))}
                        </View>

                        <Divider style={{ marginVertical: spacing.md }} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Preferências</Text>
                        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.sm }]}>
                            <Text>Apenas com fotos/vídeos</Text>
                            <Switch value={draftComMidia} onValueChange={setDraftComMidia} />
                        </View>
                        <Text variant="labelMedium" style={{ marginBottom: spacing.xs }}>Tipo de Prestador</Text>
                        <SegmentedButtons
                            value={draftTipoPessoa}
                            onValueChange={(val) => setDraftTipoPessoa((val as 'PF' | 'PJ' | 'todos') ?? 'todos')}
                            buttons={[
                                { value: 'todos', label: 'Todos' },
                                { value: 'PF', label: 'Pessoa Física' },
                                { value: 'PJ', label: 'Pessoa Jurídica' },
                            ]}
                            style={{ marginBottom: spacing.sm }}
                        />

                        <View style={styles.actionRow}>
                            <Button mode="text" onPress={clearAllFilters}>Limpar</Button>
                            <View style={{ flex: 1 }} />
                            <Button mode="text" onPress={() => setIsFiltersVisible(false)}>Cancelar</Button>
                            <Button mode="contained" onPress={applyFilters}>Aplicar</Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>

            {((ofertas.length === 0) && (isRefreshing || (isLoading && page === 1))) ? (
                <View style={styles.loaderContainer} accessibilityRole="progressbar">
                    <ActivityIndicator testID="initial-loader" animating size="large" />
                </View>
            ) : (
                <FlatList
                    testID="ofertas-list"
                    data={ofertas}
                    renderItem={renderOferta}
                    keyExtractor={(item) => item._id}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.1}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={!isLoading ? renderEmpty : null}
                    ListFooterComponent={isLoadingMore ? (
                        <View style={styles.footerLoader} accessibilityRole="progressbar">
                            <ActivityIndicator testID="footer-loader" animating size="small" />
                        </View>
                    ) : null}
                />
            )}

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
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
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
});

export default BuscarOfertasScreen;