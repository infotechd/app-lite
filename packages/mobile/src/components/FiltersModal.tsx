import React, { useEffect, useRef } from 'react';
import { ScrollView, View, AccessibilityInfo, findNodeHandle } from 'react-native';
import { Modal, Text, Divider, TextInput, HelperText, Switch, SegmentedButtons, Button } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';
import { BRAZIL_STATES } from '@/constants/brazilStates';
import DropdownPicker, { DropdownOption } from './form/DropdownPicker';

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

  const categoryOptions: DropdownOption[] = categories.map((cat) => ({
    label: cat,
    value: cat,
  }));

  const stateOptions: DropdownOption[] = BRAZIL_STATES.map((state) => ({
    label: state.nome,
    value: state.uf,
  }));

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
      contentContainerStyle={{ backgroundColor: colors.background, margin: spacing.md, borderRadius: radius.xl, padding: spacing.md, maxHeight: '80%' }}
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
        <DropdownPicker
          options={categoryOptions}
          selectedValue={draft.categoria || null}
          onValueChange={(value) => onChange({ categoria: value as string })}
          placeholder="Todas as categorias"
        />

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

        <DropdownPicker
          label="Estado"
          options={stateOptions}
          selectedValue={draft.estado || null}
          onValueChange={(value) => onChange({ estado: value as string })}
          placeholder="Todos os estados"
        />

        <TextInput
          label="Cidade"
          mode="outlined"
          value={draft.cidade}
          onChangeText={(v) => onChange({ cidade: v })}
          style={{ marginBottom: spacing.sm }}
          placeholder="Digite a cidade"
        />

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
