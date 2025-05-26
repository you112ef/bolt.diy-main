import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import './lib/i18n';

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
