import { LegalPage } from '@/components/legal/legal-page';
import { legalMetadata } from '../../site-metadata';

export const metadata = legalMetadata('en', 'rules');

export default function RulesEnPage() {
  return <LegalPage locale="en" docKey="rules" />;
}
