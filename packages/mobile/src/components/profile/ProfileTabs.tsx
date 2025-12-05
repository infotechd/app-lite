// packages/mobile/src/components/profile/ProfileTabs.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text } from 'react-native';
import { colors } from '@/styles/theme';

// Mock screens for demonstration
const PostsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Publicações do usuário</Text>
  </View>
);
const ReviewsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Avaliações recebidas</Text>
  </View>
);
const ProductsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Produtos à venda</Text>
  </View>
);

const Tab = createMaterialTopTabNavigator();

const ProfileTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIndicatorStyle: { backgroundColor: colors.primary },
        tabBarLabelStyle: { textTransform: 'none', fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="Posts"
        component={PostsScreen}
        options={{
          tabBarLabel: 'Publicações',
          tabBarAccessibilityLabel: 'Publicações, aba 1 de 3',
        }}
      />
      <Tab.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{
          tabBarLabel: 'Avaliações',
          tabBarAccessibilityLabel: 'Avaliações, aba 2 de 3',
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: 'Produtos',
          tabBarAccessibilityLabel: 'Produtos, aba 3 de 3',
        }}
      />
    </Tab.Navigator>
  );
};

export default ProfileTabs;

