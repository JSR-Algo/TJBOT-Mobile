import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getParentSessionReport, type ParentSessionReport } from '@/services/api/parentLearning.api';

export const parentSessionReportKey = (childId: string, sessionId: string) => ['parent-session-report', childId, sessionId] as const;

export function useParentSessionReportQuery(childId: string | undefined, sessionId: string | undefined): UseQueryResult<ParentSessionReport | null, Error> {
  const enabled = Boolean(childId && sessionId);
  return useQuery({ queryKey: parentSessionReportKey(childId ?? '', sessionId ?? ''), queryFn: () => getParentSessionReport(childId!, sessionId!), enabled });
}
