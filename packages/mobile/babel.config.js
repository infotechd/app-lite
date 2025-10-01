module.exports = function (api) {
    api.cache(true);
    const isTest = process.env.JEST_WORKER_ID != null || process.env.NODE_ENV === 'test';
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Disable module-resolver during tests so Jest's moduleNameMapper handles aliases
            ...(isTest ? [] : [
                [
                    'module-resolver',
                    {
                        root: ['./'],
                        alias: {
                            '@': './src'
                        },
                        extensions: ['.ts', '.tsx', '.js', '.json']
                    }
                ]
            ]),
            // Reanimated plugin must be listed last
            'react-native-reanimated/plugin'
        ]
    };
};