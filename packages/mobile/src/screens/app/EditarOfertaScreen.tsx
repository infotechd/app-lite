// Tela de edição de oferta
// Objetivo: permitir editar dados de uma oferta existente, incluindo título, descrição, preço,
// categoria, localização (UF + cidade) e mídias (imagens/vídeos). Comentários abaixo explicam cada parte
// e destacam pontos de melhoria identificados.

import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { showAlert } from '@/utils/alert';
import { Button, Text, TextInput, HelperText, Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme'; // Tokens de tema (cores, espaçamentos)
import { criarOfertaSchema, OFERTA_MEDIA_CONFIG, PriceUnit } from '@/utils/validation'; // Schema de validação e configs de mídia
import { ofertaService } from '@/services/ofertaService'; // Serviço de ofertas (API)
import { uploadFiles } from '@/services/uploadService'; // Serviço de upload (imagens/vídeos)
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { maskCurrencyInput, parseCurrencyBRLToNumber, formatCurrencyBRL } from '@/utils/currency';
import MediaPreview from '@/components/common/MediaPreview';
import MediaOptionsMenu from '@/components/MediaOptionsMenu';
import { useMediaPicker } from '@/hooks/useMediaPicker';
import { useOfertaOptions } from '@/hooks/useOfertaOptions';
import { MediaFile } from '@/types/media';
import { CategoryFields } from '@/components/form/CategoryFields';
import { LocationFields } from '@/components/form/LocationFields';
import MediaPreviewOverlay from '@/components/MediaPreviewOverlay';

// Tipagem das props recebidas via stack navigator: espera rota 'EditOferta'
type Props = NativeStackScreenProps<OfertasStackParamList, 'EditOferta'>;

// Estrutura do formulário de edição
// OBS: Mantém separação entre mídias existentes (URLs já hospedadas) e novas (arquivos locais)
// para controlar uploads e remoções corretamente.
/**
 * Estrutura do estado do formulário de edição de oferta.
 * Mantém separadas as mídias já hospedadas (kept*) das novas selecionadas (newMediaFiles)
 * para controlar corretamente uploads, remoções e o limite total permitido.
 */
type EditForm = {
    titulo: string; // Título da oferta
    descricao: string; // Descrição da oferta
    precoText: string; // Preço no formato texto (mascarado em BRL)
    priceUnit: PriceUnit; // Unidade do preço
    categoria: string; // Categoria selecionada
    subcategoria?: string; // Subcategoria selecionada (opcional)
    cidade: string; // Cidade (definida automaticamente a partir da UF selecionada)
    estado: string; // UF (sigla com 2 caracteres)
};

/**
 * Tela de edição de oferta.
 *
 * Permite atualizar título, descrição, preço (com máscara BRL), unidade do preço,
 * categoria, UF/cidade (cidade preenchida automaticamente) e mídias (imagens/vídeos).
 * Concilia mídias já hospedadas com novas mídias selecionadas antes de enviar à API.
 *
 * @param props Propriedades injetadas pelo React Navigation, incluindo route.params.oferta.
 * @returns Elemento JSX com a UI da tela de edição.
 */
const EditarOfertaScreen: React.FC<Props> = ({ route, navigation }) => {
    const { oferta } = route.params;

    // Estado do formulário, inicializado com os valores da oferta existente
    const [form, setForm] = useState<EditForm>({
        titulo: oferta.titulo || '',
        descricao: oferta.descricao || '',
        precoText: oferta.preco > 0 ? formatCurrencyBRL(oferta.preco) : '',
        priceUnit: oferta.unidadePreco || 'pacote',
        categoria: oferta.categoria || '',
        subcategoria: oferta.subcategoria,
        cidade: oferta.localizacao?.cidade || '',
        estado: oferta.localizacao?.estado || '',
    });

    // Estado das mídias, unificando existentes e novas
    // Mapeia mídias já hospedadas para objetos `MediaFile` com MIME type padronizado
    // - Imagens: "image/jpeg"; Vídeos: "video/mp4"
    // Isso evita inconsistências entre itens antigos (type: 'image'/'video') e novos (MIME types do picker)
    const [media, setMedia] = useState<MediaFile[]>(() => [
        ...(oferta.imagens?.map(
            (uri: string): MediaFile => ({ uri, type: 'image/jpeg' as any, name: 'imagem-existente.jpg' })
        ) || []),
        ...(oferta.videos?.map(
            (uri: string): MediaFile => ({ uri, type: 'video/mp4' as any, name: 'video-existente.mp4' })
        ) || []),
    ]);

    // Estado para controle da exibição das opções de mídia (câmera/galeria)
    const [isMediaOptionsVisible, setIsMediaOptionsVisible] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

    // Estado para mensagens de erro por campo (preenchido após validação)
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    // Flag de envio para desabilitar ações simultâneas e exibir loading
    const [submitting, setSubmitting] = useState(false);

    const { categoryOptions, subcategoryOptions, stateOptions } = useOfertaOptions(form.categoria);
    
    // Debug: verificar se a categoria está sendo carregada corretamente
    console.log('[EditarOfertaScreen] oferta.categoria:', oferta.categoria);
    console.log('[EditarOfertaScreen] form.categoria:', form.categoria);
    console.log('[EditarOfertaScreen] categoryOptions:', categoryOptions);

    // Hook para seleção de mídia, encapsulando lógica de câmera e galeria
    const onSelectMedia = (newMedia: MediaFile[]) => {
        if (media.length + newMedia.length > OFERTA_MEDIA_CONFIG.MAX_FILES) {
            showAlert(
                'Limite de mídias atingido',
                `Você pode adicionar no máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} mídias.`
            );
        } else {
            setMedia(prevMedia => [...prevMedia, ...newMedia]);
        }
    };

    // Dois pickers: um para imagens e outro para vídeos, para casar com as props do MediaOptionsMenu
    const { pickFromGallery: onPickPhoto, takePhoto: onTakePhoto } = useMediaPicker({
        onSelect: onSelectMedia,
        mediaType: 'images',
        maxFiles: OFERTA_MEDIA_CONFIG.MAX_FILES,
        currentFilesCount: media.length,
        videoMaxDuration: OFERTA_MEDIA_CONFIG.MAX_VIDEO_DURATION,
    });

    const { pickFromGallery: onPickVideo, takePhoto: onRecordVideo } = useMediaPicker({
        onSelect: onSelectMedia,
        mediaType: 'videos',
        maxFiles: OFERTA_MEDIA_CONFIG.MAX_FILES,
        currentFilesCount: media.length,
        videoMaxDuration: OFERTA_MEDIA_CONFIG.MAX_VIDEO_DURATION,
    });

    /**
     * Remove uma mídia da lista pelo índice informado.
     * Útil tanto na miniatura (ícone de fechar) quanto a partir do overlay (ação Excluir).
     *
     * @param index Índice do item a ser removido do array `media`.
     * @returns void
     */
    const handleRemoveMedia = (index: number) => {
        setMedia(prevMedia => prevMedia.filter((_, i) => i !== index));
    };

    /**
     * Abre o overlay de pré-visualização para o item de mídia selecionado.
     * Mantém o objeto completo (uri/type/name) para detecção correta do tipo e ações subsequentes.
     *
     * @param mediaFile Objeto `MediaFile` que será exibido em tela cheia.
     * @returns void
     */
    const handlePreviewMedia = (mediaFile: MediaFile) => {
        setPreviewMedia(mediaFile);
    };

    // Regra para habilitar o botão de salvar
    const canSubmit = useMemo(() => {
        const price = parseCurrencyBRLToNumber(form.precoText);
        return (
            form.titulo.trim().length > 0 &&
            form.descricao.trim().length > 0 &&
            price > 0 && // Garante preço válido
            !!form.priceUnit &&
            form.categoria.trim().length > 0 &&
            (form.estado === 'BR' || form.cidade.trim().length > 0) &&
            form.estado.trim().length === 2 && // UF deve ter 2 caracteres
            !submitting
        );
    }, [form, submitting]);

    /**
     * Atualiza um campo do formulário de forma imutável.
     * Útil para repassar a inputs e componentes filhos como callback de mudança.
     *
     * Ponto de melhoria: envolver com useCallback se for passado para muitos filhos
     * para evitar recriações desnecessárias a cada render.
     *
     * @typeParam K - Chave do campo do formulário dentro de EditForm.
     * @param key - Nome da propriedade a ser atualizada.
     * @param value - Novo valor do campo correspondente.
     * @returns void
     */
    const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    /**
     * Submete o formulário de edição de oferta.
     * Fluxo:
     * 1) Limpa erros e ativa estado de envio.
     * 2) Valida campos com o schema existente (regras de criação reaproveitadas).
     * 3) Faz upload de novas mídias (se houver) e coleta URLs resultantes.
     * 4) Converte preço mascarado (BRL) para número.
     * 5) Consolida todas as mídias (mantidas + novas) e revalida o limite final.
     * 6) Monta payload e chama a API de atualização.
     * 7) Em caso de sucesso, informa o usuário e navega para o detalhe da oferta.
     * 8) Em caso de erro, exibe mensagem apropriada e registra no console.
     *
     * @returns Promise<void>
     */
    const onSubmit = async () => {
        setSubmitting(true);
        setErrors({});

        // Separa arquivos locais (que precisam ser enviados) de URLs remotas (que são mantidas)
        // Na Web, arquivos locais podem começar com 'blob:' ou 'data:'.
        // URLs remotas sempre começam com 'http'.
        const isRemote = (uri: string) => uri.startsWith('http');
        const localFiles = media.filter(m => !isRemote(m.uri));
        const remoteFiles = media.filter(m => isRemote(m.uri));

        // Dados para validação, incluindo preço convertido para número
        const validationData = {
            ...form,
            preco: parseCurrencyBRLToNumber(form.precoText),
            mediaFiles: localFiles,
        };

        // Validação: reaproveita o schema de criação para os campos textuais/UF/preço e para novas mídias
        const result = criarOfertaSchema.safeParse(validationData);

        if (!result.success) {
            // Converte issues do Zod em um dicionário de erros por campo
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const key = issue.path.join('.');
                if (!fieldErrors[key]) {
                    fieldErrors[key] = issue.message;
                }
            });
            setErrors(fieldErrors);
            setSubmitting(false);
            return;
        }

        try {
            // 1) Upload de novas mídias (se houver)
            let uploadedImageUrls: string[] = [];
            let uploadedVideoUrls: string[] = [];

            if (localFiles.length > 0) {
                const uploadResponse = await uploadFiles(localFiles);
                uploadedImageUrls = uploadResponse.images || [];
                uploadedVideoUrls = uploadResponse.videos || [];
            }

            // 2) Consolidação final de listas de mídias (mantidas + recém-carregadas)
            // Consolidação final: mantém URLs remotas existentes + adiciona URLs recém enviadas
            // Filtramos as mídias remotas pelo tipo (imagem ou vídeo) para remontar as listas originais
            const finalImages = [
                ...remoteFiles.filter(m => m.type?.includes('image') || (m as any).type === 'image').map(m => m.uri),
                ...uploadedImageUrls,
            ];
            const finalVideos = [
                ...remoteFiles.filter(m => m.type?.includes('video') || (m as any).type === 'video').map(m => m.uri),
                ...uploadedVideoUrls,
            ];

            // 3) Montagem do payload para API
            // Ponto de melhoria: evitar 'any' tipando o payload conforme contrato do backend.
            const payload: any = {
                ...form,
                preco: parseCurrencyBRLToNumber(form.precoText),
                unidadePreco: form.priceUnit,
                localizacao: { cidade: form.cidade, estado: form.estado },
                imagens: finalImages,
                videos: finalVideos,
            };

            // 4) Chamada da API para atualizar a oferta e navegação para detalhe
            const updated = await ofertaService.updateOferta(oferta._id, payload);
            showAlert('Sucesso', 'Oferta atualizada com sucesso!');
            // Ponto de melhoria: considerar navegação com goBack + atualização via contexto/estado global em vez de replace.
            navigation.replace('OfferDetail', { oferta: updated });
        } catch (e: any) {
            console.error('Erro ao atualizar oferta:', e?.response?.data || e);
            const message = e?.response?.data?.message || e?.message || 'Não foi possível atualizar a oferta.';
            // Ponto de melhoria: consolidar tratamento de erros (ex: hook/useApi) e mensagens i18n.
            showAlert('Erro', String(message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Título da tela */}
            <Text variant="titleLarge" style={styles.title}>Editar Oferta</Text>

            {/* Campo: Título */}
            <TextInput
                label="Título"
                value={form.titulo}
                onChangeText={t => setField('titulo', t)}
                style={styles.input}
                mode="outlined"
                error={!!errors.titulo}
            />
            {!!errors.titulo && <HelperText type="error">{errors.titulo}</HelperText>}

            {/* Campo: Descrição */}
            <TextInput
                label="Descrição"
                value={form.descricao}
                onChangeText={t => setField('descricao', t)}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={4}
                error={!!errors.descricao}
            />
            {!!errors.descricao && <HelperText type="error">{errors.descricao}</HelperText>}

            {/* Campo: Preço (com máscara BRL) */}
            <TextInput
                label="Preço"
                value={form.precoText}
                onChangeText={t => setField('precoText', maskCurrencyInput(t))}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.preco}
            />
            {!!errors.preco && <HelperText type="error">{errors.preco}</HelperText>}

            {/* Unidade de preço */}
            <Text style={styles.label}>Preço por</Text>
            <View style={styles.priceUnitContainer}>
                <Chip
                    selected={form.priceUnit === 'hora'}
                    onPress={() => setField('priceUnit', 'hora')}
                >
                    Hora
                </Chip>
                <Chip
                    selected={form.priceUnit === 'diaria'}
                    onPress={() => setField('priceUnit', 'diaria')}
                >
                    Diária
                </Chip>
                <Chip
                    selected={form.priceUnit === 'mes'}
                    onPress={() => setField('priceUnit', 'mes')}
                >
                    Mês
                </Chip>
                <Chip
                    selected={form.priceUnit === 'aula'}
                    onPress={() => setField('priceUnit', 'aula')}
                >
                    Aula
                </Chip>
                <Chip
                    selected={form.priceUnit === 'pacote'}
                    onPress={() => setField('priceUnit', 'pacote')}
                >
                    Pacote
                </Chip>
            </View>

            {/* Seleção de categoria e subcategoria */}
            <CategoryFields
                categoria={form.categoria}
                subcategoria={form.subcategoria}
                categoryOptions={categoryOptions}
                subcategoryOptions={subcategoryOptions}
                errors={errors}
                onCategoriaChange={(val) => {
                    setField('categoria', val);
                    setField('subcategoria', undefined);
                }}
                onSubcategoriaChange={(val) => setField('subcategoria', val)}
            />

            <LocationFields
                estado={form.estado}
                cidade={form.cidade}
                stateOptions={stateOptions}
                errors={errors}
                onEstadoChange={(val) => setField('estado', val)}
                onCidadeChange={(val) => setField('cidade', val)}
                inputStyle={styles.input}
            />

            {/* Seção de mídias (pré-visualização e adição) */}
            <View style={styles.section}>
                <Text style={styles.label}>Mídia (Fotos e Vídeos)</Text>
                <MediaPreview
                    mediaFiles={media}
                    onRemove={handleRemoveMedia}
                    onPreview={handlePreviewMedia}
                />
                {media.length < OFERTA_MEDIA_CONFIG.MAX_FILES && (
                    <Button
                        icon="camera"
                        mode="outlined"
                        onPress={() => setIsMediaOptionsVisible(true)}
                        style={styles.button}
                    >
                        Adicionar Mídia
                    </Button>
                )}
            </View>

            {/* Menu de opções de mídia (câmera/galeria) */}
            <MediaOptionsMenu
                visible={isMediaOptionsVisible}
                onDismiss={() => setIsMediaOptionsVisible(false)}
                onTakePhoto={onTakePhoto}
                onRecordVideo={onRecordVideo}
                onPickPhoto={onPickPhoto}
                onPickVideo={onPickVideo}
            />

            {/* Overlay de pré-visualização (imagem/vídeo) com ações de fechar e excluir */}
            <MediaPreviewOverlay
                media={previewMedia}
                onClose={() => setPreviewMedia(null)}
                onDelete={() => {
                    if (previewMedia) {
                        const index = media.findIndex(m => m.uri === previewMedia.uri);
                        if (index > -1) {
                            handleRemoveMedia(index);
                        }
                    }
                    setPreviewMedia(null);
                }}
            />

            {/* Botão de salvar alterações */}
            <Button
                mode="contained"
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={submitting}
                style={styles.submit}
            >
                Salvar Alterações
            </Button>
        </ScrollView>
    );
};

// Estilos da tela
// Ponto de melhoria: caso muitos componentes reutilizem estes estilos, considerar mover para um módulo de estilos compartilhado
// ou expandir tokens no theme (ex: alturas, bordas, etc.).
const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    title: {
        marginBottom: spacing.lg,
    },
    input: {
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    priceUnitContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    label: {
        marginBottom: spacing.sm,
        color: colors.textSecondary,
        fontSize: 16,
    },
    section: {
        marginVertical: spacing.md,
    },
    button: {
        marginTop: spacing.md,
    },
    submit: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
    },
});

export default EditarOfertaScreen;
