import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text as RNText, Switch as RNSwitch } from 'react-native';
import { showAlert } from '@/utils/alert';
import { Searchbar, Text, FAB, Chip, Button, Portal, Menu, Snackbar, List, IconButton } from 'react-native-paper';
// Removido o componente SuggestionsCard em favor de sugestões inline no header (Parte 6)
import { OfertaServico, OfertaFilters, SortOption } from '@/types/oferta';
import { OfferCard } from '@/components/offers/OfferCard';
import { ofertaService } from '@/services/ofertaService';
// Telemetria e tracing
import { captureException, startSpan } from '@/utils/sentry';
import { trackApplyFilters, trackChangeSort } from '@/utils/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, radius, elevation } from '@/styles/theme';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { openAuthModal } from '@/navigation/RootNavigation';
import FiltersModal, { FiltersDraft } from '@/components/FiltersModal';
import { CATEGORIES_NAMES as CATEGORY_NAMES } from '@/constants/categories';
import { parseNumber, validatePriceRange } from '@/utils/filtersValidation';

// Rótulos para opções de ordenação
const SORT_LABELS: Record<SortOption, string> = {
    relevancia: 'Mais Relevante',
    preco_menor: 'Menor Preço',
    preco_maior: 'Maior Preço',
    avaliacao: 'Melhor Avaliação',
    recente: 'Mais Recente',
    distancia: 'Mais Próximo',
};

