import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// Configurar como as notificações serão exibidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // 1️⃣ SOLICITAR PERMISSÕES
  async registerForPushNotifications() {
    let token;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Erro', 'Permissão para notificações negada!');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Push Token:', token);
    } else {
      Alert.alert('Atenção', 'Use um dispositivo físico para notificações push');
    }

    // Configurar canal no Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FCD030',
      });
    }

    return token;
  }

  // 2️⃣ ENVIAR NOTIFICAÇÃO LOCAL (TESTE IMEDIATO)
  async sendTestNotification() {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Teste de Notificação",
          body: "As notificações estão funcionando!",
          data: { type: 'test' },
          sound: true,
        },
        trigger: null, // null = imediato
      });
      
      console.log('✅ Notificação enviada com ID:', id);
      return id;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação de teste');
      return null;
    }
  }

  // 3️⃣ NOTIFICAÇÃO AGENDADA (TESTE COM ATRASO)
  async scheduleTestNotification(seconds = 5) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Notificação Agendada",
          body: `Esta notificação foi agendada para ${seconds} segundos`,
          data: { type: 'scheduled' },
          sound: true,
        },
        trigger: {
          seconds: seconds,
        },
      });

      Alert.alert(
        'Agendado!', 
        `Notificação será exibida em ${seconds} segundos.\nFeche o app para testar!`
      );
      
      console.log(`⏰ Notificação agendada (${seconds}s) com ID:`, id);
      return id;
    } catch (error) {
      console.error('❌ Erro ao agendar notificação:', error);
      return null;
    }
  }

  // 4️⃣ CANCELAR TODAS NOTIFICAÇÕES
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ Todas notificações canceladas');
  }

  // 5️⃣ LISTENERS (para responder a notificações)
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // 6️⃣ SIMULAR NOTIFICAÇÃO DE NOVO POST
  async sendNewPostNotification(postTitle) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📝 Novo Post",
        body: postTitle,
        data: { type: 'new_post', title: postTitle },
      },
      trigger: null,
    });
  }

  // 7️⃣ SIMULAR NOTIFICAÇÃO DE MENSAGEM
  async sendNewMessageNotification(sender, message) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 ${sender}`,
        body: message,
        data: { type: 'new_message', sender },
      },
      trigger: null,
    });
  }
}

export default new NotificationService();