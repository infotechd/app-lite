import api from './api';
import type { User } from '@/types';

/**
 * Estrutura de resposta retornada pela API após o upload bem-sucedido de um avatar.
 */
export type UploadAvatarResponse = {
  /** URL pública e segura para visualização da imagem */
  avatar: string;
  /** Identificador único do recurso no provedor de armazenamento (ex: Cloudinary) */
  avatarPublicId?: string;
  /** Tipo de mídia do arquivo (ex: image/png) */
  mimetype?: string;
  /** Tamanho total do arquivo em bytes */
  size?: number;
};

/**
 * Definição dos dados necessários para representar um arquivo de imagem no mobile.
 */
type AvatarFile = { 
  /** Caminho local da imagem no sistema de arquivos do dispositivo */
  uri: string; 
  /** Tipo MIME do arquivo */
  type: string; 
  /** Nome do arquivo, opcional */
  name?: string 
};

/**
 * Realiza o envio de uma imagem de avatar para o backend.
 * 
 * Constrói um objeto FormData com o arquivo selecionado e executa uma requisição PATCH
 * para o endpoint de usuário, utilizando cabeçalhos específicos para multipart/form-data.
 * 
 * @async
 * @function uploadAvatar
 * @param {AvatarFile} file - O objeto contendo as informações do arquivo de imagem.
 * @returns {Promise<any>} Dados do usuário atualizados.
 */
