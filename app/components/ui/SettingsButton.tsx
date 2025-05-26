import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '~/components/ui/IconButton';
interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton = memo(({ onClick }: SettingsButtonProps) => {
  const { t } = useTranslation();
  return (
    <IconButton
      onClick={onClick}
      icon="i-ph:gear"
      size="xl"
      title={t('settingsButtonTitle')}
      data-testid="settings-button"
      className="text-[#666] hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive/10 transition-colors"
    />
  );
});
