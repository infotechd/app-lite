// Tela de edição de oferta
// Objetivo: permitir editar dados de uma oferta existente, incluindo título, descrição, preço,
// categoria, localização (UF + cidade) e mídias (imagens/vídeos). Comentários abaixo explicam cada parte
// e destacam pontos de melhoria identificados.

import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, HelperText, Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme'; // Tokens de tema (cores, espaçamentos)
import { criarOfertaSchema, MediaFile, OFERTA_MEDIA_CONFIG } from '@/utils/validation'; // Schema de validação e configs de mídia
import { ofertaService } from '@/services/ofertaService'; // Serviço de ofertas (API)
import { uploadFiles } from '@/services/uploadService'; // Serviço de upload (imagens/vídeos)
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types'; // Tipos da navegação
import { maskCurrencyInput, parseCurrencyBRLToNumber, formatCurrencyBRL } from '@/utils/currency'; // Utilidades de moeda BRL

import { CATEGORY_NAMES } from '@/constants/categories'; // Lista de categorias disponíveis
import CategoryChips from '@/components/CategoryChips'; // Componente de chips para seleção de categoria
import EstadoSelect from '@/components/EstadoSelect'; // Componente de seleção de UF (+ capital)
import MediaChips from '@/components/MediaChips'; // Componente para visualizar/adicionar/remover mídias novas
import { pickMedia } from '@/services/mediaPickerService'; // Picker de mídia nativo
import { handleMediaPickResult } from '@/utils/mediaPickHandlers'; // Tratador do resultado de seleção de mídias

// Tipagem das props recebidas via stack navigator: espera rota 'EditOferta'
type Props = NativeStackScreenProps<OfertasStackParamList, 'EditOferta'>;

// Estrutura do formulário de edição
// OBS: Mantém separação entre mídias existentes (URLs já hospedadas) e novas (arquivos locais)
// para controlar uploads e remoções corretamente.
type EditForm = {
    titulo: string; // Título da oferta
    descricao: string; // Descrição da oferta
    precoText: string; // Preço no formato texto (mascarado em BRL)
    categoria: string; // Categoria selecionada
    cidade: string; // Cidade (definida automaticamente a partir da UF selecionada)
    estado: string; // UF (sigla com 2 caracteres)
    keptImages: string[]; // URLs remotas de imagens que serão mantidas
    keptVideos: string[]; // URLs remotas de vídeos que serão mantidos
    newMediaFiles: MediaFile[]; // Arquivos locais de mídias recém-selecionadas para upload
};

