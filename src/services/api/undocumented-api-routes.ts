export const BACKEND_CONTRACT_UNAVAILABLE_CODE = 'BACKEND_CONTRACT_UNAVAILABLE' as const;

export class BackendContractUnavailableError extends Error {
  readonly code = BACKEND_CONTRACT_UNAVAILABLE_CODE;

  constructor(operation: string) {
    super(`BACKEND_CONTRACT_UNAVAILABLE: ${operation} has no documented backend contract`);
    this.name = 'BackendContractUnavailableError';
  }
}

export function backendContractUnavailable(operation: string): never {
  throw new BackendContractUnavailableError(operation);
}
