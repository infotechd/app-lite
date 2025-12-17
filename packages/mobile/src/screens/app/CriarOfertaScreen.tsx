/**
 * Tela de criação de oferta com menu completo de opções de mídia
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * 1. Tirar foto com câmera
 * 2. Gravar vídeo com câmera
 * 3. Escolher foto da galeria
 * 4. Escolher vídeo da galeria
 *
 * Interface elegante com menu de opções
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { Button, Text, TextInput, HelperText, Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import { criarOfertaSchema, CriarOfertaForm, OFERTA_MEDIA_CONFIG } from '@/utils/validation';
import { ofertaService } from '@/services/ofertaService';
import { uploadFiles } from '@/services/uploadService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import CategorySubcategoryPicker from '@/components/CategorySubcategoryPicker';
import EstadoSelect from '@/components/EstadoSelect';
import MediaPreview from '@/components/common/MediaPreview';
import MediaOptionsMenu from '@/components/MediaOptionsMenu';
import { useMediaPicker } from '@/hooks/useMediaPicker';
import { maskCurrencyInput, parseCurrencyBRLToNumber } from '@/utils/currency';
import MediaPreviewOverlay from '@/components/MediaPreviewOverlay';
import { MediaFile } from '@/types/media';

type Props = NativeStackScreenProps<OfertasStackParamList, 'CreateOferta'>;

/**
 * Componente de tela para criação de ofertas.
 *
 * Responsável por:
 * - Gerenciar estado do formulário (campos, mídias e erros);
 * - Validar dados com `criarOfertaSchema`;
 * - Submeter a oferta ao backend, incluindo upload de mídias (imagens/vídeos);
 * - Disponibilizar menu com opções de mídia (tirar/selecionar foto e gravar/selecionar vídeo).
 *
 * Observações de UX/Fluxo:
 * - O botão de publicar é habilitado apenas quando há dados mínimos válidos (ver `canSubmit`).
 * - Em caso de permissões negadas/limites de mídia/avisos, são exibidos `Alert`s de forma amigável.
 *
 * @param {{ navigation: Props['navigation'] }} param0 Objeto com `navigation` injetado pelo React Navigation.
 * @returns JSX.Element da tela de criação de oferta.
 */
