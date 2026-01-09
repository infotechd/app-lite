import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/types';

/**
 * Propriedades de navegação para o stack de perfil.
 */
type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

/**
 * Possíveis alvos (itens) do checklist que podem ser navegados.
 */
type ChecklistTarget =
  | 'avatar'
  | 'phone'
  | 'location'
  | 'cpf'
  | 'cnpj'
  | 'razaoSocial'
  | 'nomeFantasia';

/**
 * Hook personalizado para centralizar a lógica de navegação do checklist de perfil.
 * Este hook facilita o redirecionamento do usuário para a tela de edição correta
 * com base no item do checklist selecionado.
 *
 * @returns Um objeto contendo a função `navigateTo`.
 */
export function useChecklistNavigation() {
  /** Instância do hook de navegação com tipagem específica do stack de perfil. */
  const navigation = useNavigation<NavigationProp>();

  /**
   * Navega para a tela correspondente ao item do checklist fornecido.
   * Utiliza um switch para mapear cada itemId para sua respectiva rota e parâmetros.
   *
   * @param itemId - O identificador do item do checklist selecionado.
   * @returns void
   */
  const navigateTo = (itemId: ChecklistTarget) => {
    switch (itemId) {
      case 'cpf':
        // Redireciona para a tela de edição de documento configurada para CPF
        navigation.navigate('EditProfileDocument', { type: 'CPF' });
        return;
      case 'cnpj':
        // Redireciona para a tela de edição de documento configurada para CNPJ
        navigation.navigate('EditProfileDocument', { type: 'CNPJ' });
        return;
      case 'razaoSocial':
      case 'nomeFantasia':
        // Redireciona para a tela de informações empresariais
        navigation.navigate('EditProfileCompany');
        return;
      case 'avatar':
      case 'phone':
      case 'location':
        // Redireciona para a tela de edição de perfil (dados básicos e localização)
        navigation.navigate('EditProfile');
        return;
      default:
        // Caso o item não esteja mapeado, exibe um alerta de desenvolvimento
        console.warn('Rota não mapeada para item do checklist:', itemId);
    }
  };

  return { navigateTo };
}

export default useChecklistNavigation;

