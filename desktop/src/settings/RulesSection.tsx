import { useState } from 'react';
import type { Rule } from '@/features/rules/mapping';
import { useRules } from '@/features/rules/hooks';
import { ruleOfferLabel } from '@/features/rules/offer';
import { Button } from '../ui/Button';
import { ErrorLine } from '../ui/ErrorLine';
import { Placeholder } from '../ui/Placeholder';
import { RulePanel } from './RulePanel';

export function RulesSection({ onNotice }: { onNotice: (message: string) => void }) {
  const rules = useRules();
  // La regla se conserva al cerrar el panel para que no se vacíe mientras sale.
  const [selected, setSelected] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);

  const openPanel = (rule: Rule | null) => {
    setSelected(rule);
    setOpen(true);
  };

  return (
    <section className="settings-section" aria-labelledby="rules-title">
      <h2 id="rules-title">Reglas</h2>
      {rules.isError && !rules.data ? (
        <ErrorLine onRetry={() => void rules.refetch()} retrying={rules.isFetching} />
      ) : rules.isPending ? (
        <div className="settings-placeholders">
          {[0, 1, 2].map((i) => (
            <Placeholder key={i} width="100%" height={52} />
          ))}
        </div>
      ) : (
        <>
          {rules.data.length === 0 ? (
            <p className="empty">Aún no tienes reglas. Crea una aquí o desde un gasto.</p>
          ) : (
            <ul className="settings-list">
              {rules.data.map((rule) => (
                <li key={rule.id}>
                  <button type="button" className="settings-row" onClick={() => openPanel(rule)}>
                    {ruleOfferLabel(rule, rule.pattern, rule.categoryName)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onClick={() => openPanel(null)}>
            Nueva regla
          </Button>
        </>
      )}
      <RulePanel
        rule={selected}
        open={open}
        onClose={() => setOpen(false)}
        onDone={(message) => {
          setOpen(false);
          onNotice(message);
        }}
      />
    </section>
  );
}