const CriarOfertaScreen: React.FC<Props> = ({ navigation }) => {
    const [form, setForm] = useState<CriarOfertaForm>({
        titulo: '',
        descricao: '',
        precoText: '',
        priceUnit: 'pacote',
        categoria: '',
        cidade: '',
        estado: '',
        mediaFiles: [],
    });

    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [submitting, setSubmitting] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    // Mídia atualmente em pré-visualização no overlay (quando null, o overlay fica escondido)
    const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

    const canSubmit = useMemo(() => {
        const price = parseCurrencyBRLToNumber(form.precoText);
        return (
            form.titulo.trim().length > 0 &&
            form.descricao.trim().length > 0 &&
            price > 0 &&
            form.categoria.trim().length > 0 &&
            form.cidade.trim().length > 0 &&
            form.estado.trim().length === 2 &&
            !!form.priceUnit &&
            !submitting
        );
    }, [form, submitting]);

    const setField = (key: keyof CriarOfertaForm, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    /**
     * Adiciona novas mídias ao formulário, respeitando o limite máximo.
     * Mantém comportamento equivalente ao da tela de edição.
     */
    const onSelectMedia = (newMedia: any[]) => {
        if (form.mediaFiles.length + newMedia.length > OFERTA_MEDIA_CONFIG.MAX_FILES) {
            Alert.alert(
                'Limite de mídias atingido',
                `Você pode adicionar no máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} mídias.`
            );
            return;
        }
        setForm(prev => ({ ...prev, mediaFiles: [...prev.mediaFiles, ...newMedia] }));
    };

    // Hooks de seleção/captura iguais aos usados na tela de edição
    const { pickFromGallery: pickPhotoFromGallery, takePhoto: takePhotoFromCamera } = useMediaPicker({
        onSelect: onSelectMedia,
        mediaType: 'images',
        maxFiles: OFERTA_MEDIA_CONFIG.MAX_FILES,
        currentFilesCount: form.mediaFiles.length,
    });

    const { pickFromGallery: pickVideoFromGallery, takePhoto: captureVideoFromCamera } = useMediaPicker({
        onSelect: onSelectMedia,
        mediaType: 'videos',
        maxFiles: OFERTA_MEDIA_CONFIG.MAX_FILES,
        currentFilesCount: form.mediaFiles.length,
    });

    // Mapas para o menu de opções
    const onTakePhoto = () => takePhotoFromCamera();
    const onRecordVideo = () => captureVideoFromCamera();
    const onPickPhoto = () => pickPhotoFromGallery();
    const onPickVideo = () => pickVideoFromGallery();

    /**
     * Remove um item de mídia do array do formulário pelo índice.
     * @param {number} index Índice do item a ser removido em `form.mediaFiles`.
     * @returns {void} Não retorna valor; atualiza o estado do formulário.
     */
    const onRemoveMedia = (index: number) => {
        setForm((prev) => ({
            ...prev,
            mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
        }));
    };

    /**
     * Abre o overlay de pré-visualização para o item de mídia selecionado.
     * Mantém o objeto completo para que possamos identificar corretamente tipo (imagem/vídeo)
     * e permitir ações como exclusão do item diretamente a partir do overlay.
     *
     * @param mediaFile Objeto completo da mídia a ser pré-visualizada (contém uri, type e name).
     * @returns void
     */
    const handlePreviewMedia = (mediaFile: MediaFile) => {
        setPreviewMedia(mediaFile);
    };

    /**
     * Valida os dados do formulário, realiza upload das mídias (se houver) e cria a oferta.
     *
     * Fluxo resumido:
     * 1. Limpa erros e marca `submitting` como verdadeiro;
     * 2. Valida com `criarOfertaSchema`; em caso de erro, popula `errors` e interrompe;
     * 3. Se houver mídias, valida formato básico, realiza upload e separa URLs de imagens/vídeos;
     * 4. Monta `payload` com campos normalizados e URLs de mídias;
     * 5. Chama `ofertaService.createOferta` e navega para a tela de detalhes;
     * 6. Garante `submitting` como falso no `finally`.
     *
     * Erros e Resiliência:
     * - Upload: trata e exibe mensagens específicas retornadas pela API (quando disponíveis);
     * - Criação de oferta: exibe mensagem amigável em caso de falha.
     *
     * @returns {Promise<void>} Promessa sem retorno, apenas com efeitos colaterais (estado/alerts/navegação).
     */
    const onSubmit = async () => {
        setSubmitting(true);
        setErrors({});

        // 1) Validação do formulário com Zod; em caso de falhas, exibimos erros por campo
        const result = criarOfertaSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((i) => {
                const key = i.path.join('.') || 'form';
                if (!fieldErrors[key]) fieldErrors[key] = i.message;
            });
            setErrors(fieldErrors);
            setSubmitting(false);
            return;
        }

        try {
            let imageUrls: string[] = [];
            let videoUrls: string[] = [];

            // 2) Upload de mídias (se houver arquivos selecionados)
            if (form.mediaFiles.length > 0) {
                try {
                    console.log('Enviando mídias:', form.mediaFiles.length);

                    const allValid = form.mediaFiles.every(
                        (m: any) =>
                            m &&
                            typeof m.uri === 'string' && m.uri.length > 0 &&
                            typeof m.name === 'string' && m.name.length > 0 &&
                            typeof m.type === 'string' && m.type.length > 0
                    );

                    // Caso algum arquivo esteja inconsistente, orientamos o usuário a selecionar novamente
                    if (!allValid) {
                        Alert.alert(
                            'Erro',
                            'Arquivos de mídia inválidos. Tente selecionar novamente.'
                        );
                        return;
                    }

                    // Garante o respeito ao limite máximo de arquivos permitidos
                    const filesToUpload = form.mediaFiles.slice(0, OFERTA_MEDIA_CONFIG.MAX_FILES);
                    const uploadRes = await uploadFiles(filesToUpload);
                    imageUrls = uploadRes.images || [];
                    videoUrls = uploadRes.videos || [];

                    console.log('Upload concluído:', { images: imageUrls.length, videos: videoUrls.length });
                } catch (err: any) {
                    console.error('Erro no upload:', err?.response?.data || err);
                    const message =
                        err?.response?.data?.message ||
                        err?.message ||
                        'Falha no upload de mídias.';
                    Alert.alert('Erro no upload', String(message));
                    return;
                }
            }

            // 3) Montagem do payload normalizado a partir do formulário
            const preco = parseCurrencyBRLToNumber(form.precoText);
            const payload: any = {
                titulo: form.titulo.trim(),
                descricao: form.descricao.trim(),
                preco,
                unidadePreco: form.priceUnit,
                categoria: form.categoria,
                localizacao: { cidade: form.cidade, estado: form.estado },
                imagens: imageUrls,
            };

            // Campos opcionais
            if (form.subcategoria) payload.subcategoria = form.subcategoria;
            if (videoUrls.length) payload.videos = videoUrls;

            // 4) Criação da oferta e redirecionamento para a tela de detalhes
            const created = await ofertaService.createOferta(payload);
            Alert.alert('Sucesso', 'Oferta criada com sucesso!');
            navigation.replace('OfferDetail', { oferta: created });
        } catch (e: any) {
            console.error('Erro ao criar oferta:', e?.response?.data || e);
            const message =
                e?.response?.data?.message || e?.message || 'Não foi possível criar a oferta.';
            Alert.alert('Erro', String(message));
        } finally {
            setSubmitting(false);
        }
    };

    const categoriaId = form.categoria;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="titleLarge" style={styles.title}>Criar Oferta</Text>

            <TextInput
                label="Título"
                value={form.titulo}
                onChangeText={(t) => setField('titulo', t)}
                style={styles.input}
                mode="outlined"
                error={!!errors.titulo}
            />
            {!!errors.titulo && <HelperText type="error">{errors.titulo}</HelperText>}

            <TextInput
                label="Descrição"
                value={form.descricao}
                onChangeText={(t) => setField('descricao', t)}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={4}
                error={!!errors.descricao}
            />
            {!!errors.descricao && <HelperText type="error">{errors.descricao}</HelperText>}

            <View style={styles.row}>
                <TextInput
                    label="Preço"
                    value={form.precoText}
                    onChangeText={(t) => setField('precoText', maskCurrencyInput(t))}
                    style={[styles.input, styles.priceInput]}
                    mode="outlined"
                    keyboardType="numeric"
                    error={!!errors.preco}
                />

                <View style={styles.priceUnitContainer}>
                    <Text style={styles.label}>Preço por</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ columnGap: 8 }}>
                        {[
                            { value: 'hora', label: 'Hora' },
                            { value: 'diaria', label: 'Diária' },
                            { value: 'mes', label: 'Mês' },
                            { value: 'aula', label: 'Aula' },
                            { value: 'pacote', label: 'Pacote' },
                        ].map((opt) => (
                            <Chip
                                key={opt.value}
                                selected={form.priceUnit === (opt.value as any)}
                                onPress={() => setField('priceUnit', opt.value as any)}
                            >
                                {opt.label}
                            </Chip>
                        ))}
                    </ScrollView>
                </View>
            </View>
            {!!errors.preco && <HelperText type="error">{errors.preco}</HelperText>}
            {!!errors.priceUnit && <HelperText type="error">{errors.priceUnit}</HelperText>}

            <CategorySubcategoryPicker
                key={`cat-${categoriaId || 'none'}`}
                selectedCategoryId={categoriaId}
                selectedSubcategoryId={form.subcategoria}
                onCategoryChange={(id) => {
                    setField('categoria', id);
                    setField('subcategoria', undefined as any);
                }}
                onSubcategoryChange={(id) => setField('subcategoria', id)}
            />
            {!!errors.categoria && <HelperText type="error">{errors.categoria}</HelperText>}

            <EstadoSelect
                value={form.estado}
                onChange={(uf, capital) => {
                    setField('estado', uf);
                    if (capital) setField('cidade', capital);
                }}
            />
            {!!errors.estado && <HelperText type="error">{errors.estado}</HelperText>}

            <TextInput
                label="Cidade (automática)"
                value={form.cidade}
                style={styles.input}
                mode="outlined"
                editable={false}
                error={!!errors.cidade}
            />
            {!!errors.cidade && <HelperText type="error">{errors.cidade}</HelperText>}

            {/* Seção de Mídias com Menu de Opções */}
            <View style={styles.mediaSection}>
                <Text variant="titleSmall" style={styles.mediaTitle}>
                    Mídias (até {OFERTA_MEDIA_CONFIG.MAX_FILES}) - Vídeos até {OFERTA_MEDIA_CONFIG.MAX_VIDEO_DURATION}s
                </Text>

                <MediaPreview
                    mediaFiles={form.mediaFiles as any}
                    onRemove={onRemoveMedia}
                    onPreview={handlePreviewMedia}
                />
                {form.mediaFiles.length < OFERTA_MEDIA_CONFIG.MAX_FILES && (
                    <Button
                        icon="camera"
                        mode="outlined"
                        onPress={() => setMenuVisible(true)}
                        style={styles.submit}
                    >
                        Adicionar Mídia
                    </Button>
                )}
            </View>
            {!!errors.mediaFiles && <HelperText type="error">{errors.mediaFiles}</HelperText>}

            <Button
                mode="contained"
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={submitting}
                style={styles.submit}
            >
                Publicar oferta
            </Button>

            {/* Menu de Opções de Mídia */}
            <MediaOptionsMenu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
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
                        const index = form.mediaFiles.findIndex((m: any) => m.uri === previewMedia.uri);
                        if (index > -1) {
                            onRemoveMedia(index);
                        }
                    }
                    setPreviewMedia(null);
                }}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    title: {
        marginBottom: spacing.md,
    },
    input: {
        marginBottom: spacing.sm,
    },
    label: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        color: colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        flexWrap: 'wrap',
    },
    priceInput: {
        flexBasis: '45%',
        flexGrow: 0,
        flexShrink: 0,
        alignSelf: 'auto',
    },
    priceUnitContainer: {
        flex: 1,
        minWidth: 180,
    },
    mediaSection: {
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    mediaTitle: {
        marginBottom: spacing.sm,
        color: colors.text,
    },
    submit: {
        marginTop: spacing.md,
    },
});

export default CriarOfertaScreen;
