import type { Metadata } from 'next';
import { WorkspaceLogin } from '@/components/workspace/WorkspaceLogin';

export const metadata: Metadata = {
  title: 'Lead Workspace Login',
  robots: { index: false, follow: false },
};

export default function WorkspaceLoginPage() {
  return <WorkspaceLogin />;
}
