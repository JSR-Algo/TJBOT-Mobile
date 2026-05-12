import React from 'react';

type Props = { children: React.ReactNode };

// TODO(PR2-deps): restore QueryClientProvider once @tanstack/react-query is
// merged from tbot-design package.json into tbot-mobile
export function QueryProvider({ children }: Props) {
  return <>{children}</>;
}
