import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';
import CategorySubcategoryPicker from '@/components/CategorySubcategoryPicker';
import { CATEGORIES } from '@/constants/categories';

describe('CategorySubcategoryPicker - efeito de sincronização', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('não deve chamar onSubcategoryChange na montagem quando não há categoria e subcategoria indefinida', async () => {
    const onCat = jest.fn();
    const onSub = jest.fn();

    render(
      <CategorySubcategoryPicker
        selectedCategoryId={undefined}
        selectedSubcategoryId={undefined}
        onCategoryChange={onCat}
        onSubcategoryChange={onSub}
      />
    );

    // Aguarda ciclo de efeito
    await waitFor(() => {
      expect(onSub).not.toHaveBeenCalled();
    });
  });

  it('deve limpar subcategoria inválida quando categoria muda (chama onSubcategoryChange(undefined) uma vez)', async () => {
    const onCat = jest.fn();
    const onSub = jest.fn();

    const catA = CATEGORIES[0];
    const invalidSubFromOther = CATEGORIES[1].subcategorias[0].id; // não pertence à catA

    render(
      <CategorySubcategoryPicker
        selectedCategoryId={catA.id}
        selectedSubcategoryId={invalidSubFromOther}
        onCategoryChange={onCat}
        onSubcategoryChange={onSub}
      />
    );

    await waitFor(() => {
      expect(onSub).toHaveBeenCalledTimes(1);
      expect(onSub).toHaveBeenCalledWith(undefined);
    });
  });

  it('não deve limpar quando subcategoria é válida para a categoria selecionada', async () => {
    const onCat = jest.fn();
    const onSub = jest.fn();

    const catB = CATEGORIES[1];
    const validSub = catB.subcategorias[0].id;

    render(
      <CategorySubcategoryPicker
        selectedCategoryId={catB.id}
        selectedSubcategoryId={validSub}
        onCategoryChange={onCat}
        onSubcategoryChange={onSub}
      />
    );

    await waitFor(() => {
      expect(onSub).not.toHaveBeenCalled();
    });
  });
});
