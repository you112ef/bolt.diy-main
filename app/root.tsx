import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    // Set theme
    document.documentElement.setAttribute('data-theme', theme);

    // Language and direction setting
    const userProfileString = localStorage.getItem('bolt_user_profile');
    let currentLanguage = 'en'; // Default language

    if (userProfileString) {
      try {
        const userProfile = JSON.parse(userProfileString);
        if (userProfile && userProfile.language) {
          currentLanguage = userProfile.language;
        }
      } catch (error) {
        console.error('Failed to parse user profile from localStorage:', error);
        // Stick to default 'en' if parsing fails
      }
    }

    const direction = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', currentLanguage);

    // Add event listener for storage changes to react to language updates from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'bolt_user_profile' && event.newValue) {
        try {
          const updatedProfile = JSON.parse(event.newValue);
          if (updatedProfile && updatedProfile.language) {
            const newLang = updatedProfile.language;
            const newDirection = newLang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.setAttribute('dir', newDirection);
            document.documentElement.setAttribute('lang', newLang);
            // You might need to force a re-render or update a nanostore if components depend on this
          }
        } catch (error) {
          console.error('Failed to parse updated user profile from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]); // Rerun when theme changes, language changes are handled by storage event

  return (
    <>
      {/* The DndProvider should ideally be within the main app structure, 
           but for this change, we're focusing on html attributes. 
           If ClientOnly causes issues with setting dir/lang early enough,
           this might need reconsideration for initial render. */}
      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
