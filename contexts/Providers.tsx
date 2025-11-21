'use client';

import { UserProvider } from './UserContext';
import { TeamsGroupsProvider } from './TeamsGroupsContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <TeamsGroupsProvider>
        {children}
      </TeamsGroupsProvider>
    </UserProvider>
  );
}



