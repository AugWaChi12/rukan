import { LegalPage } from '@/components/legal/legal-page';
import { legalMetadata } from '../../site-metadata';

export const metadata = legalMetadata('en', 'privacy');

export default function PrivacyEnPage() {
  return <LegalPage locale="en" docKey="privacy" />;
}