const EditarOfertaScreen: React.FC<Props> = ({ route, navigation }) => {
    // Oferta original recebida pela navegação
    const oferta = route.params.oferta;

    // Estado do formulário, inicializado com os valores da oferta existente
    const [form, setForm] = useState<EditForm>({
        titulo: oferta.titulo || '',
        descricao: oferta.descricao || '',
        precoText: oferta.preco > 0 ? formatCurrencyBRL(oferta.preco) : '', // Converte número em string monetária BRL
        categoria: oferta.categoria || '',
        cidade: oferta.localizacao?.cidade || '',
        estado: oferta.localizacao?.estado || '',
        keptImages: Array.isArray(oferta.imagens) ? oferta.imagens : [], // Garante array mesmo se vier undefined
        // Ponto de melhoria: evitar uso de "any" em oferta.videos. Ideal criar tipo forte para Oferta.
        keptVideos: Array.isArray((oferta as any).videos) ? (oferta as any).videos : [],
        newMediaFiles: [], // Começa vazio; apenas novas mídias selecionadas entram aqui
    });

    // Estado para mensagens de erro por campo (preenchido após validação)
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    // Flag de envio para desabilitar ações simultâneas e exibir loading
    const [submitting, setSubmitting] = useState(false);

    // Quantidade total de mídias (existentes mantidas + novas)
    const totalMidias = form.keptImages.length + form.keptVideos.length + form.newMediaFiles.length;

    // Regra para habilitar o botão de salvar
    // Ponto de melhoria: totalMidias é lido do escopo externo; para evitar sutilezas,
    // poderia ser recalculado dentro do useMemo ou adicionado como dependência.
    const canSubmit = useMemo(() => {
        const price = parseCurrencyBRLToNumber(form.precoText);
        return (
            form.titulo.trim().length > 0 &&
            form.descricao.trim().length > 0 &&
            price > 0 && // Garante preço válido
            form.categoria.trim().length > 0 &&
            form.cidade.trim().length > 0 &&
            form.estado.trim().length === 2 && // UF deve ter 2 caracteres
            totalMidias <= OFERTA_MEDIA_CONFIG.MAX_FILES &&
            !submitting
        );
    }, [form, submitting]);

    // Helper genérico para atualizar um campo do formulário de forma imutável
    // Ponto de melhoria: usar useCallback para evitar recriação em cada render se for repassado a muitos filhos.
    const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    // Handler para abrir o seletor de mídias, limitando conforme espaço restante
    const onPickMedia = async () => {
        try {
            const spaceLeft = OFERTA_MEDIA_CONFIG.MAX_FILES - (form.keptImages.length + form.keptVideos.length);
            if (spaceLeft <= 0) {
                Alert.alert('Limite atingido', `Você pode enviar no máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} arquivos.`);
                return;
            }

            // Abre a galeria/câmera com configuração de limite adaptada ao espaço restante
            const res = await pickMedia(form.newMediaFiles, { ...OFERTA_MEDIA_CONFIG, MAX_FILES: spaceLeft });

            // Delega ao utilitário o tratamento do resultado e atualização da lista de novas mídias
            handleMediaPickResult(
                res,
                (files) => setForm((prev) => ({ ...prev, newMediaFiles: files })),
                spaceLeft
            );
        } catch (err) {
            console.error('Erro ao selecionar mídia:', err);
            // Ponto de melhoria: padronizar mensagens em i18n e diferenciar cancelamento de erro real.
            Alert.alert('Erro', 'Não foi possível abrir a galeria.');
        }
    };

    // Remove uma imagem remanescente (já hospedada) da lista de mantidas
    const onRemoveKeptImage = (index: number) => {
        setForm((prev) => ({ ...prev, keptImages: prev.keptImages.filter((_, i) => i !== index) }));
    };

    // Remove um vídeo remanescente (já hospedado) da lista de mantidos
    const onRemoveKeptVideo = (index: number) => {
        setForm((prev) => ({ ...prev, keptVideos: prev.keptVideos.filter((_, i) => i !== index) }));
    };

    // Remove uma mídia nova (ainda local) antes do upload
    const onRemoveNewMedia = (index: number) => {
        setForm((prev) => ({ ...prev, newMediaFiles: prev.newMediaFiles.filter((_, i) => i !== index) }));
    };

    // Envio do formulário: valida, faz upload (se houver novas mídias), monta payload e chama a API de atualização
    const onSubmit = async () => {
        setSubmitting(true);
        setErrors({});

        // Validação: reaproveita o schema de criação para os campos textuais/UF/preço e para novas mídias
        // Ponto de melhoria: criar schema específico para edição se regras forem diferentes (ex: mídias podem ser 0).
        const validateResult = criarOfertaSchema.safeParse({
            titulo: form.titulo,
            descricao: form.descricao,
            precoText: form.precoText,
            categoria: form.categoria,
            cidade: form.cidade,
            estado: form.estado,
            mediaFiles: form.newMediaFiles, // valida apenas os novos (tamanho/tipo/limite adicional gerido acima)
        });
        if (!validateResult.success) {
            // Converte issues do Zod em um dicionário de erros por campo
            const fieldErrors: Record<string, string> = {};
            validateResult.error.issues.forEach((i) => {
                const key = i.path.join('.') || 'form';
                if (!fieldErrors[key]) fieldErrors[key] = i.message;
            });
            setErrors(fieldErrors);
            setSubmitting(false);
            return;
        }

        try {
            // 1) Upload de novas mídias (se houver)
            let imageUrls: string[] = [];
            let videoUrls: string[] = [];
            if (form.newMediaFiles.length > 0) {
                const uploadRes = await uploadFiles(form.newMediaFiles);
                imageUrls = uploadRes.images;
                videoUrls = uploadRes.videos;
                // Ponto de melhoria: tratar falhas parciais (alguns arquivos falharam) e informar ao usuário.
            }

            // 2) Conversão do preço de texto (BRL) para número
            const preco = parseCurrencyBRLToNumber(form.precoText);

            // 3) Consolidação final de listas de mídias (mantidas + recém-carregadas)
            const finalImages = [...form.keptImages, ...imageUrls];
            const finalVideos = [...form.keptVideos, ...videoUrls];
            if (finalImages.length + finalVideos.length > OFERTA_MEDIA_CONFIG.MAX_FILES) {
                Alert.alert('Limite de mídias', `Máximo de ${OFERTA_MEDIA_CONFIG.MAX_FILES} mídias (imagens + vídeos).`);
                setSubmitting(false);
                return;
            }

            // 4) Montagem do payload para API
            // Ponto de melhoria: evitar 'any' tipando o payload conforme contrato do backend.
            const payload: any = {
                titulo: form.titulo.trim(),
                descricao: form.descricao.trim(),
                preco,
                categoria: form.categoria,
                localizacao: { cidade: form.cidade, estado: form.estado },
                imagens: finalImages,
            };
            if (finalVideos.length) payload.videos = finalVideos;

            // 5) Chamada da API para atualizar a oferta e navegação para detalhe
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
                onChangeText={(t) => setField('titulo', t)}
                style={styles.input}
                mode="outlined"
                error={!!errors.titulo}
            />
            {!!errors.titulo && <HelperText type="error">{errors.titulo}</HelperText>}

            {/* Campo: Descrição */}
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

            {/* Campo: Preço (com máscara BRL) */}
            <TextInput
                label="Preço"
                value={form.precoText}
                onChangeText={(t) => setField('precoText', maskCurrencyInput(t))}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.precoText}
            />
            {!!errors.precoText && <HelperText type="error">{errors.precoText}</HelperText>}

            {/* Seleção de categoria por chips */}
            <CategoryChips categories={CATEGORY_NAMES} value={form.categoria} onChange={(cat) => setField('categoria', cat)} />
            {!!errors.categoria && <HelperText type="error">{errors.categoria}</HelperText>}

            {/* Seleção de UF (define cidade automaticamente com capital, se disponível) */}
            <EstadoSelect value={form.estado} onChange={(uf, capital) => { setField('estado', uf); if (capital) setField('cidade', capital); }} />
            {!!errors.estado && <HelperText type="error">{errors.estado}</HelperText>}

            {/* Campo de cidade somente leitura (preenchido automaticamente) */}
            <TextInput
                label="Cidade (automática)"
                value={form.cidade}
                style={styles.input}
                mode="outlined"
                editable={false}
                error={!!errors.cidade}
            />
            {!!errors.cidade && <HelperText type="error">{errors.cidade}</HelperText>}

            {/* Listagem de mídias existentes (mantidas) com chips removíveis */}
            <Text variant="titleSmall" style={styles.label}>Mídias (até {OFERTA_MEDIA_CONFIG.MAX_FILES})</Text>
            <View style={styles.chipsRow}>
                {form.keptImages.map((url, idx) => (
                    <Chip key={`ki-${url}`} icon="image" onClose={() => onRemoveKeptImage(idx)} style={styles.chip}>
                        Imagem {idx + 1}
                    </Chip>
                ))}
                {form.keptVideos.map((url, idx) => (
                    <Chip key={`kv-${url}`} icon="video" onClose={() => onRemoveKeptVideo(idx)} style={styles.chip}>
                        Vídeo {idx + 1}
                    </Chip>
                ))}
            </View>

            {/* Gerenciador de mídias novas (locais) */}
            <MediaChips
                title="Novas mídias"
                mediaFiles={form.newMediaFiles}
                onRemove={onRemoveNewMedia}
                onAddPress={onPickMedia}
                max={Math.max(0, OFERTA_MEDIA_CONFIG.MAX_FILES - (form.keptImages.length + form.keptVideos.length))}
            />
            {!!errors.mediaFiles && <HelperText type="error">{errors.mediaFiles}</HelperText>}

            {/* Botão de salvar alterações */}
            <Button mode="contained" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submit}>
                Salvar alterações
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
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm,
    },
    chip: {
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
    submit: {
        marginTop: spacing.md,
    },
});

export default EditarOfertaScreen;
