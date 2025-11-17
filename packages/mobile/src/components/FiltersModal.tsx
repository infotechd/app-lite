import React, { useEffect, useRef } from 'react';
import { ScrollView, View, AccessibilityInfo, findNodeHandle } from 'react-native';
import { Modal, Text, Divider, Chip, TextInput, HelperText, Switch, SegmentedButtons, Button } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import { UF_LIST } from '@/constants/oferta';

export type TipoPessoa = 'PF' | 'PJ' | 'todos';

export type FiltersDraft = {
  categoria?: string;
  precoMin: string;
  precoMax: string;
  cidade: string;
  estado?: string;
  comMidia: boolean;
  tipoPessoa: TipoPessoa;
};

type FiltersModalProps = {
  visible: boolean;
  onDismiss: () => void;
  draft: FiltersDraft;
  onChange: (patch: Partial<FiltersDraft>) => void;
  onApply: () => void;
  onClear: () => void;
  categories: string[];
};

const FiltersModal: React.FC<FiltersModalProps> = ({ visible, onDismiss, draft, onChange, onApply, onClear, categories }) => {
  const categoriaTitleRef = useRef<any>(null);

  useEffect(() => {
    if (visible && categoriaTitleRef.current) {
      const node = findNodeHandle(categoriaTitleRef.current);
      if (node) {
        try { AccessibilityInfo.setAccessibilityFocus(node); } catch {}
      }
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={{ backgroundColor: colors.background, margin: spacing.md, borderRadius: 16, padding: spacing.md, maxHeight: '80%' }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        accessible
        accessibilityLabel="Filtros de busca"
        accessibilityHint="Ajuste os filtros e aplique para atualizar os resultados"
      >
        <Text
          ref={categoriaTitleRef}
          variant="titleMedium"
          style={{ marginBottom: spacing.sm }}
          accessibilityRole="header"
        >
          Categoria
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              mode={draft.categoria === cat ? 'flat' : 'outlined'}
              selected={draft.categoria === cat}
              onPress={() => onChange({ categoria: draft.categoria === cat ? undefined : cat })}
              style={{ marginRight: spacing.sm, marginBottom: spacing.sm, minWidth: 92, justifyContent: 'center' }}
              accessibilityLabel={`${cat}${draft.categoria === cat ? ', selecionado' : ''}`}
              accessibilityHint={draft.categoria === cat ? 'Toque para desmarcar' : 'Toque para selecionar'}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.categoria === cat }}
            >
              {cat}
            </Chip>
          ))}
        </View>

        <Divider style={{ marginVertical: spacing.md }} />
        <Text variant="titleMedium" style={{ marginBottom: spacing.sm }}>Preço</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            label="Mínimo"
            mode="outlined"
            keyboardType="numeric"
            value={draft.precoMin}
            onChangeText={(v) => onChange({ precoMin: v })}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <TextInput
            label="Máximo"
            mode="outlined"
            keyboardType="numeric"
            value={draft.precoMax}
            onChangeText={(v) => onChange({ precoMax: v })}
            style={{ flex: 1 }}
          />
        </View>
        <HelperText type="info" visible>Deixe em branco para não filtrar</HelperText>

        <Divider style={{ marginVertical: spacing.md }} />
        <Text variant="titleMedium" style={{ marginBottom: spacing.sm }}>Localização</Text>
        <TextInput
          label="Cidade"
          mode="outlined"
          value={draft.cidade}
          onChangeText={(v) => onChange({ cidade: v })}
          style={{ marginBottom: spacing.sm }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {UF_LIST.map((uf) => (
            <Chip
              key={uf}
              mode={draft.estado === uf ? 'flat' : 'outlined'}
              selected={draft.estado === uf}
              onPress={() => onChange({ estado: draft.estado === uf ? undefined : uf })}
              style={{ marginRight: spacing.sm, marginBottom: spacing.sm, minWidth: 60, justifyContent: 'center' }}
              accessibilityLabel={`${uf}${draft.estado === uf ? ', selecionado' : ''}`}
              accessibilityHint={draft.estado === uf ? 'Toque para desmarcar' : 'Toque para selecionar'}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.estado === uf }}
            >
              {uf}
            </Chip>
          ))}
        </View>

        <Divider style={{ marginVertical: spacing.md }} />
        <Text variant="titleMedium" style={{ marginBottom: spacing.sm }}>Preferências</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text accessibilityLabel="Apenas com fotos e vídeos">Apenas com fotos/vídeos</Text>
          <Switch value={draft.comMidia} onValueChange={(v) => onChange({ comMidia: v })} accessibilityRole="switch" accessibilityLabel="Apenas com fotos e vídeos" accessibilityState={{ checked: draft.comMidia }} />
        </View>

        <Text variant="labelMedium" style={{ marginBottom: spacing.xs }}>Tipo de Prestador</Text>
        <SegmentedButtons
          value={draft.tipoPessoa}
          onValueChange={(val) => onChange({ tipoPessoa: (val as any) || 'todos' })}
          buttons={[
            { value: 'todos', label: 'Todos' },
            { value: 'PF', label: 'Pessoa Física' },
            { value: 'PJ', label: 'Pessoa Jurídica' },
          ]}
          style={{ marginBottom: spacing.sm }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
          <Button mode="text" onPress={onClear}>Limpar</Button>
          <View style={{ flex: 1 }} />
          <Button mode="text" onPress={onDismiss}>Cancelar</Button>
          <Button mode="contained" onPress={onApply}>Aplicar</Button>
        </View>
      </ScrollView>
    </Modal>
  );
};

export default FiltersModal;
