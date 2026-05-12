import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/_lib/ → scripts/ → tbot-mobile/
export const APP_ROOT = path.resolve(__dirname, '..', '..');
export const SRC_ROOT = path.join(APP_ROOT, 'src');
// docs workspace lives inside tbot-mobile/ (tracked by tbot-mobile.git)
export const DOCS_ROOT = path.join(APP_ROOT, 'migrate-ui-ux-to-mobile-app-docs');
