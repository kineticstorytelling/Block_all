import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  Provider as PaperProvider,
  Text,
  Button,
  TextInput,
  Switch,
  Card,
  Title,
  Paragraph,
  useTheme,
} from 'react-native-paper';
import AppBlocker from './src/services/AppBlocker';

const App = () => {
  const [allowedApp, setAllowedApp] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [timeLimit, setTimeLimit] = useState('');
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    const hasPerms = await AppBlocker.checkPermissions();
    if (!hasPerms) {
      Alert.alert(
        'Permissions Required',
        'This app needs usage access permission to function properly.',
        [
          {
            text: 'Grant Permission',
            onPress: async () => {
              await AppBlocker.requestPermissions();
              const newPerms = await AppBlocker.checkPermissions();
              setHasPermissions(newPerms);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      setHasPermissions(true);
    }
  };

  const toggleBlocking = async () => {
    if (!hasPermissions) {
      Alert.alert('Permission Required', 'Please grant usage access permission first.');
      return;
    }

    if (!allowedApp) {
      Alert.alert('Error', 'Please enter an app package name first.');
      return;
    }

    try {
      if (!isBlocking) {
        await AppBlocker.blockApp(allowedApp);
        setIsBlocking(true);
      } else {
        await AppBlocker.unblockApp(allowedApp);
        setIsBlocking(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle app blocking: ' + error.message);
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Title style={styles.title}>Focus Mode</Title>
            <Paragraph style={styles.subtitle}>
              Block all apps except the one you choose
            </Paragraph>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Allowed App/Website"
                value={allowedApp}
                onChangeText={setAllowedApp}
                style={styles.input}
                mode="outlined"
                placeholder="Enter app or website name"
              />

              <TextInput
                label="Time Limit (minutes)"
                value={timeLimit}
                onChangeText={setTimeLimit}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
                placeholder="Optional: Set a time limit"
              />

              <View style={styles.switchContainer}>
                <Text>Enable Blocking</Text>
                <Switch
                  value={isBlocking}
                  onValueChange={toggleBlocking}
                  color="#6200ee"
                />
              </View>
            </Card.Content>
          </Card>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={toggleBlocking}
              style={styles.button}
            >
              {isBlocking ? 'Stop Blocking' : 'Start Blocking'}
            </Button>
          </View>

          {isBlocking && (
            <Card style={[styles.card, styles.statusCard]}>
              <Card.Content>
                <Title>Currently Blocking</Title>
                <Paragraph>All apps except: {allowedApp}</Paragraph>
                {timeLimit && (
                  <Paragraph>Time remaining: {timeLimit} minutes</Paragraph>
                )}
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  statusCard: {
    backgroundColor: '#e8f5e9',
  },
  input: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    padding: 16,
  },
  button: {
    padding: 8,
  },
});

export default App;
