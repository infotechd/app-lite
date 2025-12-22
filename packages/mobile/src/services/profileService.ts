import api from './api';

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
export async function uploadAvatar(file: AvatarFile): Promise<any> {
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
  
  return data?.data ?? data;
}

/**
 * Remove o avatar do usuário autenticado.
 * 
 * @async
 * @function removeAvatar
 * @returns {Promise<any>} Dados do usuário atualizados.
 */
export async function removeAvatar(): Promise<any> {
  const { data } = await api.delete('/v1/users/me/avatar');
  return data?.data ?? data;
}

export default { uploadAvatar, removeAvatar };
