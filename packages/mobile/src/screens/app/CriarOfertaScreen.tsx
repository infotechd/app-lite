// Tela de criação de oferta: responsável por coletar dados do usuário, validar,
// enviar mídias (imagens/vídeos) e criar a oferta no backend. Comentários em pt-BR
// explicam cada parte e trazem observações de melhorias potenciais.

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { Button, Text, TextInput, HelperText, Chip } from 'react-native-paper';
// Tema (cores e espaçamentos) centralizados do app
import { colors, spacing } from '@/styles/theme';
// Esquema de validação Zod, tipo do formulário e config de mídias
import { criarOfertaSchema, CriarOfertaForm, OFERTA_MEDIA_CONFIG } from '@/utils/validation';
// Serviço responsável por criar ofertas no backend
import { ofertaService } from '@/services/ofertaService';
// Serviço de upload de arquivos (imagens/vídeos)
import { uploadFiles } from '@/services/uploadService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
// Componentes visuais reutilizáveis
import CategorySubcategoryPicker from '@/components/CategorySubcategoryPicker';
import EstadoSelect from '@/components/EstadoSelect';
import MediaChips from '@/components/MediaChips';
// Serviço para abrir galeria/câmera e selecionar mídias
import { pickMedia } from '@/services/mediaPickerService';
// Funções utilitárias para máscara e parse de moeda (R$)
import { maskCurrencyInput, parseCurrencyBRLToNumber } from '@/utils/currency';

// Handler que trata o resultado da seleção de mídias (cancelamentos, limites, etc.)
import { handleMediaPickResult } from '@/utils/mediaPickHandlers';

// Tipagem das props de navegação desta tela
type Props = NativeStackScreenProps<OfertasStackParamList, 'CreateOferta'>;


