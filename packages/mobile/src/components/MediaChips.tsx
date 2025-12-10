import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import { MediaFile } from '@/utils/validation';

/**
 * Propriedades do componente MediaChips.
 *
 * Representa um grupo de chips (etiquetas) que exibem arquivos de mídia já selecionados
 * e um chip adicional para acionar a inclusão de novos itens, respeitando um limite máximo.
 */
interface MediaChipsProps {
    /**
     * Título exibido acima da lista de chips.
     * Caso não seja fornecido, utiliza "Mídias" como padrão.
     */
    title?: string;
    /**
     * Lista de arquivos de mídia selecionados a serem exibidos como chips.
     */
    mediaFiles: MediaFile[];
    /**
     * Callback acionado ao remover um chip específico.
     * Recebe o índice do item removido dentro do array `mediaFiles`.
     */
    onRemove: (index: number) => void;
    /**
     * Callback acionado ao pressionar o chip de adicionar nova mídia.
     */
    onAddPress: () => void;
    /**
     * Quantidade máxima de mídias permitida. Enquanto `mediaFiles.length` for menor
     * que este valor, o chip de "Adicionar" continuará visível.
     */
    max: number;
}

/**
 * Componente de apresentação que exibe chips de mídias e um atalho para adicionar novas mídias.
 *
 * Regras de exibição:
 * - Para cada item de `mediaFiles`, um Chip é renderizado com ícone condicional (vídeo ou imagem)
 *   e botão de fechar para remoção.
 * - Se a quantidade atual for menor que `max`, um Chip adicional com ícone de "plus" é exibido
 *   para acionar `onAddPress`.
 *
 * Acessibilidade e UX:
 * - O título ajuda a contextualizar o grupo.
 * - Os chips indicam o nome do arquivo e permitem remoção rápida.
 *
 * @param props.title Título exibido acima da lista de chips. Padrão: 'Mídias'.
 * @param props.mediaFiles Lista de arquivos de mídia selecionados a serem exibidos.
 * @param props.onRemove Função chamada ao fechar um chip; recebe o índice removido.
 * @param props.onAddPress Função chamada ao tocar no chip "Adicionar".
 * @param props.max Limite máximo de mídias; controla a visibilidade do chip de adição.
 * @returns Elemento JSX contendo o título e a linha de chips de mídia.
 */
const MediaChips: React.FC<MediaChipsProps> = ({ title = 'Mídias', mediaFiles, onRemove, onAddPress, max }) => {
    return (
        <View>
            {/* Título do agrupamento de chips */}
            <Text variant="titleSmall" style={styles.label}>{`${title}`}</Text>

            {/* Linha flexível contendo os chips de mídias e o chip de adicionar */}
            <View style={styles.row}>
                {/* Renderiza um Chip para cada arquivo de mídia selecionado */}
                {mediaFiles.map((m, idx) => (
                    <Chip
                        key={`${m.uri}-${idx}`}
                        // Ícone é definido pelo tipo MIME: se inicia com 'video', usa ícone de vídeo; caso contrário, imagem
                        icon={m.type.startsWith('video') ? 'video' : 'image'}
                        // Ao fechar o chip, solicita ao componente pai que remova o item pelo índice
                        onClose={() => onRemove(idx)}
                        style={styles.chip}
                    >
                        {/* Nome legível do arquivo de mídia */}
                        {m.name}
                    </Chip>
                ))}
                {/* Exibe o chip de adição somente enquanto não atingir o limite `max` */}
                {mediaFiles.length < max && (
                    <Chip icon="plus" onPress={onAddPress} style={styles.chip}>
                        Adicionar
                    </Chip>
                )}
            </View>
        </View>
    );
};

/**
 * Estilos do componente.
 * - label: espaçamentos do título acima da linha de chips.
 * - row: layout em linha com quebra automática para múltiplos chips.
 * - chip: espaçamento entre chips para melhor legibilidade e toque.
 */
const styles = StyleSheet.create({
    label: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    row: {
        flexDirection: 'row', // Disposição horizontal dos chips
        flexWrap: 'wrap',     // Permite que os chips quebrem linha quando não houver espaço
        marginBottom: spacing.sm,
    },
    chip: {
        marginRight: spacing.xs,  // Espaço horizontal entre chips consecutivos
        marginBottom: spacing.xs, // Espaço vertical entre linhas de chips
    },
});

export default MediaChips;
