import { User } from '@/types';
import { validateCPF } from '../cpf';

/**
 * Representa um item individual no checklist de conclusão de perfil.
 */
export type ChecklistItem = {
  id: ChecklistTarget;
  title: string;
  isComplete: boolean;
};

export type ChecklistTarget =
  | 'avatar'
  | 'phone'
  | 'location'
  | 'cpf'
  | 'cnpj'
  | 'razaoSocial'
  | 'nomeFantasia';

/**
 * Gera dinamicamente a lista de itens do checklist de completar perfil com base nos dados atuais do usuário.
 * 
 * Esta função avalia campos específicos do modelo `User` para determinar o que ainda falta
 * preencher, adaptando os requisitos conforme o tipo de conta (Pessoa Física ou Jurídica).
 * 
 * @param {User} user - O objeto de usuário contendo os dados atuais do perfil.
 * @returns {ChecklistItem[]} Uma lista de objetos `ChecklistItem` representando os passos pendentes ou concluídos.
 */
export function getProfileChecklistItems(user: User): ChecklistItem[] {
  // Verificações de preenchimento para campos básicos de contato e identificação visual
  const hasAvatar = typeof user.avatar === 'string' && user.avatar.trim().length > 0;
  const hasPhone = typeof user.telefone === 'string' && user.telefone.trim().length > 0;
  
  // Validação de localização: requer presença do objeto localizacao e preenchimento de cidade/estado
  const hasLocation = Boolean(
    user.localizacao &&
      typeof user.localizacao.cidade === 'string' &&
      user.localizacao.cidade.trim().length > 0 &&
      typeof user.localizacao.estado === 'string' &&
      user.localizacao.estado.trim().length > 0,
  );

  // Identificação do tipo de conta para definição de regras de negócio específicas
  const isPF = user.tipoPessoa === 'PF';
  const isPJ = user.tipoPessoa === 'PJ';
  
  // Validação de documentos: CPF usa algoritmo real, CNPJ verifica apenas tamanho
  const hasCPF = typeof user.cpf === 'string' && validateCPF(user.cpf);
  const hasCNPJ = typeof user.cnpj === 'string' && user.cnpj.replace(/\D/g, '').length >= 14;
  
  // Verificações de campos exclusivos para contas empresariais (PJ)
  const hasRazaoSocial = typeof user.razaoSocial === 'string' && user.razaoSocial.trim().length > 0;
  const hasNomeFantasia = typeof user.nomeFantasia === 'string' && user.nomeFantasia.trim().length > 0;

  /**
   * Lista base de itens comum a todos os tipos de usuários.
   */
  const items: ChecklistItem[] = [
    { id: 'avatar', title: 'Adicionar foto de perfil', isComplete: hasAvatar },
    { id: 'phone', title: 'Adicionar telefone', isComplete: hasPhone },
    { id: 'location', title: 'Adicionar localização', isComplete: hasLocation },
  ];

  /**
   * Lógica de inserção de itens condicionais:
   * Usuários PF precisam preencher o CPF.
   * Usuários PJ precisam preencher CNPJ, Razão Social e Nome Fantasia.
   */
  if (isPF) {
    items.push({ id: 'cpf', title: 'Adicionar CPF', isComplete: hasCPF });
  } else if (isPJ) {
    items.push({ id: 'cnpj', title: 'Adicionar CNPJ', isComplete: hasCNPJ });
    items.push({ id: 'razaoSocial', title: 'Adicionar Razão Social', isComplete: hasRazaoSocial });
    items.push({ id: 'nomeFantasia', title: 'Adicionar Nome Fantasia', isComplete: hasNomeFantasia });
  }

  return items;
}
