/**
 * Tabs (Base UI) — navegação por abas com teclado (setas) e aria correto.
 */

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx, focusRing } from '../../lib/cx';

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: LucideIcon;
  panel: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs({ items, defaultValue, value, onValueChange, ariaLabel, className }: TabsProps) {
  return (
    <BaseTabs.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={(v) => onValueChange?.(String(v))}
      className={cx('flex min-h-0 flex-col', className)}
    >
      <BaseTabs.List aria-label={ariaLabel} className="flex gap-1 border-b border-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <BaseTabs.Tab
              key={item.value}
              value={item.value}
              className={cx(
                'inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground',
                'hover:text-foreground data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:font-medium',
                focusRing,
              )}
            >
              {Icon !== undefined ? <Icon aria-hidden="true" size={14} /> : null}
              {item.label}
            </BaseTabs.Tab>
          );
        })}
      </BaseTabs.List>
      {items.map((item) => (
        <BaseTabs.Panel key={item.value} value={item.value} className="min-h-0 flex-1 pt-4">
          {item.panel}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
