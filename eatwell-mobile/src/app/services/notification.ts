import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface MealReminder {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

const DEFAULT_REMINDERS: MealReminder[] = [
  { id: 1, title: '🍳 Breakfast Time!', body: 'Time to eat your healthy breakfast. Check your meal plan!', hour: 8, minute: 0 },
  { id: 2, title: '🥗 Lunch Time!', body: 'Your lunch is planned and ready. Eat well!', hour: 13, minute: 0 },
  { id: 3, title: '🍎 Snack Break!', body: 'Grab your healthy snack. Stay on track!', hour: 16, minute: 0 },
  { id: 4, title: '🍽️ Dinner Time!', body: 'Time for a nutritious dinner. Check your plan!', hour: 19, minute: 30 },
];

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  private remindersEnabled = false;

  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  }

  async scheduleMealReminders(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const granted = await this.requestPermission();
    if (!granted) return;

    await this.cancelAll();

    const notifications = DEFAULT_REMINDERS.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body,
      schedule: {
        on: { hour: r.hour, minute: r.minute },
        repeats: true,
        every: 'day' as const,
      },
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1DB954',
    }));

    await LocalNotifications.schedule({ notifications });
    this.remindersEnabled = true;
  }

  async cancelAll(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
    this.remindersEnabled = false;
  }

  isEnabled(): boolean {
    return this.remindersEnabled;
  }

  async toggleReminders(enable: boolean): Promise<void> {
    if (enable) {
      await this.scheduleMealReminders();
    } else {
      await this.cancelAll();
    }
  }

  getDefaultReminders(): MealReminder[] {
    return [...DEFAULT_REMINDERS];
  }
}
