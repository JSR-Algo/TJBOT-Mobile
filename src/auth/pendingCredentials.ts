let _email = '';
let _password = '';
let _clearTimer: ReturnType<typeof setTimeout> | null = null;

export const pendingCredentials = {
  set: (email: string, password: string) => {
    _email = email;
    _password = password;
    if (_clearTimer) clearTimeout(_clearTimer);
    _clearTimer = setTimeout(() => { _email = ''; _password = ''; _clearTimer = null; }, 60000);
  },
  get: () => ({ email: _email, password: _password }),
  clear: () => {
    _email = '';
    _password = '';
    if (_clearTimer) { clearTimeout(_clearTimer); _clearTimer = null; }
  },
};
