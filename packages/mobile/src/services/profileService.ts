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
}

/**
 * Remove o avatar do usuário autenticado.
 * 
 * @async
 * @function removeAvatar
 * @returns {Promise<any>} Dados do usuário atualizados.
 */
export async function removeAvatar(): Promise<User> {
  const { data } = await api.delete('/v1/users/me/avatar');
  return normalizeUser(data?.data ?? data);
}

/**
 * Atualiza o nome do usuário autenticado.
 * @param nome Novo nome a ser definido
 * @returns Dados do usuário atualizados.
 */
export async function updateName(nome: string): Promise<User> {
  const { data } = await api.patch('/v1/users/me/nome', { nome });
  return normalizeUser(data?.data ?? data);
}

/**
 * Atualiza o telefone do usuário autenticado.
 * @param telefone Novo telefone a ser definido (formato: (11) 99999-9999)
 * @returns Dados do usuário atualizados.
 */
export async function updatePhone(telefone: string): Promise<User> {
  const { data } = await api.patch('/v1/users/me/telefone', { telefone });
  return normalizeUser(data?.data ?? data);
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
  cpf: u?.cpf ?? undefined,
  cnpj: u?.cnpj ?? undefined,
  razaoSocial: u?.razaoSocial ?? undefined,
  nomeFantasia: u?.nomeFantasia ?? undefined,
  ativo: u?.ativo ?? false,
});

export default { uploadAvatar, removeAvatar, updateName, updatePhone };
