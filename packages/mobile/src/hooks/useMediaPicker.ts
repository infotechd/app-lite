import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { MediaFile } from '@/types/media';

/**
 * Contexto da correção (documentação para futuras manutenções)
 *
 * Problema original:
 * - O hook useMediaPicker retornava `type` como 'image' | 'video' (valor bruto do expo-image-picker).
 * - O schema de validação de oferta (utils/validation.ts -> mediaFileSchema) exige tipos MIME completos
 *   ('image/jpeg', 'image/png', 'video/mp4').
 * - Consequência: ao tentar publicar com mídia, a validação Zod falhava (path típico: `mediaFiles.0.type`).
 *
 * Solução aplicada aqui:
 * - Normalizamos o `type` para MIME no momento do mapeamento dos assets (handleSelection).
 *   • Vídeos: sempre "video/mp4" (único aceito atualmente no schema).
 *   • Imagens: "image/png" quando a extensão indicar PNG; caso contrário, "image/jpeg".
 *
 * Como diagnosticar se o problema voltar a ocorrer:
 * - Verifique mensagens de erro do Zod contendo `Invalid enum value. Expected 'image/jpeg' | 'image/png' | 'video/mp4'`
 *   com path `mediaFiles.<index>.type`.
 * - Confirme se o objeto que chega ao schema possui `type` como 'image'/'video' ao invés de MIME.
 *
 * Débito técnico conhecido:
 * - O tipo local MediaFile (src/types/media.ts) ainda define `type` como 'image' | 'video'. Para manter compatibilidade,
 *   usamos `as any` ao atribuir o MIME. Idealmente devemos unificar os tipos com o schema (utils/validation.ts)
 *   ou centralizar a inferência usando `services/mediaPickerService.ts::inferMime`.
 */

/**
 * Propriedades aceitas pelo hook useMediaPicker.
 *
 * @property onSelect Callback executado quando uma ou mais mídias são selecionadas com sucesso.
 * Recebe a lista de arquivos no formato interno da aplicação (MediaFile[]).
 * @property mediaType Define quais tipos de mídia podem ser selecionados: apenas imagens, apenas vídeos ou ambos (mixed).
 * @property maxFiles Limite máximo de arquivos que podem ser adicionados na seleção atual.
 * @property currentFilesCount Quantidade de arquivos que já estão selecionados antes desta nova seleção.
 */
type UseMediaPickerProps = {
    onSelect: (media: MediaFile[]) => void;
    mediaType?: 'images' | 'videos' | 'mixed';
    maxFiles?: number;
    currentFilesCount?: number;
    videoMaxDuration?: number; // NOVO: duração máxima de vídeo em segundos
};

/**
 * Hook utilitário para seleção de mídia (galeria ou câmera) com controle de permissões
 * e verificação de limite máximo de arquivos. Dá suporte a imagens, vídeos ou ambos.
 *
 * Exemplo de uso básico:
 * const { pickFromGallery, takePhoto } = useMediaPicker({ onSelect: setFiles });
 *
 * @param props Objeto de configuração do hook. Consulte UseMediaPickerProps para detalhes.
 * @returns Um objeto com as funções `pickFromGallery` (abrir galeria) e `takePhoto` (abrir câmera).
 */
