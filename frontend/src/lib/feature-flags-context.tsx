import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiCalls } from './api';

export type FeatureFlagState = {
  enabled: boolean;
  messageType: string;
  message: string;
};

type FeatureFlagsContextValue = {
  flags: Record<string, FeatureFlagState>;
  isLoading: boolean;
  refetch: () => Promise<void>;
  isEnabled: (key: string) => boolean;
  getMessage: (key: string) => string;
};

const defaultFlags: Record<string, FeatureFlagState> = {};
const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: defaultFlags,
  isLoading: true,
  refetch: async () => {},
  isEnabled: () => true,
  getMessage: () => 'Coming soon',
});

export function FeatureFlagsProvider({
  token,
  children,
}: {
  token: string | null;
  children: React.ReactNode;
}) {
  const [flags, setFlags] = useState<Record<string, FeatureFlagState>>(defaultFlags);
  const [isLoading, setIsLoading] = useState(!!token);

  const fetchFlags = useCallback(async () => {
    if (!token) {
      setFlags({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiCalls.getFeatureFlags(token);
      setFlags(data || {});
    } catch {
      setFlags({});
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key: string) => {
      const f = flags[key];
      return f ? f.enabled : true;
    },
    [flags]
  );

  const getMessage = useCallback(
    (key: string) => {
      const f = flags[key];
      return f?.message || 'Coming soon';
    },
    [flags]
  );

  const value: FeatureFlagsContextValue = {
    flags,
    isLoading,
    refetch: fetchFlags,
    isEnabled,
    getMessage,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}
