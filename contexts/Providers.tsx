'use client';

import { UserProvider } from './UserContext';
import { TeamsGroupsProvider } from './TeamsGroupsContext';
import { ThemeProvider } from './ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <TeamsGroupsProvider>
          {children}
        </TeamsGroupsProvider>
      </UserProvider>
    </ThemeProvider>
  );
}



