import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Isolar dependências nativas e de rede antes de importar a tela
jest.mock('@/services/mediaPickerService', () => ({
  __esModule: true,
  pickMedia: jest.fn(async () => ({ cancelled: true })),
}));

jest.mock('@/services/uploadService', () => ({
  __esModule: true,
  uploadFiles: jest.fn(async () => ({ images: [], videos: [], raw: [] })),
}));

jest.mock('@/services/ofertaService', () => ({
  __esModule: true,
  ofertaService: { createOferta: jest.fn(async (p) => ({ id: '1', ...p })) },
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
}));

import CriarOfertaScreen from '@/screens/app/CriarOfertaScreen';

// Navegação mock mínima para a tela
const navMock = {
  replace: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe('CriarOfertaScreen - Categoria/Subcategoria', () => {
  function renderScreen() {
    return render(
      <CriarOfertaScreen
        navigation={navMock}
        // route não é usado pela tela, mock simples para satisfazer assinatura
        route={{ key: 'CreateOferta', name: 'CreateOferta' } as any}
      />
    );
  }

  const selectCategory = (utils: ReturnType<typeof render>, id: string) => {
    const anchor = utils.getByTestId('category-anchor');
    fireEvent.press(anchor);
    const item = utils.getByTestId(`category-item-${id}`);
    fireEvent.press(item);
  };

  const selectSubcategory = (utils: ReturnType<typeof render>, id: string) => {
    const anchor = utils.getByTestId('subcategory-anchor');
    fireEvent.press(anchor);
    const item = utils.getByTestId(`subcategory-item-${id}`);
    fireEvent.press(item);
  };

  it('limpa a subcategoria quando a categoria muda', () => {
    const utils = renderScreen();

    // 1) Seleciona categoria Tecnologia
    selectCategory(utils, 'tecnologia');

    // 2) Seleciona subcategoria Python
    selectSubcategory(utils, 'python');

    // Verifica que o rótulo mostra a subcategoria escolhida
    const subAnchorAfterPick = utils.getByTestId('subcategory-anchor');
    expect(subAnchorAfterPick).toBeTruthy();
    // Conteúdo de texto do botão deve refletir a subcategoria
    expect(utils.getByText('Python')).toBeTruthy();

    // 3) Troca a categoria para Saúde (subcategoria anterior torna-se inválida)
    selectCategory(utils, 'saude');

    // Subcategoria deve ser limpa e rótulo volta ao padrão
    expect(utils.getByText('Selecione uma subcategoria')).toBeTruthy();
  });

  it('menus reabrem normalmente após seleção (sem travar)', () => {
    const utils = renderScreen();

    // Seleciona uma categoria inicialmente
    selectCategory(utils, 'tecnologia');

    // Reabrir menu de categoria deve exibir itens
    fireEvent.press(utils.getByTestId('category-anchor'));
    expect(utils.getByTestId('category-item-tecnologia')).toBeTruthy();

    // Abrir menu de subcategoria deve mostrar a opção de limpar
    fireEvent.press(utils.getByTestId('subcategory-anchor'));
    expect(utils.getByTestId('subcategory-item-none')).toBeTruthy();
  });

  it('lista de subcategorias muda conforme a categoria (rerender garantido)', () => {
    const utils = renderScreen();

    // Categoria 1: Tecnologia -> possui subcategoria "Python"
    selectCategory(utils, 'tecnologia');
    fireEvent.press(utils.getByTestId('subcategory-anchor'));
    expect(utils.getByTestId('subcategory-item-python')).toBeTruthy();

    // Fecha o menu (selecionando limpar)
    fireEvent.press(utils.getByTestId('subcategory-item-none'));

    // Muda para categoria 2: Saúde -> possui "Medicina", não "Python"
    selectCategory(utils, 'saude');
    fireEvent.press(utils.getByTestId('subcategory-anchor'));
    expect(utils.getByTestId('subcategory-item-medicina')).toBeTruthy();
    // Garante que item de Python não aparece nesta lista
    expect(utils.queryByTestId('subcategory-item-python')).toBeNull();
  });
});
