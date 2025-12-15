/**
 * Tipos utilitários relacionados a mídia (imagens e vídeos) usados no app mobile.
 *
 * Este módulo define os tipos básicos para representar arquivos de mídia
 * selecionados ou capturados, e é utilizado por componentes como MediaPreview,
 * VideoPlayer, telas de criação/edição de oferta e serviços de upload.
 */
/**
 * Representa os tipos de mídia suportados pela aplicação.
 *
 * Use 'image' para fotos/imagens estáticas e 'video' para arquivos de vídeo.
 * Esse tipo é referenciado em diversos pontos da aplicação para determinar
 * o tratamento adequado (renderização, pré-visualização e upload).
 *
 * @example
 * const tipo: MediaType = 'image';
 */
export type MediaType = 'image' | 'video';

/**
 * Modelo de dados para um arquivo de mídia selecionado ou capturado.
 *
 * Normalmente retornado pelo hook `useMediaPicker` e propagado para as telas
 * de criação/edição de oferta, componentes de pré-visualização e serviço de upload.
 *
 * Convenções:
 * - uri: deve ser uma URI válida (ex.: file://, content:// ou http(s)://) consumível pelo React Native.
 * - type: restringe-se aos valores definidos em {@link MediaType}.
 * - name: nome do arquivo com extensão, utilizado em uploads e logs.
 *
 * @example
 * const foto: MediaFile = {
 *   uri: 'file:///caminho/para/imagem.jpg',
 *   type: 'image',
 *   name: 'imagem.jpg',
 * };
 */
export interface MediaFile {
    /** URI absoluta ou relativa apontando para o recurso de mídia. */
    uri: string;
    /** Tipo da mídia, restringido a 'image' ou 'video'. */
    type: MediaType;
    /** Nome legível do arquivo (de preferência com extensão). */
    name: string;
}

