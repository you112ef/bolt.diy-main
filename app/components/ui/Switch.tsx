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
        'relative h-7 w-12 sm:h-6 sm:w-11 cursor-pointer rounded-full bg-bolt-elements-button-primary-background', // Increased size for mobile
        'transition-colors duration-200 ease-in-out', // Kept specific transition for colors
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950', // Changed to accent color, added dark offset
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-bolt-elements-item-contentAccent',
        className,
      )}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange?.(e)}
    >
      <SwitchPrimitive.Thumb
        className={classNames(
          'block h-5 w-5 rounded-full bg-white', // Thumb size kept h-5 w-5
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          'translate-x-1 sm:translate-x-0.5', // Adjusted for new track size
          'data-[state=checked]:translate-x-[1.5rem] sm:data-[state=checked]:translate-x-[1.375rem]', // Adjusted for new track size
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
