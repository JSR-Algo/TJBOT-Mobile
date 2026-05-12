export interface LoginParams {
  email: string;
  password: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  avatarKind: string;
  age: number;
  languageTarget: string;
}

export async function login(_params: LoginParams): Promise<{ token: string }> {
  throw new Error('not implemented');
}

export async function logout(): Promise<void> {
  throw new Error('not implemented');
}

export async function getChildProfile(): Promise<ChildProfile> {
  throw new Error('not implemented');
}

export async function saveChildProfile(_profile: Partial<ChildProfile>): Promise<void> {
  throw new Error('not implemented');
}