export async function uploadAvatar(file: AvatarFile): Promise<User> {
  try {
    /** Criação de um formulário multipart para suportar envio de binários via HTTP */
    const form = new FormData();
    
    // Anexa o arquivo ao formulário sob a chave 'avatar'
    form.append('avatar', {
      uri: file.uri,
      type: file.type,
      name: file.name || 'avatar.jpg',
    } as any);

    /** 
     * Execução da chamada de API.
     * Rota atualizada para /v1/users/me/avatar conforme Versão 2.0
     */
    const { data } = await api.patch('/v1/users/me/avatar', form, {
       headers: { 'Content-Type': 'multipart/form-data' },
       timeout: 45000,
     });

     return normalizeUser(data?.data ?? data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao carregar avatar.';
    throw new Error(message);
  }
}

/**
 * Remove o avatar do usuário autenticado.
 * 
 * @async
 * @function removeAvatar
 * @returns {Promise<any>} Dados do usuário atualizados.
 */
export async function removeAvatar(): Promise<User> {
  try {
    const { data } = await api.delete('/v1/users/me/avatar');
    return normalizeUser(data?.data ?? data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao remover avatar.';
    throw new Error(message);
  }
}

/**
 * Atualiza o nome do usuário autenticado.
 * @param nome Novo nome a ser definido
 * @returns Dados do usuário atualizados.
 */
export async function updateName(nome: string): Promise<User> {
  try {
    const { data } = await api.patch('/v1/users/me/nome', { nome });
    return normalizeUser(data?.data ?? data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar nome.';
    throw new Error(message);
  }
}

/**
 * Atualiza o telefone do usuário autenticado.
 * @param telefone Novo telefone a ser definido (formato: (11) 99999-9999)
 * @returns Dados do usuário atualizados.
 */
export async function updatePhone(telefone: string): Promise<User> {
  try {
    const { data } = await api.patch('/v1/users/me/telefone', { telefone });
    return normalizeUser(data?.data ?? data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar telefone.';
    throw new Error(message);
  }
}

/**
 * Atualiza a localização do usuário autenticado.
 * @param cidade Nome da cidade
 * @param estado Sigla do estado (ex: SP)
 * @returns Dados do usuário atualizados.
 */
export async function updateLocation(cidade: string, estado: string): Promise<User> {
  try {
    const { data } = await api.patch('/v1/users/me/localizacao', { cidade, estado });
    return normalizeUser(data?.data ?? data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar localização.';
    throw new Error(message);
  }
}

/**
 * Inicia fluxo de atualização de e-mail (solicita token)
 */
export async function updateEmail(email: string, currentPassword: string): Promise<{ message: string }> {
  try {
    const { data } = await api.patch('/v1/users/me/email', { email, currentPassword });
    return { message: data?.message ?? 'Solicitação registrada. Verifique o novo e-mail.' };
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao solicitar alteração de e-mail.';
    throw new Error(message);
  }
}

/**
 * Confirma alteração de e-mail com token recebido
 */
export async function confirmEmailChange(token: string): Promise<User> {
  try {
    const { data } = await api.post('/v1/users/me/email/confirm', { token });
    return normalizeUser(data?.data ?? data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao confirmar alteração de e-mail.';
    throw new Error(message);
  }
}

/**
 * Altera a senha do usuário autenticado.
 * @param currentPassword Senha atual do usuário
 * @param newPassword Nova senha a ser definida
 * @returns Mensagem de sucesso ou erro
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  try {
    const { data } = await api.post('/v1/users/me/password', { currentPassword, newPassword });
    return { message: data?.message ?? 'Senha alterada com sucesso.' };
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao alterar senha.';
    throw new Error(message);
  }
}

/**
 * Atualiza os dados da empresa do usuário autenticado.
 * @param data Objeto contendo os dados da empresa (razaoSocial, nomeFantasia)
 * @returns Dados do usuário atualizados.
 */
export async function updateCompanyData(data: { razaoSocial: string; nomeFantasia?: string }): Promise<User> {
  try {
    const { data: res } = await api.patch('/v1/users/me/company-data', data);
    return normalizeUser(res?.data ?? res);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar dados da empresa.';
    throw new Error(message);
  }
}

/**
 * Atualiza os documentos do usuário autenticado (CPF e/ou CNPJ).
 * @param data Objeto contendo CPF e/ou CNPJ a serem atualizados
 * @returns Dados do usuário atualizados.
 */
export async function updateDocuments(data: { cpf?: string; cnpj?: string }): Promise<User> {
  try {
    const { data: res } = await api.patch('/v1/users/me/documents', data);
    return normalizeUser(res?.data ?? res);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Erro ao atualizar documentos.';
    throw new Error(message);
  }
}

/**
 * Mapeia o tipo do backend (pt/en) para o tipo usado no app
 */
const toAppTipo = (t: string): User['tipo'] => {
  const v = (t || '').toLowerCase();
  switch (v) {
    case 'comprador':
    case 'buyer':
      return 'buyer';
    case 'prestador':
    case 'provider':
      return 'provider';
    case 'anunciante':
    case 'advertiser':
      return 'advertiser';
    default:
      return 'buyer';
  }
};

/**
 * Normaliza a resposta de usuário do backend para o formato esperado pelo app
 */
const normalizeUser = (u: any): User => ({
  id: String(u?.id ?? u?._id ?? ''),
  nome: String(u?.nome ?? ''),
  email: String(u?.email ?? ''),
  tipo: toAppTipo(u?.tipo ?? ''),
  avatar: u?.avatar ?? undefined,
  avatarBlurhash: u?.avatarBlurhash ?? undefined,
  telefone: u?.telefone ?? undefined,
  localizacao: u?.localizacao ?? undefined,
  avaliacao: u?.avaliacao ?? undefined,
  createdAt: String(u?.createdAt ?? new Date().toISOString()),
  updatedAt: String(u?.updatedAt ?? new Date().toISOString()),
  tipoPessoa: u?.tipoPessoa === 'PJ' ? 'PJ' : 'PF',
  cpf: typeof u?.cpf === 'string' ? u.cpf.replace(/\D/g, '') : undefined,
  cnpj: typeof u?.cnpj === 'string' ? u.cnpj.replace(/\D/g, '') : undefined,
  razaoSocial: u?.razaoSocial ?? undefined,
  nomeFantasia: u?.nomeFantasia ?? undefined,
  ativo: u?.ativo ?? false,
});

const profileService = { uploadAvatar, removeAvatar, updateName, updatePhone, updateLocation, updateEmail, confirmEmailChange, changePassword, updateCompanyData, updateDocuments };

export default profileService;
export { profileService };
