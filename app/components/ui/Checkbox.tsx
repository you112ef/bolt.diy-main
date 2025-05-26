import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    // Increased size from h-5 w-5 to h-6 w-6 (24x24px) for better direct touch interaction.
    className={classNames(
      'peer h-6 w-6 shrink-0 rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:focus:ring-purple-400 dark:focus:ring-offset-gray-900',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      {/* Increased check icon size to h-4 w-4 (16px) */}
      <Check className="h-4 w-4 text-purple-500 dark:text-purple-400" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
