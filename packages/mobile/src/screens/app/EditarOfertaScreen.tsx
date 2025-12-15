// Tela de edição de oferta
// Objetivo: permitir editar dados de uma oferta existente, incluindo título, descrição, preço,
// categoria, localização (UF + cidade) e mídias (imagens/vídeos). Comentários abaixo explicam cada parte
// e destacam pontos de melhoria identificados.

import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, HelperText, Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme'; // Tokens de tema (cores, espaçamentos)
import { criarOfertaSchema, OFERTA_MEDIA_CONFIG, PriceUnit } from '@/utils/validation'; // Schema de validação e configs de mídia
import { ofertaService } from '@/services/ofertaService'; // Serviço de ofertas (API)
import { uploadFiles } from '@/services/uploadService'; // Serviço de upload (imagens/vídeos)
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { maskCurrencyInput, parseCurrencyBRLToNumber, formatCurrencyBRL } from '@/utils/currency';

import CategorySubcategoryPicker from '@/components/CategorySubcategoryPicker';
import EstadoSelect from '@/components/EstadoSelect';
import MediaPreview from '@/components/common/MediaPreview';
import MediaOptionsMenu from '@/components/MediaOptionsMenu';
import { useMediaPicker } from '@/hooks/useMediaPicker';
import { MediaFile } from '@/types/media';

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
 * @param route - Propriedade de navegação contendo os parâmetros, incluindo a oferta original (route.params.oferta).
 * @param navigation - Objeto de navegação para transitar entre telas.
 * @returns JSX.Element com a UI da tela de edição.
 */
const EditarOfertaScreen: React.FC<Props> = ({ route, navigation }) => {
    const { oferta } = route.params;

    // Estado do formulário, inicializado com os valores da oferta existente
    const [form, setForm] = useState({
        titulo: oferta.titulo || '',
        descricao: oferta.descricao || '',
        precoText: oferta.preco > 0 ? formatCurrencyBRL(oferta.preco) : '',
        priceUnit: (oferta as any)?.unidadePreco || 'pacote',
        categoria: oferta.categoria || '',
        subcategoria: (oferta as any)?.subcategoria,
        cidade: oferta.localizacao?.cidade || '',
        estado: oferta.localizacao?.estado || '',
    });

    // Estado das mídias, unificando existentes e novas
    const [media, setMedia] = useState<MediaFile[]>(() => [
        ...(oferta.imagens?.map(
            (uri: string): MediaFile => ({ uri, type: 'image', name: 'imagem-existente' })
        ) || []),
        ...((oferta as any).videos?.map(
            (uri: string): MediaFile => ({ uri, type: 'video', name: 'video-existente' })
        ) || []),
    ]);

    // Estado para controle da exibição das opções de mídia (câmera/galeria)
    const [isMediaOptionsVisible, setIsMediaOptionsVisible] = useState(false);

    // Estado para mensagens de erro por campo (preenchido após validação)
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    // Flag de envio para desabilitar ações simultâneas e exibir loading
    const [submitting, setSubmitting] = useState(false);

    // Hook para seleção de mídia, encapsulando lógica de câmera e galeria
    const onSelectMedia = (newMedia: MediaFile[]) => {
        if (media.length + newMedia.length > OFERTA_MEDIA_CONFIG.MAX_FILES) {
            Alert.alert(
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
    });

    const { pickFromGallery: onPickVideo, takePhoto: onRecordVideo } = useMediaPicker({
        onSelect: onSelectMedia,
        mediaType: 'videos',
        maxFiles: OFERTA_MEDIA_CONFIG.MAX_FILES,
        currentFilesCount: media.length,
    });

    // Remove uma mídia da lista (exclui da pré-visualização)
    const handleRemoveMedia = (index: number) => {
        setMedia(prevMedia => prevMedia.filter((_, i) => i !== index));
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
            form.cidade.trim().length > 0 &&
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
    const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
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
        const localFiles = media.filter(m => m.uri.startsWith('file://'));
        const remoteFiles = media.filter(m => m.uri.startsWith('http'));

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
            const finalImages = [
                ...remoteFiles.filter(m => m.type === 'image').map(m => m.uri),
                ...uploadedImageUrls,
            ];
            const finalVideos = [
                ...remoteFiles.filter(m => m.type === 'video').map(m => m.uri),
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
            Alert.alert('Sucesso', 'Oferta atualizada com sucesso!');
            // Ponto de melhoria: considerar navegação com goBack + atualização via contexto/estado global em vez de replace.
            navigation.replace('OfferDetail', { oferta: updated });
        } catch (e: any) {
            console.error('Erro ao atualizar oferta:', e?.response?.data || e);
            const message = e?.response?.data?.message || e?.message || 'Não foi possível atualizar a oferta.';
            // Ponto de melhoria: consolidar tratamento de erros (ex: hook/useApi) e mensagens i18n.
            Alert.alert('Erro', String(message));
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
                style={[styles.input, styles.priceInput]}
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
                    onPress={() => setField('priceUnit', 'hora' as any)}
                >
                    Hora
                </Chip>
                <Chip
                    selected={form.priceUnit === 'diaria'}
                    onPress={() => setField('priceUnit', 'diaria' as any)}
                >
                    Diária
                </Chip>
                <Chip
                    selected={form.priceUnit === 'mes'}
                    onPress={() => setField('priceUnit', 'mes' as any)}
                >
                    Mês
                </Chip>
                <Chip
                    selected={form.priceUnit === 'aula'}
                    onPress={() => setField('priceUnit', 'aula' as any)}
                >
                    Aula
                </Chip>
                <Chip
                    selected={form.priceUnit === 'pacote'}
                    onPress={() => setField('priceUnit', 'pacote' as any)}
                >
                    Pacote
                </Chip>
            </View>

            {/* Seleção de categoria e subcategoria */}
            <CategorySubcategoryPicker
                selectedCategoryId={form.categoria}
                selectedSubcategoryId={form.subcategoria}
                onCategoryChange={id => {
                    setField('categoria', id);
                    setField('subcategoria', undefined);
                }}
                onSubcategoryChange={id => setField('subcategoria', id)}
            />
            {!!errors.categoria && <HelperText type="error">{errors.categoria}</HelperText>}

            {/* Seleção de UF (define cidade automaticamente com capital, se disponível) */}
            <EstadoSelect
                value={form.estado}
                onChange={(uf, capital) => {
                    setField('estado', uf);
                    if (capital) setField('cidade', capital);
                }}
            />
            {!!errors.estado && <HelperText type="error">{errors.estado}</HelperText>}

            {/* Campo de cidade somente leitura (preenchido automaticamente) */}
            <TextInput
                label="Cidade (automática)"
                value={form.cidade}
                style={styles.input}
                mode="outlined"
                disabled
                error={!!errors.cidade}
            />
            {!!errors.cidade && <HelperText type="error">{errors.cidade}</HelperText>}

            {/* Seção de mídias (pré-visualização e adição) */}
            <View style={styles.section}>
                <Text style={styles.label}>Mídia (Fotos e Vídeos)</Text>
                <MediaPreview mediaFiles={media} onRemove={handleRemoveMedia} />
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
    priceInput: {
        flex: 1,
    },
    priceUnitContainer: {
        flex: 1,
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
