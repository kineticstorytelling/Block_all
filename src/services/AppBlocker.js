import { NativeModules, Platform } from 'react-native';

const { AppBlocker } = NativeModules;

class AppBlockerService {
  async checkPermissions() {
    if (Platform.OS === 'android') {
      return await AppBlocker.checkPermissions();
    }
    return false;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      return await AppBlocker.requestPermissions();
    }
    return false;
  }

  async getCurrentApp() {
    if (Platform.OS === 'android') {
      return await AppBlocker.getCurrentApp();
    }
    return null;
  }

  async blockApp(packageName) {
    if (Platform.OS === 'android') {
      return await AppBlocker.blockApp(packageName);
    }
    return false;
  }

  async unblockApp(packageName) {
    if (Platform.OS === 'android') {
      return await AppBlocker.unblockApp(packageName);
    }
    return false;
  }
}

export default new AppBlockerService();
