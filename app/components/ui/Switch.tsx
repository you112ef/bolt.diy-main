import { memo } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { classNames } from '~/utils/classNames';

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (event: boolean) => void;
}

export const Switch = memo(({ className, onCheckedChange, checked }: SwitchProps) => {
  return (
    <SwitchPrimitive.Root
      className={classNames(
        // Increased size: h-7 (28px), w-12 (48px)
        'relative h-7 w-12 cursor-pointer rounded-full bg-bolt-elements-button-primary-background',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-bolt-elements-item-contentAccent',
        className,
      )}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange?.(e)}
    >
      <SwitchPrimitive.Thumb
        className={classNames(
          // Increased thumb size: h-6 w-6 (24px)
          'block h-6 w-6 rounded-full bg-white',
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          // Adjusted translation: translate-x-1 (4px from edge)
          'translate-x-1', 
          // Adjusted checked translation: total width 48px, thumb 24px. Remaining space 24px. (48 - 24 - 4) = 20px. So translate-x-5 (20px)
          'data-[state=checked]:translate-x-5',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
