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
        // Increased size: h-8 (32px), w-14 (56px) for better tap target
        'relative h-8 w-14 cursor-pointer rounded-full bg-bolt-elements-button-primary-background',
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
          // Increased thumb size: h-7 w-7 (28px)
          'block h-7 w-7 rounded-full bg-white',
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          // Adjusted translation: translate-x-1 (4px from edge)
          'translate-x-1',
          // Adjusted checked translation: total width 56px, thumb 28px. (56 - 28 - 4) = 24px. So translate-x-6 (24px)
          'data-[state=checked]:translate-x-6',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
