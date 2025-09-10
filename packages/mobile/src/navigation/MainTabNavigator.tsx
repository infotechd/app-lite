import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
type IconName = React.ComponentProps<typeof Icon>['name'];
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuscarOfertasScreen from '../screens/app/BuscarOfertasScreen';
import AgendaScreen from '../screens/app/AgendaScreen';
import ChatScreen from '../screens/app/ChatScreen';
import CommunityScreen from '../screens/app/CommunityScreen';
import ProfileNavigator from './ProfileNavigator';
import { MainTabParamList, OfertasStackParamList } from '@/types';
import { colors } from '@/styles/theme';
import CriarOfertaScreen from '@/screens/app/CriarOfertaScreen';
import OfertaDetalheScreen from '@/screens/app/OfertaDetalheScreen';
import RequireAuth from '@/navigation/guards/RequireAuth';

const Tab = createBottomTabNavigator<MainTabParamList>();
const OfertasStack = createNativeStackNavigator<OfertasStackParamList>();

const OfertasNavigator = () => (
    <OfertasStack.Navigator>
        <OfertasStack.Screen
            name="BuscarOfertas"
            component={BuscarOfertasScreen}
            options={{ title: 'Buscar Serviços' }}
        />
        <OfertasStack.Screen
            name="CreateOferta"
            options={{ title: 'Criar Oferta' }}
            children={(props) => (
                <RequireAuth>
                    <CriarOfertaScreen {...props} />
                </RequireAuth>
            )}
        />
        <OfertasStack.Screen
            name="OfferDetail"
            component={OfertaDetalheScreen}
            options={{ title: 'Detalhe da Oferta' }}
        />
        <OfertasStack.Screen
            name="EditOferta"
            options={{ title: 'Editar Oferta' }}
            children={(props) => (
                <RequireAuth>
                    {React.createElement(require('@/screens/app/EditarOfertaScreen').default, props)}
                </RequireAuth>
            )}
        />
    </OfertasStack.Navigator>
);

const MainTabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            initialRouteName="Ofertas"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: IconName;

                    switch (route.name) {
                        case 'Ofertas':
                            iconName = focused ? 'store' : 'store-outline';
                            break;
                        case 'Agenda':
                            iconName = focused ? 'calendar' : 'calendar-outline';
                            break;
                        case 'Chat':
                            iconName = focused ? 'chat' : 'chat-outline';
                            break;
                        case 'Comunidade':
                            iconName = focused ? 'account-group' : 'account-group-outline';
                            break;
                        case 'Perfil':
                            iconName = focused ? 'account' : 'account-outline';
                            break;
                        default:
                            iconName = 'help-circle';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                headerShown: false,
            })}
        >
            <Tab.Screen name="Ofertas" component={OfertasNavigator} />
            <Tab.Screen name="Agenda" component={AgendaScreen} />
            <Tab.Screen name="Chat" component={ChatScreen} />
            <Tab.Screen name="Comunidade" component={CommunityScreen} />
            <Tab.Screen name="Perfil" component={ProfileNavigator} />
        </Tab.Navigator>
    );
};

export default MainTabNavigator;