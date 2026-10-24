import { LegalPage } from '@/components/legal/legal-page';
import { legalMetadata } from '../../site-metadata';

export const metadata = legalMetadata('en', 'terms');

export default function TermsEnPage() {
  return <LegalPage locale="en" docKey="terms" />;
}
