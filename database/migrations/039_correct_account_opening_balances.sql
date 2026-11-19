-- Correção dos saldos iniciais informados para as duas contas existentes.
-- O saldo disponível já está correto (zero). Não gerar ajuste no extrato,
-- nem alterar movimentações, liquidações ou o saldo atual.
WITH corrected AS (
  UPDATE financial_accounts
  SET initial_balance = 0,
      updated_at = CURRENT_TIMESTAMP
  WHERE current_balance = 0
    AND (
      (name = 'Banco Asaas' AND initial_balance = 5000)
      OR (name = 'Caixa Físico / Pequeno Caixa' AND initial_balance = 500)
    )
  RETURNING id, name, current_balance,
    CASE WHEN name = 'Banco Asaas' THEN 5000 ELSE 500 END AS previous_initial_balance
)
INSERT INTO audit_logs (entity_name, entity_id, action, old_data, new_data)
SELECT 'financial_accounts', id, 'UPDATE',
  jsonb_build_object('initialBalance', previous_initial_balance,
                     'currentBalance', current_balance),
  jsonb_build_object('initialBalance', 0, 'currentBalance', current_balance,
                     'reason', 'Correção do saldo inicial para zero solicitada pelo administrador',
                     'migration', '039_correct_account_opening_balances')
FROM corrected;
