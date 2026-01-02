import { User } from '@/types';

/**
 * Representa um item individual no checklist de conclusão de perfil.
 */
export type ChecklistItem = {
  /** Identificador único do item (ex: 'avatar', 'phone') */
  id: string;
  /** Título descritivo da ação necessária exibido para o usuário */
  title: string;
  /** Indica se o requisito já foi preenchido pelo usuário com dados válidos */
  isComplete: boolean;
  /** Função disparada ao interagir com o item para realizar a ação necessária */
  onPress: () => void;
};

/**
 * Gera dinamicamente a lista de itens do checklist de completar perfil com base nos dados atuais do usuário.
 * 
 * Esta função avalia campos específicos do modelo `User` para determinar o que ainda falta
 * preencher, adaptando os requisitos conforme o tipo de conta (Pessoa Física ou Jurídica).
 * 
 * @param {User} user - O objeto de usuário contendo os dados atuais do perfil.
 * @param {Function} [navigate] - Função opcional de navegação para redirecionar o usuário às telas de edição.
 * @returns {ChecklistItem[]} Uma lista de objetos `ChecklistItem` representando os passos pendentes ou concluídos.
 */
export function getProfileChecklistItems(user: User, navigate?: (route: string) => void): ChecklistItem[] {
  /**
   * Helper interno para encapsular a lógica de navegação.
   * Caso a função navigate não seja provida, realiza um log para propósitos de depuração.
   */
  const go = (route: string) => () => {
    // Só executa a navegação real se a rota não for um placeholder
    if (typeof navigate === 'function' && !route.includes('Placeholder')) {
      navigate(route);
    } else {
      console.log('Ação de navegação (simulada ou placeholder):', route);
    }
  };

  // Verificações de preenchimento para campos básicos de contato e identificação visual
  const hasAvatar = typeof user.avatar === 'string' && user.avatar.trim().length > 0;
  const hasPhone = typeof user.telefone === 'string' && user.telefone.trim().length > 0;
  
  // Validação de localização: requer presença do objeto localizacao e preenchimento de cidade/estado
  const hasLocation = Boolean(
    user.localizacao &&
      user.localizacao.cidade.trim().length > 0 &&
      user.localizacao.estado.trim().length > 0,
  );

  // Identificação do tipo de conta para definição de regras de negócio específicas
  const isPF = user.tipoPessoa === 'PF';
  const isPJ = user.tipoPessoa === 'PJ';
  
  // Validação simplificada de documentos: verifica se possuem a quantidade mínima de dígitos numéricos
  const hasCPF = typeof user.cpf === 'string' && user.cpf.replace(/\D/g, '').length >= 11;
  const hasCNPJ = typeof user.cnpj === 'string' && user.cnpj.replace(/\D/g, '').length >= 14;
  
  // Verificações de campos exclusivos para contas empresariais (PJ)
  const hasRazaoSocial = typeof user.razaoSocial === 'string' && user.razaoSocial.trim().length > 0;
  const hasNomeFantasia = typeof user.nomeFantasia === 'string' && user.nomeFantasia.trim().length > 0;

  /**
   * Lista base de itens comum a todos os tipos de usuários.
   */
  const items: ChecklistItem[] = [
    {
      id: 'avatar',
      title: 'Adicionar foto de perfil',
      isComplete: hasAvatar,
      onPress: go('EditProfile'),
    },
    {
      id: 'phone',
      title: 'Adicionar telefone',
      isComplete: hasPhone,
      onPress: go('EditProfile'),
    },
    {
      id: 'location',
      title: 'Adicionar localização',
      isComplete: hasLocation,
      onPress: go('ProfileEditLocationPlaceholder'),
    },
  ];

  /**
   * Lógica de inserção de itens condicionais:
   * Usuários PF precisam preencher o CPF.
   * Usuários PJ precisam preencher CNPJ, Razão Social e Nome Fantasia.
   */
  if (isPF) {
    items.push({
      id: 'cpf',
      title: 'Adicionar CPF',
      isComplete: hasCPF,
      onPress: go('ProfileEditCpfPlaceholder'),
    });
  } else if (isPJ) {
    items.push({
      id: 'cnpj',
      title: 'Adicionar CNPJ',
      isComplete: hasCNPJ,
      onPress: go('ProfileEditCnpjPlaceholder'),
    });
    items.push({
      id: 'razaoSocial',
      title: 'Adicionar Razão Social',
      isComplete: hasRazaoSocial,
      onPress: go('ProfileEditRazaoSocialPlaceholder'),
    });
    items.push({
      id: 'nomeFantasia',
      title: 'Adicionar Nome Fantasia',
      isComplete: hasNomeFantasia,
      onPress: go('ProfileEditNomeFantasiaPlaceholder'),
    });
  }

  return items;
}
