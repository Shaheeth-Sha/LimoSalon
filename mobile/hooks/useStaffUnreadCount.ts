import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { BASE_URL } from '../config/api';

const UNREAD_COUNT_API = `${BASE_URL}/api/staff/notifications/unread-count`;

// Shared by every staff screen with the bottom tab bar (home,
// my-schedule, Notifications, Profile Page) so the "Notification" tab
// icon's badge count stays in sync everywhere, refetching whenever
// any of those screens regains focus — e.g. after backing out of
// Notifications having just cleared it.
export function useStaffUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused();

  const refresh = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) return;

      const res = await fetch(UNREAD_COUNT_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Load staff unread count failed:', error);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      refresh();
    }
  }, [isFocused, refresh]);

  return { unreadCount, refresh };
}
