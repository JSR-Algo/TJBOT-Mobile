import React from 'react';
import { createActor } from 'xstate';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
  type LessonSessionActor,
} from '@/state/machines';
import { LessonSessionProvider } from './sessionContext';

function createLessonSessionActor(): LessonSessionActor {
  const actor = createActor(createLessonSessionMachine(noopLessonSessionServices));
  actor.start();
  return actor;
}

export function LessonSessionHost({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const actor = React.useMemo(() => createLessonSessionActor(), []);

  React.useEffect(() => () => actor.stop(), [actor]);

  return <LessonSessionProvider actor={actor}>{children}</LessonSessionProvider>;
}