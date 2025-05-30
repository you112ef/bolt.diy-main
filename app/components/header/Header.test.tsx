import { render, screen, act } from '@testing-library/react';
import { Header } from './Header';
import { ClientOnly }sfrom 'remix-utils/client-only'; // Needed by Header
import { Menu } from '../sidebar/Menu.client'; // Needed by Header
import * as NanoStoresReact from '@nanostores/react'; // To mock useStore
import { chatStore } from '~/lib/stores/chat'; // Store used by Header

// Mock isMobile utility
jest.mock('~/utils/mobile', () => ({
  isMobile: jest.fn(),
}));
const { isMobile } = require('~/utils/mobile');

// Mock Menu component as it's complex and not the focus of this test
jest.mock('../sidebar/Menu.client', () => ({
  Menu: jest.fn(() => <div data-testid="mock-menu" />),
}));

// Mock ClientOnly to just render children
jest.mock('remix-utils/client-only', () => ({
  ClientOnly: jest.fn(({ children }) => children()),
}));

// Mock nanostores useStore
jest.mock('@nanostores/react', () => ({
  useStore: jest.fn(),
}));

describe('Header Component Responsiveness', () => {
  beforeEach(() => {
    // Reset mocks before each test
    isMobile.mockReset();
    (NanoStoresReact.useStore as jest.Mock).mockImplementation((store) => {
      if (store === chatStore) {
        return { started: true }; // Default mock state for chatStore
      }
      return {};
    });
  });

  test('shows hamburger menu and hides desktop toggle on mobile', () => {
    isMobile.mockReturnValue(true);
    // @ts-ignore
    global.innerWidth = 500; // Simulate mobile viewport
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });

    render(<Header />);

    // Hamburger icon is i-ph:list-bold
    // Desktop sidebar toggle icon is i-ph:sidebar-simple-duotone
    const hamburgerButton = screen.getByLabelText('Toggle sidebar').querySelector('.i-ph\\:list-bold');
    const desktopToggleButton = screen.getByLabelText('Toggle sidebar').querySelector('.i-ph\\:sidebar-simple-duotone');

    // In the Header, there are two buttons with "Toggle sidebar" label.
    // One for mobile (hamburger), one for desktop. We need to check their classes.
    const allToggleButtons = screen.getAllByLabelText('Toggle sidebar');
    let mobileButton, desktopButton;

    allToggleButtons.forEach(button => {
      if (button.querySelector('.i-ph\\:list-bold')) {
        mobileButton = button;
      } else if (button.querySelector('.i-ph\\:sidebar-simple-duotone')) {
        desktopButton = button;
      }
    });

    expect(mobileButton).toBeInTheDocument();
    expect(mobileButton).not.toHaveClass('md:hidden'); // Should be visible
    // The test environment might not apply Tailwind's md:hidden correctly to make it *not* visible.
    // Instead, we check if the one *meant* for mobile is there and the one *meant* for desktop has md:block
    // and thus might be hidden by Tailwind's mobile-first approach if not for md:block.

    // More robust: check computed style if possible, or rely on class presence for now.
    // The hamburger button itself has md:hidden, so it should NOT have it.
    // The desktop button has hidden md:block.

    // Hamburger button should be visible on mobile
    expect(mobileButton).not.toHaveClass('md:hidden');
    // Desktop button should be hidden on mobile (effectively, due to 'hidden' class)
    expect(desktopButton).toHaveClass('hidden');

  });

  test('shows desktop toggle and hides hamburger menu on desktop', () => {
    isMobile.mockReturnValue(false);
    // @ts-ignore
    global.innerWidth = 1024; // Simulate desktop viewport
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });

    render(<Header />);

    const allToggleButtons = screen.getAllByLabelText('Toggle sidebar');
    let mobileButton, desktopButton;

    allToggleButtons.forEach(button => {
      if (button.querySelector('.i-ph\\:list-bold')) {
        mobileButton = button;
      } else if (button.querySelector('.i-ph\\:sidebar-simple-duotone')) {
        desktopButton = button;
      }
    });

    expect(desktopButton).toBeInTheDocument();
    expect(desktopButton).toHaveClass('md:block'); // Should be visible via md:block
    expect(desktopButton).not.toHaveClass('hidden'); // The 'hidden' base class should be overridden by md:block

    expect(mobileButton).toBeInTheDocument(); // It's still in the DOM
    expect(mobileButton).toHaveClass('md:hidden'); // But hidden on desktop
  });
});
