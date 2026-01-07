import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/styles/theme';
import AnalyticsService from '@/services/AnalyticsService';

// Abas
import ActivityTab from './tabs/ActivityTab';
import AboutTab from './tabs/AboutTab';
import ReviewsTab from './tabs/ReviewsTab';
import AchievementsTab from './tabs/AchievementsTab';

type Route = { key: string; title: string };

/**
 * Interface que define as propriedades para o componente ProfileTabs.
 *
 * @interface Props
 * @property {boolean} [isLoading] - Indica se o conteúdo das abas deve exibir um estado de carregamento.
 */
interface Props {
  isLoading?: boolean;
}

/**
 * Componente que gerencia e renderiza o sistema de abas na tela de perfil.
 * Inclui abas para Atividade, Sobre, Avaliações (condicional) e Conquistas.
 *
 * @component
 * @param {Props} props - Propriedades passadas ao componente.
 * @returns {JSX.Element} O componente de abas renderizado.
 */
const ProfileTabs: React.FC<Props> = ({ isLoading }) => {
  // Obtém as dimensões da janela para o layout inicial do TabView
  const layout = useWindowDimensions();
  // Obtém informações do usuário autenticado para decidir quais abas exibir
  const { user } = useAuth();
  
  // Verifica se o usuário possui avaliações cadastradas (em diferentes formatos possíveis de API)
  const hasReviews = ((user as any)?.avaliacao !== undefined)
    || ((user as any)?.avaliacoes !== undefined)
    || ((user as any)?.reviews !== undefined);

  // Configuração das rotas (abas) disponíveis
  const routes: Route[] = [
    { key: 'activity', title: 'Atividade' },
    { key: 'about', title: 'Sobre' },
    // Adiciona a aba de avaliações apenas se o usuário as possuir
    ...(hasReviews ? [{ key: 'reviews', title: 'Avaliações' } as Route] : []),
    { key: 'achievements', title: 'Conquistas' },
  ];

  // Estado que controla o índice da aba atualmente selecionada
  const [index, setIndex] = React.useState(0);

  /**
   * Renderiza o conteúdo correspondente a cada aba baseando-se na chave da rota.
   *
   * @param {object} param0 - Objeto contendo a rota atual.
   * @returns {JSX.Element} O componente da aba correspondente.
   */
  const renderScene = ({ route }: { route: Route }) => {
    switch (route.key) {
      case 'activity':
        return <ActivityTab isLoading={isLoading} />;
      case 'about':
        return <AboutTab />;
      case 'reviews':
        return <ReviewsTab />;
      case 'achievements':
        return <AchievementsTab />;
      default:
        return <View />;
    }
  };

  /**
   * Renderiza a barra de abas personalizada.
   *
   * @param {any} props - Propriedades fornecidas pelo TabView para o TabBar.
   * @returns {JSX.Element} O componente da barra de abas.
   */
  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      // Ativa scroll se houverem muitas abas para evitar quebra de layout
      scrollEnabled={props.navigationState.routes.length > 3}
      indicatorStyle={{ backgroundColor: colors.primary }}
      style={{ backgroundColor: colors.surface }}
    />
  );

  /**
   * Manipula a mudança de índice (troca de aba) e dispara evento de analytics.
   *
   * @param {number} newIndex - O novo índice da aba selecionada.
   */
  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex);
    const currentRoute = routes[newIndex];
    // Formata o nome da aba para o padrão de rastreamento (lowercase e snake_case)
    const tab_name = currentRoute?.key?.toString().replace(/\s+/g, '_').toLowerCase();
    if (tab_name) {
      // Rastreia o evento de troca de aba no serviço de analytics
      AnalyticsService.track('profile_tab_change', { tab_name });
    }
  };

  return (
    <TabView
      style={{ flex: 1 }}
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={handleIndexChange}
      initialLayout={{ width: layout.width }}
    />
  );
};

export default ProfileTabs;