export const useMediaPicker = (props: UseMediaPickerProps) => {
    // Desestruturação com valores padrão para facilitar o uso do hook.
    const {
        onSelect,
        mediaType = 'mixed',
        maxFiles = 10,
        currentFilesCount = 0,
        videoMaxDuration = 20, // Padrão de 20 segundos
    } = props;

    /**
     * Converte o tipo de mídia desejado (images, videos ou mixed) para o formato
     * esperado pelo expo-image-picker. A partir do SDK 52, seleção mista requer um array
     * com os tipos: ['images', 'videos'].
     *
     * @param type Tipo de mídia permitido para a seleção.
     * @returns O valor aceito pelo expo-image-picker em `mediaTypes`.
     */
    const determineMediaType = (
        type: 'images' | 'videos' | 'mixed'
    ): ImagePicker.MediaType | ImagePicker.MediaType[] => {
        switch (type) {
            case 'images':
                return 'images';
            case 'videos':
                return 'videos';
            default:
                // Seleção mista exige um array de tipos no expo-image-picker (SDK >= 52)
                return ['images', 'videos'];
        }
    };

    /**
     * Executa a função do picker (galeria ou câmera), trata o resultado e dispara o callback `onSelect`.
     * Também valida o limite máximo de arquivos antes de confirmar a seleção.
     *
     * @param pickerFunction Função que abre a galeria ou a câmera e retorna um ImagePickerResult.
     * @returns Promise resolvida quando a seleção for processada (sem valor de retorno específico).
     */
    const handleSelection = async (
        pickerFunction: () => Promise<ImagePicker.ImagePickerResult>
    ) => {
        const result = await pickerFunction();
        if (!result.canceled) {
            // Converte os assets retornados pelo expo-image-picker para o formato interno (MediaFile)
            const newFiles = result.assets.map((asset): MediaFile => {
                // Inferir MIME type a partir do nome do arquivo ou tipo base do picker
                const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'media-file';
                const ext = fileName.split('.').pop()?.toLowerCase() || '';

                let mimeType: string;
                // Para vídeos, normalizamos para 'video/mp4' (único tipo aceito na validação)
                if (asset.type === 'video' || ext === 'mp4' || ext === 'mov' || ext === 'm4v') {
                    mimeType = 'video/mp4';
                } else if (ext === 'png') {
                    mimeType = 'image/png';
                } else {
                    // Padrão para imagens JPEG quando a extensão não indicar PNG
                    mimeType = 'image/jpeg';
                }

                return {
                    uri: asset.uri,
                    // Agora retornamos MIME type completo para compatibilidade com o schema de validação
                    // Tipagem flexível para manter compatibilidade com o tipo local de MediaFile
                    // IMPORTANTE: Se você remover o `as any` sem alinhar o tipo em src/types/media.ts,
                    // o TypeScript acusará erro. Considere migrar MediaFile.type para MIME ou criar um
                    // discriminador separado (ex.: kind: 'image' | 'video').
                    type: mimeType as any,
                    name: fileName,
                };
            });

            // Verifica se a nova seleção excede o limite permitido de arquivos.
            if (currentFilesCount + newFiles.length > maxFiles) {
                Alert.alert(
                    'Limite de arquivos excedido',
                    `Você pode selecionar no máximo ${maxFiles} arquivos.`
                );
                return;
            }
            onSelect(newFiles);
        }
    };

    /**
     * Abre a galeria do dispositivo para seleção de mídia. Solicita permissão de acesso
     * à biblioteca antes de continuar. Permite seleção múltipla quando disponível.
     *
     * @returns Promise resolvida quando a operação de seleção for concluída.
     */
    const pickFromGallery = async () => {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permissão necessária',
                'É necessário permitir o acesso à galeria.'
            );
            return;
        }
        await handleSelection(() =>
            ImagePicker.launchImageLibraryAsync({
                mediaTypes: determineMediaType(mediaType),
                // Edição desabilitada para manter o arquivo original
                allowsEditing: false,
                quality: 1,
                // Habilita selecionar mais de um arquivo, quando suportado
                allowsMultipleSelection: true,
                videoMaxDuration: videoMaxDuration,
            })
        );
    };

    /**
     * Abre a câmera do dispositivo para capturar mídia. Solicita permissão de acesso
     * à câmera antes de continuar.
     *
     * @returns Promise resolvida quando a operação de captura/seleção for concluída.
     */
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permissão necessária',
                'É necessário permitir o acesso à câmera.'
            );
            return;
        }
        await handleSelection(() =>
            ImagePicker.launchCameraAsync({
                mediaTypes: determineMediaType(mediaType),
                // Edição desabilitada para manter o arquivo original
                allowsEditing: false,
                quality: 1,
                videoMaxDuration: videoMaxDuration,
            })
        );
    };

    return { pickFromGallery, takePhoto };
};

