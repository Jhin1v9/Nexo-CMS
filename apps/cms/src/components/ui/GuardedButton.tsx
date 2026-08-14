/**
 * GuardedButton — botão condicionado à disponibilidade da capability
 * (07§56 / Inv. 27): ausente ou negada -> desabilitado + tooltip explicando;
 * requires-approval -> habilitado (o diálogo de aprovação é responsabilidade
 * do chamador). Falha parcial SEMPRE visível, nunca escondida.
 */

import { useCapability } from '../../api/hooks';
import { isActionable, unavailabilityReason } from '../../api/capabilities';
import { Button, type ButtonProps } from './Button';
import { Tooltip } from './Tooltip';

export interface GuardedButtonProps extends ButtonProps {
  capabilityId: string;
}

export function GuardedButton({ capabilityId, disabled, children, ...rest }: GuardedButtonProps) {
  const { availability, isLoading } = useCapability(capabilityId);
  const blocked = availability !== undefined && !isActionable(availability);
  const reason = availability !== undefined ? unavailabilityReason(availability) : '';

  if (isLoading) {
    return (
      <Button disabled {...rest}>
        {children}
      </Button>
    );
  }
  if (blocked) {
    return (
      <Tooltip content={reason} wrapForDisabled>
        <Button disabled aria-disabled="true" {...rest}>
          {children}
        </Button>
      </Tooltip>
    );
  }
  return (
    <Button disabled={disabled} {...rest}>
      {children}
    </Button>
  );
}
