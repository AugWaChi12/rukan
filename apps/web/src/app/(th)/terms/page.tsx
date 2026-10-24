import { LegalPage } from '@/components/legal/legal-page';
import { legalMetadata } from '../../site-metadata';

export const metadata = legalMetadata('th', 'terms');

export default function TermsThPage() {
  return <LegalPage locale="th" docKey="terms" />;
}
