import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useSubscription } from '@/hooks/useSubscription';

interface Props {
  children: ReactNode;
}

export function RequirePro({ children }: Props) {
  const { subscription, loading } = useSubscription();

  if (loading) return <div className="flex justify-center mt-20 text-[#6B7098]">Loading...</div>;

  const allowed =
    subscription?.plan === 'pro' && (subscription?.status === 'active' || subscription?.status === 'trialing');

  if (!allowed) return <Navigate to="/billing" replace />;
  return <>{children}</>;
}

