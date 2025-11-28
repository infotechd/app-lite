// packages/mobile/src/utils/profile/getProfileChecklistItems.ts
import { User } from '@/types';

export type ChecklistItem = {
  id: string;
  title: string;
  isComplete: boolean;
  onPress: () => void;
};

/**
 * Gera a lista de itens do checklist de completar perfil com base no modelo atual de User.
 * Obs.: As ações são placeholders (console.log) até integração com telas reais.
 */
export function getProfileChecklistItems(user: User, navigate?: (route: string) => void): ChecklistItem[] {
  const go = (route: string) => () => {
    if (typeof navigate === 'function') navigate(route);
    else console.log('navigate:', route);
  };

  const hasAvatar = typeof user.avatar === 'string' && user.avatar.trim().length > 0;
  const hasPhone = typeof user.telefone === 'string' && user.telefone.trim().length > 0;
  const hasLocation = Boolean(
    user.localizacao &&
      typeof user.localizacao.cidade === 'string' && user.localizacao.cidade.trim().length > 0 &&
      typeof user.localizacao.estado === 'string' && user.localizacao.estado.trim().length > 0,
  );

  const isPF = user.tipoPessoa === 'PF';
  const isPJ = user.tipoPessoa === 'PJ';
  const hasCPF = typeof user.cpf === 'string' && user.cpf.replace(/\D/g, '').length >= 11;
  const hasCNPJ = typeof user.cnpj === 'string' && user.cnpj.replace(/\D/g, '').length >= 14;
  const hasRazaoSocial = typeof user.razaoSocial === 'string' && user.razaoSocial.trim().length > 0;
  const hasNomeFantasia = typeof user.nomeFantasia === 'string' && user.nomeFantasia.trim().length > 0;

  const items: ChecklistItem[] = [
    {
      id: 'avatar',
      title: 'Adicionar foto de perfil',
      isComplete: hasAvatar,
      onPress: go('ProfileAddPhotoPlaceholder'),
    },
    {
      id: 'phone',
      title: 'Adicionar telefone',
      isComplete: hasPhone,
      onPress: go('ProfileEditPhonePlaceholder'),
    },
    {
      id: 'location',
      title: 'Adicionar localização',
      isComplete: hasLocation,
      onPress: go('ProfileEditLocationPlaceholder'),
    },
  ];

  // Documento conforme tipo de pessoa
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
