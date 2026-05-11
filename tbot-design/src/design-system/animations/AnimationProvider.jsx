import { createContext, useContext, useCallback } from 'react';

const AnimationContext = createContext({ register: () => {} });

export function useAnimations() {
  return useContext(AnimationContext);
}

export function AnimationProvider({ children, injector }) {
  const register = useCallback((id, css) => {
    if (injector) injector(id, css);
  }, [injector]);

  return (
    <AnimationContext.Provider value={{ register }}>
      {children}
    </AnimationContext.Provider>
  );
}
