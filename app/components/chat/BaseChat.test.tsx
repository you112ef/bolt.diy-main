import { render, screen, act } from '@testing-library/react';
import { BaseChat } from './BaseChat';
import { ClientOnly } from 'remix-utils/client-only';
import * as MenuModule from '~/components/sidebar/Menu.client';
import * as WorkbenchModule from '~/components/workbench/Workbench.client';

// Mock isMobile utility - though BaseChat itself doesn't directly use it,
// its responsive classes (sm:, lg:) are what we test via innerWidth.
// We don't need to mock isMobile() for BaseChat tests.

// Mock child components that are complex or not relevant to layout class testing
jest.mock('~/components/sidebar/Menu.client', () => ({
  Menu: jest.fn(() => <div data-testid="mock-menu" />),
}));

jest.mock('~/components/workbench/Workbench.client', () => ({
  Workbench: jest.fn(() => <div data-testid="mock-workbench" />),
}));

// Mock ClientOnly to just render children for simplicity in this layout test
jest.mock('remix-utils/client-only', () => ({
  ClientOnly: jest.fn(({ children }) => (typeof children === 'function' ? children() : children)),
}));

// Mock other deeply nested components if they cause issues,
// for now, focusing on the main layout div in BaseChat.
jest.mock('./Messages.client', () => ({ Messages: () => <div data-testid="mock-messages" /> }));
jest.mock('./SendButton.client', () => ({ SendButton: () => <button>Send</button> }));
jest.mock('./ModelSelector', () => ({ ModelSelector: () => <div /> }));
jest.mock('./APIKeyManager', () => ({ APIKeyManager: () => <div /> }));


describe('BaseChat Component Layout Responsiveness', () => {
  const originalInnerWidth = global.innerWidth;

  afterEach(() => {
    // @ts-ignore
    global.innerWidth = originalInnerWidth;
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });
  });

  test('applies flex-col layout on small screens', () => {
    // @ts-ignore
    global.innerWidth = 500;
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });

    render(<BaseChat chatStarted={true} />); // chatStarted=true to render main layout

    // The main layout div is the one containing both Chat and Workbench areas
    // It has classes "flex flex-col sm:flex-row rtl:sm:flex-row-reverse..."
    // We need a way to select this specific div.
    // Let's assume its direct children are the Chat area and Workbench area.
    // The mock Workbench has data-testid="mock-workbench". Its parent should be the target div.
    const workbench = screen.getByTestId('mock-workbench');
    const layoutContainer = workbench.parentElement;

    expect(layoutContainer).toHaveClass('flex');
    expect(layoutContainer).toHaveClass('flex-col');
    expect(layoutContainer).not.toHaveClass('sm:flex-row'); // This class exists, but shouldn't be active
    // In JSDOM, checking for "not.toHaveClass('sm:flex-row')" might not be fully indicative of behavior.
    // The key is that 'flex-col' is present and active.
    // For Tailwind, mobile-first means 'flex-col' applies, and 'sm:flex-row' would only apply at sm breakpoint.
    // So, if 'flex-col' is there, that's the active one on small screens.
  });

  test('applies sm:flex-row layout on larger screens', () => {
    // @ts-ignore
    global.innerWidth = 700; // Above sm breakpoint (640px)
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });

    render(<BaseChat chatStarted={true} />);

    const workbench = screen.getByTestId('mock-workbench');
    const layoutContainer = workbench.parentElement;

    expect(layoutContainer).toHaveClass('flex');
    expect(layoutContainer).toHaveClass('sm:flex-row');
    // It will also have 'flex-col' due to mobile-first, but 'sm:flex-row' should take precedence.
    // A more accurate test in a browser env would check computed style.
    // For now, class presence is the best we can do.
  });

  // Test for chat area width
  test('chat area uses sm:min-w-[var(--chat-min-width)] on larger screens', () => {
    // @ts-ignore
    global.innerWidth = 700;
     act(() => {
      global.dispatchEvent(new Event('resize'));
    });
    render(<BaseChat chatStarted={true} />);

    // The chat area div is the sibling of workbench's container, or a more specific selector is needed.
    // The structure is roughly: <div (layoutContainer)> <div (chatAreaDiv)>...</div> <ClientOnly><WorkbenchContainerDiv><Workbench/></WorkbenchContainerDiv></ClientOnly> </div>
    // So, chatAreaDiv is the first child of layoutContainer
    const workbench = screen.getByTestId('mock-workbench');
    const layoutContainer = workbench.parentElement;
    const chatAreaDiv = layoutContainer?.firstChild;

    expect(chatAreaDiv).toHaveClass('sm:min-w-[var(--chat-min-width)]');
    expect(chatAreaDiv).toHaveClass('sm:w-[var(--chat-min-width)]');
    expect(chatAreaDiv).toHaveClass('w-full'); // for mobile by default
  });

  test('chat area is w-full on small screens (no sm:min-w active)', () => {
    // @ts-ignore
    global.innerWidth = 500;
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });
    render(<BaseChat chatStarted={true} />);

    const workbench = screen.getByTestId('mock-workbench');
    const layoutContainer = workbench.parentElement;
    const chatAreaDiv = layoutContainer?.firstChild;

    expect(chatAreaDiv).toHaveClass('w-full');
    // The classes sm:min-w-[var(--chat-min-width)] and sm:w-[var(--chat-min-width)] are present in the DOM,
    // but they are not "active" due to the viewport width.
    // Testing for their presence is still valid as it confirms they are applied.
    expect(chatAreaDiv).toHaveClass('sm:min-w-[var(--chat-min-width)]');
    expect(chatAreaDiv).toHaveClass('sm:w-[var(--chat-min-width)]');

  });
});
