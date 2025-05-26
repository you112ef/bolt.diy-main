import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
// import { GitUrlImport } from '~/components/git/GitUrlImport.client'; // Original import
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import React, { Suspense } from 'react'; // Added React and Suspense

// Lazy load GitUrlImport
const GitUrlImport = React.lazy(() => 
  import('~/components/git/GitUrlImport.client').then(module => ({ default: module.GitUrlImport }))
);

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export async function loader(args: LoaderFunctionArgs) {
  return json({ url: args.params.url });
}

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>
        {() => (
          <Suspense fallback={<BaseChat />}> {/* Can use a more specific loader here if BaseChat is too heavy for fallback */}
            <GitUrlImport />
          </Suspense>
        )}
      </ClientOnly>
    </div>
  );
}
