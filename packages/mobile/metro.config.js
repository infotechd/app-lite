const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuração para monorepo
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Observa o diretório raiz do monorepo (para hot reload)
config.watchFolders = [workspaceRoot];

// Permite resolução a partir do app e também do monorepo (para pnpm hoisting)
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// Não desabilitar lookup hierárquico; isso pode quebrar resolução de deps transitivas com pnpm
// config.resolver.disableHierarchicalLookup = true;

// Habilita resolução via symlinks (necessário para pnpm/monorepo)
config.resolver.unstable_enableSymlinks = true;
// Habilita suporte a package.json "exports" (necessário para alguns pacotes modernos)
config.resolver.unstable_enablePackageExports = true;

// Aliases explícitos para fixar a origem dos módulos nativos críticos
try {
    const expoModulesCorePath = path.dirname(require.resolve('expo-modules-core/package.json'));
    const reactNativePath = path.dirname(require.resolve('react-native/package.json'));

    config.resolver.extraNodeModules = {
        ...(config.resolver.extraNodeModules || {}),
        'expo-modules-core': expoModulesCorePath,
        // Garante uma única instância do react-native (a do app)
        'react-native': reactNativePath,
    };
} catch (e) {
    // Mantém sem alias se não estiver resolvível no ambiente de build
}

module.exports = config;