// Ícones do Material Design para cada opção de ordenação
const SORT_ICONS: Record<SortOption, string> = {
    relevancia: 'target',
    preco_menor: 'sort-ascending',
    preco_maior: 'sort-descending',
    avaliacao: 'star',
    recente: 'clock-outline',
    distancia: 'map-marker-distance',
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

    // Histórico de buscas recentes (estado de sugestões redundante removido)
    // Modo de Busca Focado: controla estados visuais/UX enquanto o campo está focado
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Additional filters (applied)
    const [precoMin, setPrecoMin] = useState<number | undefined>(undefined);
    const [precoMax, setPrecoMax] = useState<number | undefined>(undefined);
    const [cidade, setCidade] = useState<string | undefined>(undefined);
    const [estados, setEstados] = useState<string[]>([]);
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
        estados: [],
        comMidia: false,
        tipoPessoa: 'todos',
    });

    const { user, isAuthenticated, setPendingRedirect } = useAuth();
    // Namespacing do storage por feature/usuário
    const STORAGE_KEY = user?.id ? `ofertas:recentSearches:${(user as any).id}` : 'ofertas:recentSearches:anon';
    const STORAGE_ENABLED_KEY = user?.id ? `ofertas:recentSearches:enabled:${(user as any).id}` : 'ofertas:recentSearches:enabled:anon';
    // Normalizador para comparação case/acentos-insensível
    const normalize = useCallback((s: string) => (
        (s ?? '')
            .normalize('NFD')
            // remove diacríticos combinantes (compatível com motores que não suportam \p{Diacritic})
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
    ), []);
    // Mostrar CTA de criar oferta para todos os usuários (unificação de perfis)
    const canCreateOffer = true;
    const navigation = useNavigation<NativeStackNavigationProp<OfertasStackParamList>>();
    const hasInitialLoadedRef = useRef(false);
    // Robustness: track latest request to avoid stale updates overriding newer ones
    const requestIdRef = useRef(0);
    // Cancelamento: manter referência do AbortController da última requisição
    const abortRef = useRef<AbortController | null>(null);
    // Ref para controlar inicialização de carregamento (já usado em hasInitialLoadedRef)
    // Ref para submissão imediata: permite usar o termo atual sem esperar o debounce
    const immediateQueryRef = useRef<string | null>(null);

    // Preferência de privacidade para histórico
    const [historyEnabled, setHistoryEnabled] = useState<boolean>(true);

    const loadHistoryEnabled = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_ENABLED_KEY);
            if (stored == null) {
                setHistoryEnabled(true);
                return;
            }
            setHistoryEnabled(stored === 'true');
        } catch (e: any) {
            captureException?.(e, { tags: { area: 'search-history', op: 'load-enabled' } });
            setHistoryEnabled(true);
        }
    }, [STORAGE_ENABLED_KEY]);

    const toggleHistoryEnabled = useCallback(async () => {
        try {
            const next = !historyEnabled;
            setHistoryEnabled(next);
            await AsyncStorage.setItem(STORAGE_ENABLED_KEY, String(next));
            if (!next) {
                // ao desativar, limpa os dados persistidos
                setRecentSearches([]);
                await AsyncStorage.removeItem(STORAGE_KEY);
            }
        } catch (e: any) {
            captureException?.(e, { tags: { area: 'search-history', op: 'toggle-enabled' } });
        }
    }, [historyEnabled, STORAGE_ENABLED_KEY, STORAGE_KEY]);

    // Carrega histórico de buscas recentes do AsyncStorage
    const loadRecentSearches = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (!stored) {
                setRecentSearches([]);
                return;
            }
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) {
                setRecentSearches(parsed);
            } else {
                // valor inválido/corrompido: limpa e segue em frente
                await AsyncStorage.removeItem(STORAGE_KEY);
                setRecentSearches([]);
            }
        } catch (error: any) {
            captureException?.(error, { tags: { area: 'search-history', op: 'load' } });
            setRecentSearches([]);
        }
    }, [STORAGE_KEY]);

    // Salva o termo no histórico (máx 10, sem duplicatas, mais recente primeiro)
    const saveSuccessfulSearch = useCallback(async (term: string) => {
        const trimmed = (term || '').trim();
        if (!historyEnabled) return; // preferência de privacidade
        if (trimmed.length < 3) return; // Ignora termos muito curtos

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            const arr = Array.isArray(parsed) && parsed.every(x => typeof x === 'string') ? parsed as string[] : [];
            const norm = normalize(trimmed);
            const updated = [trimmed, ...arr.filter(s => normalize(s) !== norm)].slice(0, 10);
            setRecentSearches(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error: any) {
            captureException?.(error, { tags: { area: 'search-history', op: 'save' } });
        }
    }, [STORAGE_KEY, normalize, historyEnabled]);

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
            // Limpa referência de busca imediata (não utilizamos mais esta via, optamos por sincronizar o debounce)
            if (immediateQueryRef.current !== null) {
                immediateQueryRef.current = null;
            }
            const filters: OfertaFilters = {
                busca: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
                categoria: selectedCategory,
                precoMin,
                precoMax,
                cidade,
                estado: estados.length > 0 ? (estados.length === 1 ? estados[0] : estados) : undefined,
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

            // Parte 4: salvar busca bem-sucedida após atualizar estado (com termo normalizado)
            const q = debouncedQuery.trim();
            if (pageNum === 1 && totalCount > 0 && q.length >= 3) {
                void saveSuccessfulSearch(q);
            }
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
                        estado: estados,
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
    }, [debouncedQuery, selectedCategory, precoMin, precoMax, cidade, estados, sortBy, comMidia, tipoPessoa, userLat, userLng, saveSuccessfulSearch]);

    const retry = useCallback(() => {
        void loadOfertas(1, true);
    }, [loadOfertas]);

    // Debounce: update debouncedQuery 300ms after user stops typing
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Trigger loading when search or any filter changes
    useEffect(() => {
        if (!hasInitialLoadedRef.current) return;
        void loadOfertas(1, true);
    }, [loadOfertas]);

    // Carregar histórico de buscas recentes e preferência no ciclo de vida e quando o usuário mudar
    useEffect(() => {
        void loadRecentSearches();
        void loadHistoryEnabled();
    }, [loadRecentSearches, loadHistoryEnabled]);

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
            estados: estados,
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
            showAlert('Validação', priceError);
            return;
        }

        // Analytics: console.log + breadcrumb
        trackApplyFilters({
            categoria: draft.categoria,
            precoMin: min,
            precoMax: max,
            cidade: draft.cidade,
            estados: draft.estados,
            comMidia: draft.comMidia,
            tipoPessoa: draft.tipoPessoa,
        });
        setSelectedCategory(draft.categoria);
        setPrecoMin(min);
        setPrecoMax(max);
        setCidade(draft.cidade.trim() || undefined);
        setEstados(draft.estados);
        // novos filtros
        // draft.comMidia já é boolean; evitar comparação redundante com true
        setComMidia(draft.comMidia);
        setTipoPessoa(draft.tipoPessoa === 'todos' ? undefined : draft.tipoPessoa);
        setIsFiltersVisible(false);
        // Carregamento será disparado pelo useEffect que depende de loadOfertas
    };

    const clearAllFilters = () => {
        setSelectedCategory(undefined);
        setPrecoMin(undefined);
        setPrecoMax(undefined);
        setCidade(undefined);
        setEstados([]);
        setComMidia(false);
        setTipoPessoa(undefined);
        setIsFiltersVisible(false);
        setDraft({
            categoria: undefined,
            precoMin: '',
            precoMax: '',
            cidade: '',
            estados: [],
            comMidia: false,
            tipoPessoa: 'todos',
        });
    };

    const clearFilter = (key: 'categoria' | 'cidade' | 'estado' | 'preco' | 'comMidia' | 'tipoPessoa') => {
        if (key === 'categoria') setSelectedCategory(undefined);
        if (key === 'cidade') setCidade(undefined);
        if (key === 'estado') setEstados([]);
        if (key === 'preco') { setPrecoMin(undefined); setPrecoMax(undefined); }
        if (key === 'comMidia') setComMidia(false);
        if (key === 'tipoPessoa') setTipoPessoa(undefined);
        // Carregamento será disparado pelo useEffect que depende de loadOfertas
    };


    const keyExtractor = useCallback((item: OfertaServico) => item._id, []);

    const renderEmpty = () => {
        const priceApplied = typeof precoMin === 'number' || typeof precoMax === 'number';
        const hasAppliedFilters = Boolean(
            selectedCategory || cidade || estados.length > 0 || priceApplied || comMidia || tipoPessoa
        );

        if (hasAppliedFilters) {
            return (
                <View style={styles.emptyContainer}>
                    <Icon name="filter-variant" size={64} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>Nenhum resultado com os filtros aplicados.</Text>
                    <Text style={styles.emptySubtext}>
                        Seus filtros podem estar muito restritivos. Tente ajustar alguns critérios ou limpe todos os filtros para ver mais ofertas.
                    </Text>
                    <Button
                        mode="contained"
                        icon="filter-remove"
                        onPress={clearAllFilters}
                        style={styles.emptyCta}
                        accessibilityLabel="Limpar filtros"
                        accessibilityHint="Remove todos os filtros aplicados e atualiza a lista de ofertas"
                    >
                        Limpar filtros
                    </Button>
                </View>
            );
        }

        return (
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
    };

    // Placeholder de carregamento (skeleton) para cards
    const SkeletonCard = () => (
        <View style={styles.card} accessible={false} importantForAccessibility="no-hide-descendants">
            <View style={styles.cardHeader}>
                <View style={[styles.skel, { width: '60%', height: 20 }]} />
                <View style={[styles.skel, { width: 90, height: 20 }]} />
            </View>
            <View style={[styles.skel, { width: '100%', height: 48, marginBottom: spacing.sm }]} />
            <View style={{ marginBottom: spacing.sm }}>
                <View style={[styles.skel, { width: '50%', height: 14, marginBottom: spacing.xs }]} />
                <View style={[styles.skel, { width: '40%', height: 14 }]} />
            </View>
            <View style={[styles.skel, { width: 96, height: 26, borderRadius: radius.xl }]} />
        </View>
    );

    // Header que deve rolar junto com a lista (Searchbar + botões/ordenação)
    // Manipuladores do histórico (remover/limpar/selecionar)
    const handleRemoveSearch = useCallback(async (term: string) => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            const arr = Array.isArray(parsed) && parsed.every(x => typeof x === 'string') ? parsed as string[] : [];
            const norm = normalize(term);
            const updated = arr.filter(s => normalize(s) !== norm);
            setRecentSearches(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error: any) {
            captureException?.(error, { tags: { area: 'search-history', op: 'remove' } });
        }
    }, [STORAGE_KEY, normalize]);

    const handleClearSearches = useCallback(async () => {
        try {
            setRecentSearches([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error: any) {
            captureException?.(error, { tags: { area: 'search-history', op: 'clear' } });
        }
    }, [STORAGE_KEY]);

    const handleSelectSuggestion = useCallback((term: string) => {
        setSearchQuery(term);
        setDebouncedQuery(term); // sincroniza para busca imediata
        setIsSearchFocused(false); // Sai do modo focado
        void loadOfertas(1, true);
    }, [loadOfertas]);

    const renderFiltersHeader = useCallback(() => (
        <View style={styles.filtersHeader}>
            <View style={styles.filtersRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {(() => {
                        const priceApplied = typeof precoMin === 'number' || typeof precoMax === 'number';
                        const appliedFiltersCount =
                            (selectedCategory ? 1 : 0) +
                            (cidade ? 1 : 0) +
                            (estados.length > 0 ? 1 : 0) +
                            (priceApplied ? 1 : 0) +
                            (comMidia ? 1 : 0) +
                            (tipoPessoa ? 1 : 0);
                        const hasAppliedFilters = appliedFiltersCount > 0;
                        return (
                            <Button
                                mode={hasAppliedFilters ? 'contained' : 'outlined'}
                                icon="filter-variant"
                                onPress={openFilters}
                                contentStyle={styles.touchTargetButton}
                                accessibilityLabel={hasAppliedFilters
                                    ? `Abrir filtros, ${appliedFiltersCount} filtros aplicados`
                                    : 'Abrir filtros'}
                                accessibilityHint="Abre a modal com opções de filtro"
                                accessibilityState={{ selected: hasAppliedFilters }}
                            >
                                {hasAppliedFilters ? `Filtros (${appliedFiltersCount})` : 'Filtros'}
                            </Button>
                        );
                    })()}
                    <Menu
                        visible={isSortMenuVisible}
                        onDismiss={() => setIsSortMenuVisible(false)}
                        anchor={
                            <Button
                                mode="outlined"
                                icon="sort"
                                onPress={() => setIsSortMenuVisible(true)}
                                style={{ marginLeft: spacing.xs }}
                                contentStyle={styles.touchTargetButton}
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
                                            trackChangeSort(sortBy, 'distancia', { lat: coords.latitude, lng: coords.longitude });
                                            setSortBy('distancia');
                                            void loadOfertas(1, true);
                                        } catch (e: any) {
                                            setError('Não foi possível obter sua localização. Verifique as permissões.');
                                        }
                                    } else {
                                        trackChangeSort(sortBy, selected);
                                        setSortBy(selected);
                                    }
                                }}
                                title={label}
                                leadingIcon={sortBy === (key as SortOption) ? 'check' : SORT_ICONS[key as SortOption]}
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
        </View>
    ), [precoMin, precoMax, selectedCategory, cidade, estados, comMidia, tipoPessoa, isSortMenuVisible, sortBy, total]);

    // Chips aplicados como cabeçalho fixo (sticky)
    const renderAppliedChips = useCallback(() => (
        <View style={styles.stickyChipsContainer}>
            <View style={styles.appliedChipsContainer}>
                {selectedCategory ? (
                    <Chip
                        mode="outlined"
                        onPress={() => clearFilter('categoria')}
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
                        onPress={() => clearFilter('cidade')}
                        onClose={() => clearFilter('cidade')}
                        style={styles.appliedChip}
                        {...getAppliedChipA11y(`Cidade: ${cidade}`)}
                    >
                        {cidade}
                    </Chip>
                ) : null}
                {estados.length > 0 ? (
                    estados.map((uf) => (
                        <Chip
                            key={uf}
                            mode="outlined"
                            onPress={() => setEstados(prev => prev.filter(e => e !== uf))}
                            onClose={() => setEstados(prev => prev.filter(e => e !== uf))}
                            style={styles.appliedChip}
                            {...getAppliedChipA11y(`Estado: ${uf}`)}
                        >
                            {uf}
                        </Chip>
                    ))
                ) : null}
                {(typeof precoMin === 'number' || typeof precoMax === 'number') ? (
                    <Chip
                        mode="outlined"
                        onPress={() => clearFilter('preco')}
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
                        onPress={() => clearFilter('comMidia')}
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
                        onPress={() => clearFilter('tipoPessoa')}
                        onClose={() => clearFilter('tipoPessoa')}
                        style={styles.appliedChip}
                        {...getAppliedChipA11y(`Tipo de prestador: ${tipoPessoa}`)}
                    >
                        {tipoPessoa}
                    </Chip>
                ) : null}
                {(selectedCategory || cidade || estados.length > 0 || typeof precoMin === 'number' || typeof precoMax === 'number' || comMidia || tipoPessoa) ? (
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
    ), [selectedCategory, cidade, estados, precoMin, precoMax, comMidia, tipoPessoa]);

    const CHIPS_SENTINEL = '__chips__';
    const hasAppliedFilters = React.useMemo(() => (
        Boolean(
            selectedCategory || cidade || estados.length > 0 ||
            typeof precoMin === 'number' || typeof precoMax === 'number' ||
            comMidia || tipoPessoa
        )
    ), [selectedCategory, cidade, estados, precoMin, precoMax, comMidia, tipoPessoa]);
    const dataWithChips = React.useMemo(() => (
        hasAppliedFilters ? [CHIPS_SENTINEL, ...ofertas] : ofertas
    ), [hasAppliedFilters, ofertas]);

    // Flag estável para controlar placeholders sem trocar a árvore da UI
    const isInitialOrRefreshing = isRefreshing || (isLoading && page === 1);

    return (
        <View
            style={styles.container}
            accessibilityElementsHidden={isFiltersVisible}
            importantForAccessibility={isFiltersVisible ? 'no-hide-descendants' : 'auto'}
        >
            <Portal>
                <FiltersModal
                    visible={isFiltersVisible}
                    onDismiss={() => setIsFiltersVisible(false)}
                    draft={draft}
                    onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                    onClear={clearAllFilters}
                    onApply={applyFilters}
                categories={[...CATEGORY_NAMES]}
            />
            </Portal>

            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Buscar serviços (ex.: encanador, elétrica, pintura)"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                    testID="search-input"
                    icon="magnify"
                    loading={isLoading || isRefreshing}
                    clearIcon="close"
                    onClearIconPress={() => setSearchQuery("")}
                    onFocus={() => { setIsSearchFocused(true); }}
                    onBlur={() => {
                        // pequeno atraso para permitir o toque em itens recentes
                        setTimeout(() => setIsSearchFocused(false), 150);
                    }}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                        // Sincroniza o debounce e busca imediatamente
                        setDebouncedQuery(searchQuery);
                        void loadOfertas(1, true);
                    }}
                    accessibilityLabel="Buscar serviços"
                    accessibilityHint="Digite um termo para buscar e pressione 'buscar' no teclado para resultados imediatos"
                />

                {isSearchFocused && (
                    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Buscas Recentes</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {recentSearches.length > 0 && historyEnabled && (
                                    <Button mode="text" onPress={handleClearSearches} compact accessibilityLabel="Limpar histórico de buscas">
                                        Limpar
                                    </Button>
                                )}
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ marginRight: spacing.xs }}>Histórico</Text>
                                    <RNSwitch
                                        value={historyEnabled}
                                        onValueChange={toggleHistoryEnabled}
                                        accessibilityLabel={historyEnabled ? 'Desativar histórico de buscas' : 'Ativar histórico de buscas'}
                                    />
                                </View>
                            </View>
                        </View>
                        {recentSearches.length > 0 ? (
                            historyEnabled ? recentSearches.slice(0, 5).map((term) => (
                                <List.Item
                                    key={term}
                                    title={term}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Buscar novamente por: ${term}`}
                                    onPress={() => handleSelectSuggestion(term)}
                                    left={(props) => <List.Icon {...props} icon="history" />}
                                    right={(props) => (
                                        <IconButton
                                            {...props}
                                            icon="close"
                                            accessibilityLabel={`Remover termo ${term} do histórico`}
                                            onPress={() => void handleRemoveSearch(term)}
                                        />
                                    )}
                                />
                            )) : (
                                <List.Item title="Histórico desativado" disabled />
                            )
                        ) : (
                            <List.Item title="Nenhuma busca recente" disabled />
                        )}
                    </View>
                )}
            </View>

            <FlatList
                testID="ofertas-list"
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                data={dataWithChips as any}
                renderItem={({ item }: { item: any }) => {
                    if (item === CHIPS_SENTINEL) {
                        return renderAppliedChips();
                    }
                    return <OfferCard item={item as OfertaServico} />;
                }}
                keyExtractor={(item: any) => item === CHIPS_SENTINEL ? 'chips-header' : keyExtractor(item)}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.4}
                contentContainerStyle={styles.list}
                ListHeaderComponent={!isSearchFocused ? renderFiltersHeader : undefined}
                stickyHeaderIndices={isSearchFocused ? [] : (hasAppliedFilters ? [1] : [])}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={false}
                ListFooterComponent={
                    isSearchFocused
                        ? null
                        : (
                            isLoadingMore
                                ? (
                                    <View>
                                        {Array.from({ length: 2 }).map((_, i) => (
                                            <SkeletonCard key={`skel-more-${i}`} />
                                        ))}
                                    </View>
                                )
                                : (
                                    isInitialOrRefreshing
                                        ? (
                                            <View>
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <SkeletonCard key={`skel-${i}`} />
                                                ))}
                                            </View>
                                        )
                                        : (ofertas.length === 0 ? renderEmpty() : null)
                                )
                        )
                }
            />

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
                    testID="fab-criar-oferta"
                    icon="plus"
                    label="Criar Oferta"
                    onPress={onPressCriarOferta}
                    style={styles.fab}
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
    searchContainer: {
        backgroundColor: colors.background,
    },
    suggestionsCard: {
        marginHorizontal: spacing.md,
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
    stickyChipsContainer: {
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
        // elevar levemente para sobrepor cartões ao fixar
        zIndex: 1,
    },
    appliedChip: {
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
        minHeight: 44,
        paddingHorizontal: spacing.xs,
    },
    modalContainer: {
        backgroundColor: colors.background,
        margin: spacing.md,
        borderRadius: radius.xl,
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
        elevation: elevation.level1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        elevation: elevation.level3,
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
    // Aumenta a área de toque dos botões pequenos (acessibilidade)
    touchTargetButton: {
        height: 44,
        paddingHorizontal: spacing.sm,
    },
});

export default BuscarOfertasScreen;

