import { NavigatorScreenParams } from '@react-navigation/native';
import { OfertaServico } from './oferta';

/**
 * Define os parâmetros das rotas para o navegador de pilha raiz (Root Stack).
 */
export type RootStackParamList = {
    /** Rota para o fluxo de autenticação */
    Auth: NavigatorScreenParams<AuthStackParamList>;
    /** Rota para o fluxo principal do aplicativo (Tabs) */
    Main: NavigatorScreenParams<MainTabParamList>;
};

/**
 * Define os parâmetros das rotas para o fluxo de autenticação.
 */
export type AuthStackParamList = {
    /** Tela de login inicial */
    Login: undefined;
    /** Tela para cadastro de novo usuário */
    Register: undefined;
    /** Tela para solicitação de recuperação de senha (envio de e-mail) */
    ForgotPassword: undefined;
    /** 
     * Tela para redefinição de senha após receber o token.
     * @property {string} email - E-mail do usuário (opcional)
     * @property {string} token - Token de validação enviado por e-mail (opcional)
     */
    ResetPassword: { email?: string; token?: string } | undefined;
};

/**
 * Define os parâmetros das rotas para o navegador de abas (Tabs) principal.
 */
export type MainTabParamList = {
    /** Aba de Ofertas, contendo sua própria pilha de navegação */
    Ofertas: NavigatorScreenParams<OfertasStackParamList>;
    /** Aba da agenda de compromissos */
    Agenda: undefined;
    /** Aba de chat para comunicação entre usuários */
    Chat: undefined;
    /** Aba da comunidade/feed social */
    Comunidade: undefined;
    /** Aba de perfil do usuário, contendo sua própria pilha de navegação */
    Perfil: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Define os parâmetros das rotas para a pilha de navegação de Ofertas.
 */
export type OfertasStackParamList = {
    /** Tela principal de busca e filtragem de ofertas */
    BuscarOfertas: undefined;
    /** 
     * Tela de detalhes de uma oferta específica.
     * @property {OfertaServico} oferta - Objeto com os dados completos da oferta
     */
    OfferDetail: { oferta: OfertaServico };
    /** Tela para criação de uma nova oferta de serviço */
    CreateOferta: undefined;
    /** 
     * Tela para edição de uma oferta de serviço existente.
     * @property {OfertaServico} oferta - Objeto com os dados da oferta a ser editada
     */
    EditOferta: { oferta: OfertaServico };
};

/**
 * Define os parâmetros das rotas para a pilha de navegação do Perfil.
 */
export type ProfileStackParamList = {
    /** Tela inicial do perfil com informações do usuário */
    ProfileHome: undefined;
    /** Tela de configurações gerais da conta/aplicativo */
    Settings: undefined;
    /** Tela de gerenciamento e visualização de notificações */
    Notifications: undefined;
    /** Tela para edição dos dados cadastrais do perfil */
    EditProfile: undefined;
    /** Tela para alteração de senha (dentro da área logada) */
    ChangePassword: undefined;
};