const CriarOfertaScreen: React.FC<Props> = ({ navigation }) => {
    // Estado do formulário com os campos necessários para criar uma oferta
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

    // Estado para mensagens de erro de validação campo a campo
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    // Flag para controlar loading no envio (evita múltiplos envios simultâneos)
    const [submitting, setSubmitting] = useState(false);

    // Computa se o botão "Publicar oferta" pode ser habilitado
    // Baseado em validação simples (não substitui o Zod, mas ajuda UX)
    // MELHORIA: para consistência, considerar usar o próprio schema (safeParse) aqui
    // ou extrair uma função de validação compartilhada, evitando duplicidade de regras.
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

    // Helper genérico para atualizar qualquer campo do formulário de forma imutável
    // Mantém a tipagem do formulário (K é uma chave válida de CriarOfertaForm)
    const setField = <K extends keyof CriarOfertaForm>(key: K, value: CriarOfertaForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    // Handler para selecionar mídias (abre galeria/câmera via serviço)
    // Usa handleMediaPickResult para centralizar regras de limite e cancelamento.
    // MELHORIA: considerar exibir um feedback de progresso durante a seleção de mídia
    // em dispositivos mais lentos, melhorando percepção de performance.
    const onPickMedia = async () => {
        try {
            const res = await pickMedia(form.mediaFiles, OFERTA_MEDIA_CONFIG);

            handleMediaPickResult(
                res,
                (files) => setForm((prev) => ({ ...prev, mediaFiles: files })),
                OFERTA_MEDIA_CONFIG.MAX_FILES
            );
        } catch (err) {
            // Tratamento de erro caso a galeria não seja aberta ou ocorra alguma falha
            console.error('Erro ao selecionar mídia:', err);
            Alert.alert('Erro', 'Não foi possível abrir a galeria.');
        }
    };

    // Remove um item de mídia do array pelo índice
    const onRemoveMedia = (index: number) => {
        setForm((prev) => ({
            ...prev,
            mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
        }));
    };

    // Envio do formulário: valida dados, faz upload das mídias e chama o serviço de criação
    // MELHORIA: extrair o fluxo de envio (upload + create) para um hook/use-case
    // reutilizável, facilitando testes e manutenção.
    const onSubmit = async () => {
        setSubmitting(true);
        setErrors({});

        // Validação com Zod (criarOfertaSchema). Caso inválido, espalha mensagens por campo.
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
            // 1) Upload de mídias (se houver). Backend espera /upload/files (GridFS)
            let imageUrls: string[] = [];
            let videoUrls: string[] = [];
            if (form.mediaFiles.length > 0) {
                try {
                    // Log e validação básica dos arquivos antes do upload
                    // MELHORIA: evitar logs em produção; usar if (__DEV__) ou logger com níveis.
                    console.log('Qtd de mídias:', form.mediaFiles.length);
                    form.mediaFiles.forEach((m, i) => {
                        console.log('Media', i, {
                            uri: (m as any)?.uri,
                            name: (m as any)?.name,
                            type: (m as any)?.type,
                        });
                    });

                    // Verifica se cada mídia possui uri/name/type válidos
                    // MELHORIA: tipar corretamente o item de mídia (evitar any) com um tipo MediaFile
                    // compartilhado entre picker e upload.
                    const allValid = form.mediaFiles.every(
                        (m: any) =>
                            m &&
                            typeof m.uri === 'string' && m.uri.length > 0 &&
                            typeof m.name === 'string' && m.name.length > 0 &&
                            typeof m.type === 'string' && m.type.length > 0
                    );
                    if (!allValid) {
                        Alert.alert(
                            'Erro',
                            'Arquivos de mídia inválidos. Tente selecionar novamente.'
                        );
                        return; // finally abaixo garantirá reset do submitting
                    }

                    // Garante não exceder o limite configurado de arquivos
                    const filesToUpload = form.mediaFiles.slice(0, OFERTA_MEDIA_CONFIG.MAX_FILES);

                    // Chama serviço de upload que devolve arrays de URLs de imagens e vídeos
                    const uploadRes = await uploadFiles(filesToUpload);
                    imageUrls = uploadRes.images || [];
                    videoUrls = uploadRes.videos || [];

                    // MELHORIA: exibir progresso de upload por arquivo e total (UX)
                } catch (err: any) {
                    console.error(
                        'Erro no upload de mídia (uploadFiles):',
                        err?.response?.data || err
                    );
                    const message =
                        err?.response?.data?.message ||
                        err?.message ||
                        'Falha no upload de mídias.';
                    Alert.alert('Erro no upload', String(message));
                    return; // finally garante reset de loading
                }
            }

            // 2) Monta o payload JSON esperado pelo backend
            // Converte preço mascarado (R$) para número (centavos/reais conforme util)
            const preco = parseCurrencyBRLToNumber(form.precoText);
            // MELHORIA: substituir any por um tipo OfertaCreatePayload forte
            const payload: any = {
                titulo: form.titulo.trim(),
                descricao: form.descricao.trim(),
                preco,
                unidadePreco: form.priceUnit,
                categoria: form.categoria,
                localizacao: { cidade: form.cidade, estado: form.estado },
                imagens: imageUrls,
            };
            if (form.subcategoria) payload.subcategoria = form.subcategoria;
            if (videoUrls.length) payload.videos = videoUrls; // inclui vídeos apenas se houver

            // 3) Cria a oferta na API e navega para o detalhe da oferta criada
            const created = await ofertaService.createOferta(payload);
            Alert.alert('Sucesso', 'Oferta criada com sucesso!');
            // MELHORIA: validar se created tem o shape esperado antes de navegar
            navigation.replace('OfferDetail', { oferta: created });
        } catch (e: any) {
            // Tratamento de erros genéricos do fluxo de criação
            console.error('Erro ao criar oferta:', e?.response?.data || e);
            const message =
                e?.response?.data?.message || e?.message || 'Não foi possível criar a oferta.';
            Alert.alert('Erro', String(message));
        } finally {
            // Garante que o loading será desligado mesmo em retornos antecipados
            setSubmitting(false);
        }
    };

    // No formulário: ID de categoria selecionada (adaptado de watch)
    const categoriaId = form.categoria;

    // Renderização do formulário dentro de um ScrollView para comportar telas pequenas
    // MELHORIA: considerar KeyboardAvoidingView para melhor UX com teclado aberto.
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="titleLarge" style={styles.title}>Criar Oferta</Text>

            {/* Campo: Título da oferta */}
            <TextInput
                label="Título"
                value={form.titulo}
                onChangeText={(t) => setField('titulo', t)}
                style={styles.input}
                mode="outlined"
                error={!!errors.titulo}
                // MELHORIA: adicionar accessibilityLabel e testID para testes e acessibilidade
            />
            {!!errors.titulo && <HelperText type="error">{errors.titulo}</HelperText>}

            {/* Campo: Descrição da oferta */}
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

            {/* Preço + unidade lado a lado para melhor usabilidade */}
            <View style={styles.row}>
                <TextInput
                    label="Preço"
                    value={form.precoText}
                    onChangeText={(t) => setField('precoText', maskCurrencyInput(t))}
                    style={[styles.input, styles.priceInput]}
                    mode="outlined"
                    keyboardType="numeric"
                    error={!!errors.precoText}
                    // MELHORIA: em iOS/Android, avaliar usar keyboardType apropriado (decimal-pad)
                />

                <View style={styles.priceUnitContainer}>
                    <Text style={styles.label}>Preço por</Text>
                    {/* Lista horizontal e compacta para evitar overflow em telas estreitas */}
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
            {!!errors.precoText && <HelperText type="error">{errors.precoText}</HelperText>}
            {!!errors.priceUnit && <HelperText type="error">{errors.priceUnit}</HelperText>}

            {/* Seleção de categoria e subcategoria */}
            <CategorySubcategoryPicker
                key={`cat-${categoriaId || 'none'}`}
                selectedCategoryId={categoriaId}
                selectedSubcategoryId={form.subcategoria}
                onCategoryChange={(id) => {
                    setField('categoria', id);
                    // Ao trocar a categoria, limpamos a subcategoria para evitar estado inválido
                    setField('subcategoria', undefined as any);
                }}
                onSubcategoryChange={(id) => setField('subcategoria', id)}
            />
            {!!errors.categoria && <HelperText type="error">{errors.categoria}</HelperText>}

            {/* Seleção de Estado (UF) com preenchimento automático da capital como cidade */}
            <EstadoSelect
                value={form.estado}
                onChange={(uf, capital) => {
                    setField('estado', uf);
                    if (capital) setField('cidade', capital);
                }}
            />
            {!!errors.estado && <HelperText type="error">{errors.estado}</HelperText>}

            {/* Campo somente leitura para cidade (preenchido automaticamente) */}
            <TextInput
                label="Cidade (automática)"
                value={form.cidade}
                style={styles.input}
                mode="outlined"
                editable={false}
                error={!!errors.cidade}
                // MELHORIA: permitir edição manual opcional caso o usuário não esteja na capital
            />
            {!!errors.cidade && <HelperText type="error">{errors.cidade}</HelperText>}

            {/* Seletor de mídias com preview e remoção */}
            <MediaChips
                title={`Mídias (até ${OFERTA_MEDIA_CONFIG.MAX_FILES})`}
                mediaFiles={form.mediaFiles}
                onRemove={onRemoveMedia}
                onAddPress={onPickMedia}
                max={OFERTA_MEDIA_CONFIG.MAX_FILES}
            />
            {!!errors.mediaFiles && <HelperText type="error">{errors.mediaFiles}</HelperText>}

            {/* Botão principal de envio */}
            <Button
                mode="contained"
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={submitting}
                style={styles.submit}
            >
                Publicar oferta
            </Button>
        </ScrollView>
    );
};

// Estilos básicos da tela
// MELHORIA: padronizar estilos com theme spacing/typography escaláveis (RN Paper)
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
    // Layout horizontal para Preço + Unidade
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        flexWrap: 'wrap', // permite quebrar para a linha de baixo em telas pequenas
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
    submit: {
        marginTop: spacing.md,
    },
});

export default CriarOfertaScreen;
