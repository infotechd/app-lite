import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, HelperText } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import { criarOfertaSchema, CriarOfertaForm, OFERTA_MEDIA_CONFIG } from '@/utils/validation';
import { ofertaService } from '@/services/ofertaService';
import { uploadFiles } from '@/services/uploadService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import CategoryChips from '@/components/CategoryChips';
import EstadoSelect from '@/components/EstadoSelect';
import MediaChips from '@/components/MediaChips';
import { pickMedia } from '@/services/mediaPickerService';
import { maskCurrencyInput, parseCurrencyBRLToNumber } from '@/utils/currency';

import { CATEGORIES } from '@/constants/categories';
import { handleMediaPickResult } from '@/utils/mediaPickHandlers';

type Props = NativeStackScreenProps<OfertasStackParamList, 'CreateOferta'>;


const CriarOfertaScreen: React.FC<Props> = ({ navigation }) => {
    const [form, setForm] = useState<CriarOfertaForm>({
        titulo: '',
        descricao: '',
        precoText: '',
        categoria: '',
        cidade: '',
        estado: '',
        mediaFiles: [],
    });
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [submitting, setSubmitting] = useState(false);

    const canSubmit = useMemo(() => {
        const price = parseCurrencyBRLToNumber(form.precoText);
        return form.titulo.trim().length > 0 && form.descricao.trim().length > 0 && price > 0 && form.categoria.trim().length > 0 && form.cidade.trim().length > 0 && form.estado.trim().length === 2 && !submitting;
    }, [form, submitting]);

    const setField = <K extends keyof CriarOfertaForm>(key: K, value: CriarOfertaForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const onPickMedia = async () => {
        try {
            const res = await pickMedia(form.mediaFiles, OFERTA_MEDIA_CONFIG);

            handleMediaPickResult(
                res,
                (files) => setForm((prev) => ({ ...prev, mediaFiles: files })),
                OFERTA_MEDIA_CONFIG.MAX_FILES
            );
        } catch (err) {
            console.error('Erro ao selecionar mídia:', err);
            Alert.alert('Erro', 'Não foi possível abrir a galeria.');
        }
    };

    const onRemoveMedia = (index: number) => {
        setForm((prev) => ({ ...prev, mediaFiles: prev.mediaFiles.filter((_, i) => i !== index) }));
    };

    const onSubmit = async () => {
        setSubmitting(true);
        setErrors({});

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
            // 1) Upload media (if any) to GridFS via /upload/files
            let imageUrls: string[] = [];
            let videoUrls: string[] = [];
            if (form.mediaFiles.length > 0) {
                const uploadRes = await uploadFiles(form.mediaFiles.slice(0, OFERTA_MEDIA_CONFIG.MAX_FILES));
                imageUrls = uploadRes.images;
                videoUrls = uploadRes.videos;
            }

            // 2) Build JSON payload expected by backend
            const preco = parseCurrencyBRLToNumber(form.precoText);
            const payload: any = {
                titulo: form.titulo.trim(),
                descricao: form.descricao.trim(),
                preco,
                categoria: form.categoria,
                localizacao: { cidade: form.cidade, estado: form.estado },
                imagens: imageUrls,
            };
            if (videoUrls.length) payload.videos = videoUrls;

            // 3) Create oferta with JSON
            const created = await ofertaService.createOferta(payload);
            Alert.alert('Sucesso', 'Oferta criada com sucesso!');
            navigation.replace('OfferDetail', { oferta: created });
        } catch (e: any) {
            console.error('Erro ao criar oferta:', e?.response?.data || e);
            const message = e?.response?.data?.message || e?.message || 'Não foi possível criar a oferta.';
            Alert.alert('Erro', String(message));
        } finally {
            setSubmitting(false);
        }
    };

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

            <CategoryChips categories={CATEGORIES} value={form.categoria} onChange={(cat) => setField('categoria', cat)} />
            {!!errors.categoria && <HelperText type="error">{errors.categoria}</HelperText>}

            <EstadoSelect value={form.estado} onChange={(uf, capital) => { setField('estado', uf); if (capital) setField('cidade', capital); }} />
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

            <MediaChips title={`Mídias (até ${OFERTA_MEDIA_CONFIG.MAX_FILES})`} mediaFiles={form.mediaFiles} onRemove={onRemoveMedia} onAddPress={onPickMedia} max={OFERTA_MEDIA_CONFIG.MAX_FILES} />
            {!!errors.mediaFiles && <HelperText type="error">{errors.mediaFiles}</HelperText>}

            <Button mode="contained" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submit}>
                Publicar oferta
            </Button>
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

export default CriarOfertaScreen;
