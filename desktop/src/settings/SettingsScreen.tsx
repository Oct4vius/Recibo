import { Notice } from '../ui/Notice';
import { useNotice } from '../ui/use-notice';
import { AccountSection } from './AccountSection';
import { CategoriesSection } from './CategoriesSection';
import { RateSection } from './RateSection';
import { StartupSection } from './StartupSection';
import { RulesSection } from './RulesSection';
import { VersionLine } from './VersionLine';
import './settings.css';

export function SettingsScreen() {
  const { notice, show } = useNotice();
  return (
    <div className="settings-screen">
      <h1>Ajustes</h1>
      <CategoriesSection onNotice={show} />
      <RulesSection onNotice={show} />
      <RateSection onNotice={show} />
      <StartupSection />
      <AccountSection onNotice={show} />
      <VersionLine />
      <Notice message={notice} />
    </div>
  );
}
