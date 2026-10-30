import { Notice } from '../ui/Notice';
import { useNotice } from '../ui/use-notice';
import { CategoriesSection } from './CategoriesSection';
import { RulesSection } from './RulesSection';
import './settings.css';

export function SettingsScreen() {
  const { notice, show } = useNotice();
  return (
    <div className="settings-screen">
      <h1>Ajustes</h1>
      <CategoriesSection onNotice={show} />
      <RulesSection onNotice={show} />
      <Notice message={notice} />
    </div>
  );
}
