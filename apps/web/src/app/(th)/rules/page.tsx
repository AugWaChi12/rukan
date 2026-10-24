import { LegalPage } from '@/components/legal/legal-page';
import { legalMetadata } from '../../site-metadata';

export const metadata = legalMetadata('th', 'rules');

export default function RulesThPage() {
  return <LegalPage locale="th" docKey="rules" />;
}
