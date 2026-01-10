import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ProfileCompletionChecklist } from '../ProfileCompletionChecklist';
import { User } from '@/types';
import AnalyticsService from '@/services/AnalyticsService';


(global as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigateTo = jest.fn();
jest.mock('../../../hooks/useChecklistNavigation', () => ({
  useChecklistNavigation: () => ({ navigateTo: mockNavigateTo })
}));

// Mock do React Native seguindo o padrão do projeto
jest.mock('react-native', () => {
  const React = require('react');
  const View = (props: any) => React.createElement('view', props, props.children);
  const Text = (props: any) => React.createElement('text', props, props.children);
  const Pressable = (props: any) => React.createElement('pressable', props, props.children);
  const StyleSheet = {
    create: (s: any) => s,
    flatten: (s: any) => {
      if (Array.isArray(s)) {
        return Object.assign({}, ...s.map((i: any) => (typeof i === 'object' ? i : {})));
      }
      return s || {};
    },
  };
  return {
    View,
    Text,
    Pressable,
    StyleSheet,
    Appearance: { getColorScheme: () => 'light' },
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
  };
});

// Mock do AnalyticsService
jest.mock('@/services/AnalyticsService', () => ({
  track: jest.fn(),
}));

describe('ProfileCompletionChecklist', () => {
  const mockOnDismiss = jest.fn();

  const getBaseUser = (): User => ({
    id: '1',
    nome: 'John Doe',
    email: 'john@example.com',
    tipo: 'buyer',
    tipoPessoa: 'PF',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const getCompleteUser = (): User => ({
    ...getBaseUser(),
    avatar: 'http://image.com',
    telefone: '(11) 99999-9999',
    localizacao: { cidade: 'SP', estado: 'SP' },
    cpf: '52998224725', // CPF válido
  });

  const hasText = (tree: any, text: string) => {
    return tree.root.findAllByType('text').some((t: any) => {
      const children = t.props.children;
      const content = Array.isArray(children) ? children.join('') : String(children);
      return content.includes(text);
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('não deve renderizar nada se o perfil estiver 100% completo', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ProfileCompletionChecklist user={getCompleteUser()} onDismiss={mockOnDismiss} />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('deve renderizar a porcentagem de conclusão e os itens para um perfil parcial', () => {
    // getBaseUser() tem 0% pois faltam todos os itens obrigatórios (avatar, phone, location, cpf)
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} />
      );
    });
    
    expect(tree.toJSON()).not.toBeNull();

    expect(hasText(tree, '0%')).toBe(true);
    expect(hasText(tree, 'Adicionar foto de perfil')).toBe(true);
    expect(hasText(tree, 'Adicionar CPF')).toBe(true);
  });

  it('deve chamar onDismiss quando o botão de fechar é clicado', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} />
      );
    });
    
    const pressables = tree.root.findAllByType('pressable');
    const closeButton = pressables.find(p => p.props.accessibilityLabel === 'Dispensar checklist');
    
    expect(closeButton).toBeTruthy();
    act(() => {
      closeButton!.props.onPress();
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(AnalyticsService.track).toHaveBeenCalledWith('profile_checklist_dismiss', expect.any(Object));
  });

  it('deve chamar navigateTo do hook quando um item do checklist é clicado', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} />
      );
    });

    const pressables = tree.root.findAllByType('pressable');
    const item = pressables.find(p => {
        try {
          const textComponent = p.findByType('text');
          return textComponent.props.children === 'Adicionar';
        } catch { return false; }
    });

    expect(item).toBeTruthy();
    act(() => {
        item!.props.onPress();
    });

    expect(mockNavigateTo).toHaveBeenCalledWith('avatar');
  });

  it('deve mostrar itens como concluídos quando isComplete é true', () => {
    const halfUser = {
        ...getBaseUser(),
        avatar: 'http://image.com',
        telefone: '(11) 99999-9999'
    };

    let tree: any;
    act(() => {
      tree = renderer.create(
        <ProfileCompletionChecklist user={halfUser} onDismiss={mockOnDismiss} />
      );
    });

    expect(hasText(tree, '50%')).toBe(true);
    
    const views = tree.root.findAllByType('view');
    const completedIcons = views.filter(v => v.props.accessibilityLabel === 'Concluído');
    const pendingIcons = views.filter(v => v.props.accessibilityLabel === 'Pendente');

    expect(completedIcons.length).toBe(2);
    expect(pendingIcons.length).toBe(2);
  });
});
