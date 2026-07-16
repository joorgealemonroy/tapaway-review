import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const RepCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md',
        className,
      )}
      {...rest}
    />
  ),
);
RepCard.displayName = 'RepCard';

export default RepCard;
