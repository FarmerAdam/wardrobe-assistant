import { Alert, Platform } from 'react-native';

/** Alert.alert() is unimplemented on web (react-native-web) and silently does nothing there. */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
