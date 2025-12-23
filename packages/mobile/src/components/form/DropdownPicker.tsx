import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/styles/theme';

export interface DropdownOption {
  label: string;
  value: string | number;
}

interface DropdownPickerProps {
  options: DropdownOption[];
  selectedValue: string | number | null;
  onValueChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  testID?: string;
  optionTestIDPrefix?: string;
  disabled?: boolean;
}

export const DropdownPicker: React.FC<DropdownPickerProps> = ({
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Selecione uma opção',
  label,
  error,
  testID,
  optionTestIDPrefix,
  disabled,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelectOption = (value: string | number) => {
    onValueChange(value);
    setIsModalVisible(false);
  };

  const renderOption = ({ item }: { item: DropdownOption }) => (
    <Pressable
      testID={optionTestIDPrefix ? `${optionTestIDPrefix}${item.value}` : undefined}
      style={[
        styles.optionItem,
        item.value === selectedValue && styles.optionItemSelected,
      ]}
      onPress={() => handleSelectOption(item.value)}
    >
      <Text
        style={[
          styles.optionText,
          item.value === selectedValue && styles.optionTextSelected,
        ]}
      >
        {item.label}
      </Text>
      {item.value === selectedValue && (
        <MaterialIcons name="check" size={20} color={colors.primary} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        testID={testID}
        style={[
          styles.button,
          error && styles.buttonError,
          disabled && styles.buttonDisabled
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
      >
        <Text style={[
          styles.buttonText,
          !selectedValue && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {selectedLabel}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={disabled ? colors.textDisabled : colors.textSecondary} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Selecione uma opção'}</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={(item) => String(item.value)}
              scrollEnabled={options.length > 6}
              style={styles.optionsList}
            />
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  buttonError: {
    borderColor: colors.error,
  },
  buttonDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  disabledText: {
    color: colors.textDisabled,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  optionsList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    marginVertical: 4,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  optionItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});

export default DropdownPicker;
