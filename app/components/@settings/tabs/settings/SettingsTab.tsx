import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react'; // Import useStore
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import { profileStore, updateProfile } from '~/lib/stores/profile'; // Import profileStore and updateProfile
import type { UserProfile } from '~/components/@settings/core/types';
import { isMac } from '~/utils/os';

// Helper to get modifier key symbols/text
const getModifierSymbol = (modifier: string): string => {
  switch (modifier) {
    case 'meta':
      return isMac ? '⌘' : 'Win';
    case 'alt':
      return isMac ? '⌥' : 'Alt';
    case 'shift':
      return '⇧';
    default:
      return modifier;
  }
};

export default function SettingsTab() {
  const [currentTimezone, setCurrentTimezone] = useState('');
  const $profile = useStore(profileStore); // Use profileStore

  // Initialize local state from profileStore or defaults
  const [language, setLanguage] = useState($profile.language || 'en');
  const [notifications, setNotifications] = useState($profile.notifications === undefined ? true : $profile.notifications);
  const [timezone, setTimezone] = useState($profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    setCurrentTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    // Update local state if profileStore changes from another source
    setLanguage($profile.language || 'en');
    setNotifications($profile.notifications === undefined ? true : $profile.notifications);
    setTimezone($profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [$profile]);

  const handleSettingChange = (key: keyof UserProfile, value: any) => {
    // Update local state immediately for UI responsiveness
    if (key === 'language') setLanguage(value);
    if (key === 'notifications') setNotifications(value);
    if (key === 'timezone') setTimezone(value);

    // Update profileStore
    updateProfile({ [key]: value });
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} updated`);
  };

  return (
    <div className="space-y-4">
      {/* Language & Notifications */}
      <motion.div
        className="bg-bolt-elements-bg-depth-1 rounded-lg shadow-sm p-4 space-y-4" // Removed dark:shadow-none as it's default
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:palette-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Preferences</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:translate-fill w-4 h-4 text-bolt-elements-textSecondary" />
            <label className="block text-sm text-bolt-elements-textSecondary">Language</label>
          </div>
          <select
            value={language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-bolt-elements-bg-depth-2 border border-bolt-elements-borderColor', // Updated colors
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:bell-fill w-4 h-4 text-bolt-elements-textSecondary" />
            <label className="block text-sm text-bolt-elements-textSecondary">Notifications</label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-bolt-elements-textSecondary">
              {notifications ? 'Notifications are enabled' : 'Notifications are disabled'}
            </span>
            <Switch
              checked={notifications}
              onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
            />
          </div>
        </div>
      </motion.div>

      {/* Timezone */}
      <motion.div
        className="bg-bolt-elements-bg-depth-1 rounded-lg shadow-sm p-4" // Removed dark:shadow-none
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:clock-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Time Settings</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:globe-fill w-4 h-4 text-bolt-elements-textSecondary" />
            <label className="block text-sm text-bolt-elements-textSecondary">Timezone</label>
          </div>
          <select
            value={timezone}
            onChange={(e) => handleSettingChange('timezone', e.target.value)}
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-bolt-elements-bg-depth-2 border border-bolt-elements-borderColor', // Updated colors
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
          >
            <option value={currentTimezone}>{currentTimezone}</option>
          </select>
        </div>
      </motion.div>

      {/* Simplified Keyboard Shortcuts */}
      <motion.div
        className="bg-bolt-elements-bg-depth-1 rounded-lg shadow-sm p-4" // Removed dark:shadow-none
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:keyboard-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Keyboard Shortcuts</span>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between p-2 rounded-lg bg-bolt-elements-bg-depth-2"> {/* Updated colors */}
            <div className="flex flex-col">
              <span className="text-sm text-bolt-elements-textPrimary">Toggle Theme</span>
              <span className="text-xs text-bolt-elements-textSecondary">Switch between light and dark mode</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs font-semibold text-bolt-elements-textSecondary bg-bolt-elements-bg-depth-1 border border-bolt-elements-borderColor rounded shadow-sm"> {/* Updated colors */}
                {getModifierSymbol('meta')}
              </kbd>
              <kbd className="px-2 py-1 text-xs font-semibold text-bolt-elements-textSecondary bg-bolt-elements-bg-depth-1 border border-bolt-elements-borderColor rounded shadow-sm"> {/* Updated colors */}
                {getModifierSymbol('alt')}
              </kbd>
              <kbd className="px-2 py-1 text-xs font-semibold text-bolt-elements-textSecondary bg-bolt-elements-bg-depth-1 border border-bolt-elements-borderColor rounded shadow-sm"> {/* Updated colors */}
                {getModifierSymbol('shift')}
              </kbd>
              <kbd className="px-2 py-1 text-xs font-semibold text-bolt-elements-textSecondary bg-bolt-elements-bg-depth-1 border border-bolt-elements-borderColor rounded shadow-sm"> {/* Updated colors */}
                D
              </kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
