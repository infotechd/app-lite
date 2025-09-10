import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, HelperText, Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import { criarOfertaSchema, MediaFile, OFERTA_MEDIA_CONFIG } from '@/utils/validation';
import { ofertaService } from '@/services/ofertaService';
import { uploadFiles } from '@/services/uploadService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfertasStackParamList } from '@/types';
import { maskCurrencyInput, parseCurrencyBRLToNumber, formatCurrencyBRL } from '@/utils/currency';

import { CATEGORIES } from '@/constants/categories';
import CategoryChips from '@/components/CategoryChips';
import EstadoSelect from '@/components/EstadoSelect';
import MediaChips from '@/components/MediaChips';
import { pickMedia } from '@/services/mediaPickerService';
import { handleMediaPickResult } from '@/utils/mediaPickHandlers';

type Props = NativeStackScreenProps<OfertasStackParamList, 'EditOferta'>;

type EditForm = {
    titulo: string;
    descricao: string;
    precoText: string;
    categoria: string;
    cidade: string;
    estado: string;
    keptImages: string[]; // existing remote URLs to keep
    keptVideos: string[]; // existing remote URLs to keep
    newMediaFiles: MediaFile[]; // new local files to upload
};

const EditarOfertaScreen: React.FC<Props> = ({ route, navigation }) => {
    const oferta = route.params.oferta;

    const [form, setForm] = useState<EditForm>({
        titulo: oferta.titulo || '',
        descricao: oferta.descricao || '',
        precoText: oferta.preco > 0 ? formatCurrencyBRL(oferta.preco) : '',
        categoria: oferta.categoria || '',
        cidade: oferta.localizacao?.cidade || '',
        estado: oferta.localizacao?.estado || '',
        keptImages: Array.isArray(oferta.imagens) ? oferta.imagens : [],
        keptVideos: Array.isArray((oferta as any).videos) ? (oferta as any).videos : [],
        newMediaFiles: [],
    });
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [submitting, setSubmitting] = useState(false);

    const totalMidias = form.keptImages.length + form.keptVideos.length + form.newMediaFiles.length;

    const canSubmit = useMemo(() => {
        const price = parseCurrencyBRLToNumber(form.precoText);
        return (
            form.titulo.trim().length > 0 &&
            form.descricao.trim().length > 0 &&
            price > 0 &&
            form.categoria.trim().length > 0 &&
            form.cidade.trim().length > 0 &&
            form.estado.trim().length === 2 &&
            totalMidias <= OFERTA_MEDIA_CONFIG.MAX_FILES &&
            !submitting
        );
    }, [form, submitting]);

    const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const onPickMedia = async () => {
        try {
            const spaceLeft = OFERTA_MEDIA_CONFIG.MAX_FILES - (form.keptImages.length + form.keptVideos.length);
            if (spaceLeft <= 0) {
                Alert.alert('Limite atingido', `Você pode enviar no máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} arquivos.`);
                return;
            }

            const res = await pickMedia(form.newMediaFiles, { ...OFERTA_MEDIA_CONFIG, MAX_FILES: spaceLeft });

            handleMediaPickResult(
                res,
                (files) => setForm((prev) => ({ ...prev, newMediaFiles: files })),
                spaceLeft
            );
        } catch (err) {
            console.error('Erro ao selecionar mídia:', err);
            Alert.alert('Erro', 'Não foi possível abrir a galeria.');
        }
    };

    const onRemoveKeptImage = (index: number) => {
        setForm((prev) => ({ ...prev, keptImages: prev.keptImages.filter((_, i) => i !== index) }));
    };

    const onRemoveKeptVideo = (index: number) => {
        setForm((prev) => ({ ...prev, keptVideos: prev.keptVideos.filter((_, i) => i !== index) }));
    };

    const onRemoveNewMedia = (index: number) => {
        setForm((prev) => ({ ...prev, newMediaFiles: prev.newMediaFiles.filter((_, i) => i !== index) }));
    };

    const onSubmit = async () => {
        setSubmitting(true);
        setErrors({});

        // Reaproveitar validação de criação para campos de texto/UF/preço
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
            let imageUrls: string[] = [];
            let videoUrls: string[] = [];
            if (form.newMediaFiles.length > 0) {
                const uploadRes = await uploadFiles(form.newMediaFiles);
                imageUrls = uploadRes.images;
                videoUrls = uploadRes.videos;
            }

            const preco = parseCurrencyBRLToNumber(form.precoText);

            const finalImages = [...form.keptImages, ...imageUrls];
            const finalVideos = [...form.keptVideos, ...videoUrls];
            if (finalImages.length + finalVideos.length > OFERTA_MEDIA_CONFIG.MAX_FILES) {
                Alert.alert('Limite de mídias', `Máximo de ${OFERTA_MEDIA_CONFIG.MAX_FILES} mídias (imagens + vídeos).`);
                setSubmitting(false);
                return;
            }

            const payload: any = {
                titulo: form.titulo.trim(),
                descricao: form.descricao.trim(),
                preco,
                categoria: form.categoria,
                localizacao: { cidade: form.cidade, estado: form.estado },
                imagens: finalImages,
            };
            if (finalVideos.length) payload.videos = finalVideos;

            const updated = await ofertaService.updateOferta(oferta._id, payload);
            Alert.alert('Sucesso', 'Oferta atualizada com sucesso!');
            navigation.replace('OfferDetail', { oferta: updated });
        } catch (e: any) {
            console.error('Erro ao atualizar oferta:', e?.response?.data || e);
            const message = e?.response?.data?.message || e?.message || 'Não foi possível atualizar a oferta.';
            Alert.alert('Erro', String(message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="titleLarge" style={styles.title}>Editar Oferta</Text>

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
            <MediaChips
                title="Novas mídias"
                mediaFiles={form.newMediaFiles}
                onRemove={onRemoveNewMedia}
                onAddPress={onPickMedia}
                max={Math.max(0, OFERTA_MEDIA_CONFIG.MAX_FILES - (form.keptImages.length + form.keptVideos.length))}
            />
            {!!errors.mediaFiles && <HelperText type="error">{errors.mediaFiles}</HelperText>}

            <Button mode="contained" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submit}>
                Salvar alterações
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

export default EditarOfertaScreen;
