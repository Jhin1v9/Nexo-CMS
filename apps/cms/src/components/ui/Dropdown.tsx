/**
 * Dropdown (Base UI Menu) — menu acessível (keyboard nav, focus management).
 * API enxuta: trigger + items com ícone Lucide opcional e perigo semântico.
 */

import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cx, focusRing } from '../../lib/cx';

export interface DropdownItem {
  key: string;
  label: ReactNode;
  icon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface DropdownProps {
  trigger: ReactElement;
  items: DropdownItem[];
  label: string;
  align?: 'start' | 'center' | 'end';
}

export function Dropdown({ trigger, items, label, align = 'end' }: DropdownProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger aria-label={label} render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align={align} className="z-50">
          <BaseMenu.Popup className="min-w-44 rounded-md border border-border bg-background p-1 shadow-lg">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <BaseMenu.Item
                  key={item.key}
                  disabled={item.disabled === true}
                  onClick={item.onSelect}
                  className={cx(
                    'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground',
                    'data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                    item.danger === true && 'text-danger',
                    focusRing,
                  )}
                >
                  {Icon !== undefined ? <Icon aria-hidden="true" size={14} className={item.danger === true ? 'text-danger' : 'text-muted-foreground'} /> : null}
                  {item.label}
                </BaseMenu.Item>
              );
            })}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
