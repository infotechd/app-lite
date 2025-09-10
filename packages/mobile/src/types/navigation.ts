import { NavigatorScreenParams } from '@react-navigation/native';
import { OfertaServico } from './oferta';

export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Ofertas: NavigatorScreenParams<OfertasStackParamList>;
    Agenda: undefined;
    Chat: undefined;
    Comunidade: undefined;
    Perfil: NavigatorScreenParams<ProfileStackParamList>;
};

export type OfertasStackParamList = {
    BuscarOfertas: undefined;
    OfferDetail: { oferta: OfertaServico };
    CreateOferta: undefined;
    EditOferta: { oferta: OfertaServico };
};

export type ProfileStackParamList = {
    ProfileHome: undefined;
    Settings: undefined;
    Notifications: undefined;
};