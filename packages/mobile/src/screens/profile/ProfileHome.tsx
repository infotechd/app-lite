import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/styles/theme';
import GuestProfileView from './GuestProfileView';
import UserProfileView from './UserProfileView';

/**
 * Componente principal da tela de Perfil.
 * Atua como um contêiner que decide se deve exibir a visão de usuário autenticado
 * ou a visão de visitante (guest), além de gerenciar um estado global de carregamento
 * para a tela.
 *
 * @component
 * @returns {JSX.Element} O componente renderizado da tela de Perfil.
 */
const ProfileHome: React.FC = () => {
  // Hook de autenticação para verificar se o usuário está logado
  const { isAuthenticated } = useAuth();
  
  // Estado que indica se a tela está em processo de carregamento inicial
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado auxiliar para controlar a exibição do skeleton.
  // Usado para evitar o efeito de "flicker" (piscada) em carregamentos muito rápidos.
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    // Agenda a exibição do skeleton após 200ms para evitar que ele apareça em transições instantâneas
    const delay = setTimeout(() => setShowSkeleton(true), 200);
    
    // Simula um tempo de carregamento de 2 segundos para fins de demonstração da UI
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowSkeleton(false);
    }, 2000);
    
    // Limpeza dos timers ao desmontar o componente para evitar vazamentos de memória e erros de estado
    return () => {
      clearTimeout(timer);
      clearTimeout(delay);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 
        Renderização condicional baseada no status de autenticação:
        - Se autenticado: Mostra os detalhes do perfil do usuário com estados de carregamento.
        - Se não autenticado: Mostra a tela de convite para login/registro.
      */}
      {isAuthenticated ? (
        <UserProfileView isLoading={isLoading} showSkeleton={showSkeleton} />
      ) : (
        <GuestProfileView />
      )}
    </View>
  );
};

/**
 * Estilos aplicados ao componente ProfileHome.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
});

export default ProfileHome;
