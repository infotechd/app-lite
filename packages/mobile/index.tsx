import 'react-native-gesture-handler';
import 'react-native-reanimated';

// Initialize Dev Client first (if present) so React DevTools comes before RN ExceptionsManager
if (__DEV__) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('expo-dev-client');
    } catch {
        // expo-dev-client may not be installed (e.g., Expo Go); ignore.
    }
}


import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);