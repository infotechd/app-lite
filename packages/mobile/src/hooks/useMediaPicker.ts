import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { MediaFile, MediaType } from '@/types/media';

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
            const newFiles = result.assets.map(
                (asset): MediaFile => ({
                    uri: asset.uri,
                    type: asset.type as MediaType,
                    // Usa o nome do arquivo quando disponível. Caso contrário, tenta extrair do URI;
                    // se ainda assim não houver, define um nome padrão.
                    name:
                        asset.fileName ??
                        asset.uri.split('/').pop() ??
                        'media-file',
                })
            );

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
            })
        );
    };

    return { pickFromGallery, takePhoto };
};

