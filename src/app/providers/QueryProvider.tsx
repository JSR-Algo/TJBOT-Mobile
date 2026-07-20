import React from 'react';

type Props = { children: React.ReactNode };

// TODO(PR2-deps): restore QueryClientProvider once @tanstack/react-query is
// merged from tjbot-design package.json into tjbot-mobile
export function QueryProvider({ children }: Props) {
  return <>{children}</>;
}
