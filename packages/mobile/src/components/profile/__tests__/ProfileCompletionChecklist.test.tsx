import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ProfileCompletionChecklist } from '../ProfileCompletionChecklist';
import { User } from '@/types';
import AnalyticsService from '@/services/AnalyticsService';
import * as completionUtils from '@/utils/profile/calculateProfileCompletion';
import * as checklistUtils from '@/utils/profile/getProfileChecklistItems';

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

// Mock dos utilitários de perfil
jest.mock('@/utils/profile/calculateProfileCompletion');
jest.mock('@/utils/profile/getProfileChecklistItems');

describe('ProfileCompletionChecklist', () => {
  const mockOnDismiss = jest.fn();
  const mockNavigate = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não deve renderizar nada se o perfil estiver 100% completo', () => {
    (completionUtils.calculateProfileCompletion as jest.Mock).mockReturnValue(100);
    (checklistUtils.getProfileChecklistItems as jest.Mock).mockReturnValue([]);

    const tree = renderer.create(
      <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} />
    );
    expect(tree.toJSON()).toBeNull();
  });

  it('deve renderizar a porcentagem de conclusão e os itens para um perfil parcial', () => {
    console.log('Is mock?', (completionUtils.calculateProfileCompletion as any)._isMockFunction);
    (completionUtils.calculateProfileCompletion as jest.Mock).mockReturnValue(0);
    (checklistUtils.getProfileChecklistItems as jest.Mock).mockReturnValue([
        { id: 'avatar', title: 'Adicionar foto', isComplete: false, onPress: jest.fn() },
        { id: 'cpf', title: 'Adicionar CPF', isComplete: false, onPress: jest.fn() }
    ]);

    const tree = renderer.create(
      <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} navigate={mockNavigate} />
    );
    
    expect(tree.toJSON()).not.toBeNull();

    const texts = tree.root.findAllByType('text');
    expect(texts.some(t => t.props.children?.toString().includes('0%'))).toBe(true);
    expect(texts.some(t => t.props.children === 'Adicionar foto')).toBe(true);
    expect(texts.some(t => t.props.children === 'Adicionar CPF')).toBe(true);
  });

  it('deve chamar onDismiss quando o botão de fechar é clicado', () => {
    (completionUtils.calculateProfileCompletion as jest.Mock).mockReturnValue(50);
    (checklistUtils.getProfileChecklistItems as jest.Mock).mockReturnValue([]);

    const tree = renderer.create(
      <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} />
    );
    
    const pressables = tree.root.findAllByType('pressable');
    const closeButton = pressables.find(p => p.props.accessibilityLabel === 'Dispensar checklist');
    
    expect(closeButton).toBeTruthy();
    act(() => {
      closeButton!.props.onPress();
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(AnalyticsService.track).toHaveBeenCalledWith('profile_checklist_dismiss', expect.any(Object));
  });

  it('deve chamar navigate quando um item do checklist é clicado', () => {
    const mockItemPress = jest.fn();
    (completionUtils.calculateProfileCompletion as jest.Mock).mockReturnValue(0);
    // Nota: O componente chama item.onPress(), mas getProfileChecklistItems real gera o onPress que usa o navigate passado por prop.
    // No nosso mock, vamos simular que o item tem o título correto.
    (checklistUtils.getProfileChecklistItems as jest.Mock).mockImplementation((user, navigate) => [
        { id: 'avatar', title: 'Adicionar foto', isComplete: false, onPress: () => navigate('EditProfile') }
    ]);

    const tree = renderer.create(
      <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} navigate={mockNavigate} />
    );

    const pressables = tree.root.findAllByType('pressable');
    const item = pressables.find(p => {
        try { return p.findByType('text').props.children === 'Adicionar foto'; } catch { return false; }
    });

    expect(item).toBeTruthy();
    act(() => {
        item!.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
  });

  it('deve mostrar itens como concluídos quando isComplete é true', () => {
    (completionUtils.calculateProfileCompletion as jest.Mock).mockReturnValue(50);
    (checklistUtils.getProfileChecklistItems as jest.Mock).mockReturnValue([
        { id: 'avatar', title: 'Adicionar foto', isComplete: true, onPress: jest.fn() },
        { id: 'cpf', title: 'Adicionar CPF', isComplete: false, onPress: jest.fn() }
    ]);

    const tree = renderer.create(
      <ProfileCompletionChecklist user={getBaseUser()} onDismiss={mockOnDismiss} />
    );

    const texts = tree.root.findAllByType('text');
    expect(texts.some(t => t.props.children?.toString().includes('50%'))).toBe(true);
    
    const views = tree.root.findAllByType('view');
    const completedIcons = views.filter(v => v.props.accessibilityLabel === 'Concluído');
    const pendingIcons = views.filter(v => v.props.accessibilityLabel === 'Pendente');

    expect(completedIcons.length).toBe(1);
    expect(pendingIcons.length).toBe(1);
  });
});
