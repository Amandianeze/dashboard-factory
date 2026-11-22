import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Join class names and let later Tailwind utilities win over earlier ones (shadcn's `cn`). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
