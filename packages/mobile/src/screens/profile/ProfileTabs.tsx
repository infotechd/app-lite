import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/styles/theme';

// Abas
import ActivityTab from './tabs/ActivityTab';
import AboutTab from './tabs/AboutTab';
import ReviewsTab from './tabs/ReviewsTab';
import AchievementsTab from './tabs/AchievementsTab';

type Route = { key: string; title: string };

interface Props {
  isLoading?: boolean;
}

const ProfileTabs: React.FC<Props> = ({ isLoading }) => {
  const layout = useWindowDimensions();
  const { user } = useAuth();
  const hasReviews = ((user as any)?.avaliacao !== undefined)
    || ((user as any)?.avaliacoes !== undefined)
    || ((user as any)?.reviews !== undefined);

  const routes: Route[] = [
    { key: 'activity', title: 'Atividade' },
    { key: 'about', title: 'Sobre' },
    ...(hasReviews ? [{ key: 'reviews', title: 'Avaliações' } as Route] : []),
    { key: 'achievements', title: 'Conquistas' },
  ];

  const [index, setIndex] = React.useState(0);

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

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      scrollEnabled={props.navigationState.routes.length > 3}
      indicatorStyle={{ backgroundColor: colors.primary }}
      style={{ backgroundColor: colors.surface }}
    />
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
    />
  );
};

export default ProfileTabs;
