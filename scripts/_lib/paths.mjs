import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/_lib/ → scripts/ → tjbot-mobile/
export const APP_ROOT = path.resolve(__dirname, '..', '..');
export const SRC_ROOT = path.join(APP_ROOT, 'src');
// docs workspace lives inside tjbot-mobile/ (tracked by tjbot-mobile.git)
export const DOCS_ROOT = path.join(APP_ROOT, 'migrate-ui-ux-to-mobile-app-docs');
