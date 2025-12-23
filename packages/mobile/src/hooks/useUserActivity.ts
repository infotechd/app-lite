import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Tipos de atividades suportadas
export type ActivityType = 'new_post' | 'sale_completed' | 'rating_received';

export interface ActivityBase {
  id: string; // id único e estável
  type: ActivityType;
  title: string;
  date: string; // ISO string
}

export interface NewPostActivity extends ActivityBase {
  type: 'new_post';
  thumbnailUrl: string;
  thumbnailBlurhash?: string;
}

export interface SaleCompletedActivity extends ActivityBase {
  type: 'sale_completed';
  productName: string;
  amount: number; // em reais
}

export interface RatingReceivedActivity extends ActivityBase {
  type: 'rating_received';
  rating: number; // 1..5
}

export type Activity = NewPostActivity | SaleCompletedActivity | RatingReceivedActivity;

// ---------------------- Mock de API Paginada ----------------------

// Gera um conjunto grande e estável de dados mockados por usuário.
function createMockActivities(userId: string, total: number): Activity[] {
  const items: Activity[] = [];
  const now = Date.now();
  for (let i = 0; i < total; i++) {
    const kind = i % 3; // alterna entre 3 tipos
    const id = `${userId}-act-${i + 1}`;
    const date = new Date(now - i * 1000 * 60 * 60).toISOString();
    if (kind === 0) {
      items.push({
        id,
        type: 'new_post',
        title: `Novo post #${i + 1}`,
        date,
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(id)}/400/240`,
        thumbnailBlurhash: 'L6PZfSi_.AyE_3t7t7R**j_3mWj?', // Mock blurhash
      });
    } else if (kind === 1) {
      const amount = parseFloat((((i + 1) * 7.95) % 999).toFixed(2));
      items.push({
        id,
        type: 'sale_completed',
        title: `Venda concluída #${i + 1}`,
        date,
        productName: `Produto ${((i % 12) + 1).toString().padStart(2, '0')}`,
        amount,
      });
    } else {
      items.push({
        id,
        type: 'rating_received',
        title: `Avaliação recebida #${i + 1}`,
        date,
        rating: (i % 5) + 1,
      });
    }
  }
  return items;
}

// Cache de mocks por usuário para estabilidade entre renders
const MOCK_CACHE: Record<string, Activity[]> = {};

type FetchParams = { userId: string; page: number; limit: number };
type FetchResult = { data: Activity[]; hasNextPage: boolean };

async function mockFetchActivities({ userId, page, limit }: FetchParams): Promise<FetchResult> {
  // evita delay em ambiente de teste
  const isTest = (globalThis as any)?.__TEST__ === true;
  if (!isTest) {
    await new Promise((r) => setTimeout(r, 350));
  }

  if (!MOCK_CACHE[userId]) {
    // Gera 120 itens para garantir volume e paginação
    MOCK_CACHE[userId] = createMockActivities(userId, 120);
  }
  const start = page * limit;
  const end = start + limit;
  const slice = MOCK_CACHE[userId].slice(start, end);
  const hasNextPage = end < MOCK_CACHE[userId].length;

  // Simula erro eventual (pequena probabilidade), exceto em teste
  if (!isTest) {
    const shouldFail = Math.random() < 0.05; // 5% de chance de falha
    if (shouldFail) {
      throw new Error('Network error (simulado)');
    }
  }

  return { data: slice, hasNextPage };
}

// ---------------------- Hook ----------------------

export function useUserActivity(userId: string, pageSize: number = 20) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);

  const pageRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const fetchingRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadInitial = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setIsError(false);
    try {
      pageRef.current = 0;
      const { data, hasNextPage } = await mockFetchActivities({ userId, page: 0, limit: pageSize });
      if (!mountedRef.current) return;
      setActivities(data);
      setHasNextPage(hasNextPage);
    } catch (e) {
      if (!mountedRef.current) return;
      setIsError(true);
      setActivities([]);
      setHasNextPage(false);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [pageSize, userId]);

  const fetchNextPage = useCallback(async () => {
    if (isLoading || isRefreshing || isFetchingNextPage) return;
    if (!hasNextPage) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsFetchingNextPage(true);
    setIsError(false);
    try {
      const nextPage = pageRef.current + 1;
      const { data, hasNextPage: nextHas } = await mockFetchActivities({
        userId,
        page: nextPage,
        limit: pageSize,
      });
      if (!mountedRef.current) return;
      setActivities((prev) => [...prev, ...data]);
      setHasNextPage(nextHas);
      pageRef.current = nextPage;
    } catch (e) {
      if (!mountedRef.current) return;
      // Considera erro de próxima página como recuperável: mantém dados atuais e apenas sinaliza erro brevemente
      setIsError(true);
    } finally {
      if (mountedRef.current) setIsFetchingNextPage(false);
      fetchingRef.current = false;
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, isRefreshing, pageSize, userId]);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsRefreshing(true);
    setIsError(false);
    try {
      const { data, hasNextPage } = await mockFetchActivities({ userId, page: 0, limit: pageSize });
      if (!mountedRef.current) return;
      setActivities(data);
      setHasNextPage(hasNextPage);
      pageRef.current = 0;
    } catch (e) {
      if (!mountedRef.current) return;
      setIsError(true);
      // Mantém dados anteriores em caso de erro no refresh
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
      fetchingRef.current = false;
    }
  }, [pageSize, userId]);

  // Carregamento inicial
  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return useMemo(
    () => ({
      activities,
      isLoading,
      isRefreshing,
      isFetchingNextPage,
      isError,
      hasNextPage,
      fetchNextPage,
      refresh,
    }),
    [activities, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, isRefreshing, refresh],
  );
}

export default useUserActivity;
