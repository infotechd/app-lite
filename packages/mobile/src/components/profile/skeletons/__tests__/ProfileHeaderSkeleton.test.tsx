import ProfileHeaderSkeleton from '../ProfileHeaderSkeleton';
import { colors } from '../../../../styles/theme';

// Mock do React Native com API mínima necessária ao teste
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: (props: any) => React.createElement('view', props, props.children),
    StyleSheet: { create: (s: any) => s },
    Appearance: { getColorScheme: () => 'light' },
  };
});

// Mock do SkeletonPrimitives para evitar dependência de Animated real
jest.mock('../SkeletonPrimitives', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SkeletonBox = ({ style, testID, width, height }: any) =>
    React.createElement(View, { testID, style: [{ width, height }, style] });
  const SkeletonGroup = ({ children }: any) => React.createElement(View, null, children);
  return { SkeletonBox, SkeletonGroup };
});

function flattenStyle(style: any) {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style || {};
}

type Node = any;
function findByTestId(node: Node, testID: string): Node | null {
  if (!node) return null;
  const props = node.props || {};
  if (props.testID === testID) return node;
  const children = Array.isArray(props.children) ? props.children : props.children ? [props.children] : [];
  for (const child of children) {
    const found = findByTestId(child, testID);
    if (found) return found;
  }
  return null;
}

describe('ProfileHeaderSkeleton', () => {
  it('aplica colors.primary no selo e no botão, e fundo diferenciado no avatar', () => {
    // Garante que o mock de Appearance está funcionando e sendo usado
    const { Appearance } = require('react-native');
    expect(Appearance.getColorScheme()).toBe('light');

    const tree = ProfileHeaderSkeleton({ testID: 'profile-header-skeleton' } as any);

    const badge = findByTestId(tree, 'profile-header-skeleton-badge');
    const btn = findByTestId(tree, 'profile-header-skeleton-primary-button');
    const avatarWrapper = findByTestId(tree, 'profile-header-skeleton-avatar-wrapper');

    expect(badge).toBeTruthy();
    expect(btn).toBeTruthy();
    expect(avatarWrapper).toBeTruthy();

    const badgeStyle = flattenStyle(badge!.props.style);
    const btnStyle = flattenStyle(btn!.props.style);
    const avatarStyle = flattenStyle(avatarWrapper!.props.style);

    expect(badgeStyle.backgroundColor).toBe(colors.primary);
    expect(btnStyle.backgroundColor).toBe(colors.primary);
    expect(avatarStyle.backgroundColor).toBe(colors.textSecondary);
  });
});
