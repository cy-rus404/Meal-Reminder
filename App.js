import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Alert, Platform, SafeAreaView
} from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { MaterialIcons } from '@expo/vector-icons';

// Notification Setup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const App = () => {
  const [lastMealTime, setLastMealTime] = useState(null);
  const [nextReminderTime, setNextReminderTime] = useState(null);
  const [isNotificationActive, setIsNotificationActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    (async () => {
      await requestPermissionsAsync();
      await loadLastMealTime();
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const requestPermissionsAsync = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await Notifications.requestPermissionsAsync();
  };

  const loadLastMealTime = async () => {
    const storedTime = await AsyncStorage.getItem('lastMealTime');
    if (storedTime) {
      const date = new Date(storedTime);
      setLastMealTime(date);
      checkReminderStatus(date);
    }
  };

  const checkReminderStatus = (lastMealTime) => {
    const now = new Date();
    const timeDiff = now - lastMealTime;
    const fourHours = 4 * 60 * 60 * 1000;

    if (timeDiff >= fourHours) {
      triggerReminder();
    } else {
      const nextTime = new Date(lastMealTime.getTime() + fourHours);
      scheduleNextReminder(nextTime);
    }
  };

  const triggerReminder = async () => {
    setIsNotificationActive(true);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Eat!',
        body: 'Take a picture of your food.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  };

  const scheduleNextReminder = (nextTime) => {
    setIsNotificationActive(false);
    setNextReminderTime(nextTime);

    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meal Reminder',
        body: 'Time to eat and log your meal!',
      },
      trigger: {
        date: nextTime,
      },
    });
  };

  const takeMealPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const now = new Date();
      await AsyncStorage.setItem('lastMealTime', now.toString());
      setLastMealTime(now);
      const nextReminder = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      scheduleNextReminder(nextReminder);
      Alert.alert('Success!', 'Meal logged. Next reminder in 4 hours.');
    } else {
      Alert.alert('Cancelled', 'Reminders will continue.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Reminder</Text>

      <View style={styles.statusBox}>
        <Text style={[styles.statusText, isNotificationActive && styles.activeText]}>
          {isNotificationActive ? "Reminder Active!" : "No Pending Reminders"}
        </Text>
        {nextReminderTime && (
          <>
            <Text style={styles.timeText}>
              Next Reminder: {nextReminderTime.toLocaleTimeString()}
            </Text>
            <Text style={styles.timeText}>
              Time Left: {formatTimeDifference(nextReminderTime, currentTime)}
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={takeMealPhoto}>
        <MaterialIcons name='camera-alt' size={24} color='white' />
        <Text style={styles.buttonText}>Take Meal Photo</Text>
      </TouchableOpacity>

      <StatusBar style="auto" />
    </View>
  );
};

// Helper: format remaining time
const formatTimeDifference = (future, now) => {
  const diff = Math.max(0, future - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  statusBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 10,
  },
  activeText: {
    color: 'green',
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 16,
    color: '#555',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 10,
  },
});

export default App;