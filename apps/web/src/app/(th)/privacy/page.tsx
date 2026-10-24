import { LegalPage } from '@/components/legal/legal-page';
import { legalMetadata } from '../../site-metadata';

export const metadata = legalMetadata('th', 'privacy');

export default function PrivacyThPage() {
  return <LegalPage locale="th" docKey="privacy" />;
}
