import { render, screen, act } from '@testing-library/react';
import { Menu } from './Menu.client';
import { motion } from 'framer-motion'; // To check motion.div props
import * as ProfileStore from '~/lib/stores/profile';
import * as ChatHistory from '~/lib/persistence/useChatHistory';
import * as Toastify from 'react-toastify'; // To mock toast

// Mock isMobile utility
jest.mock('~/utils/mobile', () => ({
  isMobile: jest.fn(),
}));
const { isMobile } = require('~/utils/mobile');

// Mock Framer Motion
jest.mock('framer-motion', () => {
  const original = jest.requireActual('framer-motion');
  return {
    ...original,
    motion: {
      ...original.motion,
      div: jest.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    },
  };
});

// Mock nanostores useStore for profileStore
jest.mock('@nanostores/react', () => ({
  useStore: jest.fn(),
}));

// Mock useChatHistory
jest.mock('~/lib/persistence/useChatHistory', () => ({
  useChatHistory: jest.fn(() => ({
    duplicateCurrentChat: jest.fn(),
    exportChat: jest.fn(),
  })),
  db: null, // Mock db object
  getAll: jest.fn().mockResolvedValue([]), // Mock getAll
  chatId: { get: jest.fn() }, // Mock chatId
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    dismiss: jest.fn(),
  },
  ToastContainer: jest.fn(() => null), // Mock ToastContainer
}));


// Mock child components that are not essential for this specific test
jest.mock('./HistoryItem', () => ({ HistoryItem: () => <div /> }));
jest.mock('~/components/ui/ThemeSwitch', () => ({ ThemeSwitch: () => <div /> }));
jest.mock('~/components/ui/SettingsButton', () => ({ SettingsButton: () => <div /> }));
jest.mock('~/components/@settings/core/ControlPanel', () => ({ ControlPanel: () => <div /> }));


describe('Menu Component Responsiveness', () => {
  let mockUseStore;
  let originalWindowAddEventListener;
  let originalWindowRemoveEventListener;
  let mouseMoveListener = null;

  beforeEach(() => {
    isMobile.mockReset();
    (motion.div as jest.Mock).mockClear();

    mockUseStore = require('@nanostores/react').useStore;
    mockUseStore.mockImplementation((store) => {
      if (store === ProfileStore.profileStore) {
        return { username: 'TestUser', avatar: 'avatar.png' };
      }
      return {};
    });

    // Spy on window event listeners for mousemove
    mouseMoveListener = null;
    originalWindowAddEventListener = window.addEventListener;
    originalWindowRemoveEventListener = window.removeEventListener;
    window.addEventListener = jest.fn((event, cb) => {
      if (event === 'mousemove') {
        mouseMoveListener = cb;
      } else {
        originalWindowAddEventListener(event, cb);
      }
    });
    window.removeEventListener = jest.fn((event, cb) => {
      if (event === 'mousemove' && mouseMoveListener === cb) {
        mouseMoveListener = null;
      } else {
        originalWindowRemoveEventListener(event, cb);
      }
    });

    // Mock document.documentElement.dir for variant selection
    Object.defineProperty(document, 'documentElement', {
        configurable: true,
        value: { dir: 'ltr', getAttribute: () => 'ltr', setAttribute: () => {} },
    });
  });

  afterEach(() => {
    window.addEventListener = originalWindowAddEventListener;
    window.removeEventListener = originalWindowRemoveEventListener;
  });

  test('uses mobile variants and disables mousemove listener on mobile', () => {
    isMobile.mockReturnValue(true);
    render(<Menu isMobileMenuOpen={true} toggleMobileMenu={() => {}} />);

    const motionDiv = motion.div as jest.Mock;
    expect(motionDiv).toHaveBeenCalled();
    const variantsProp = motionDiv.mock.calls[0][0].variants; // First call, first arg, variants prop

    // Check if the variants have keys typical of mobile variants (e.g., 'x' transform)
    // This is an approximation. A more robust check would be to export and compare actual variant objects.
    expect(variantsProp.closed).toHaveProperty('x');
    expect(variantsProp.open).toHaveProperty('x');
    expect(variantsProp.closed).not.toHaveProperty('left'); // Desktop variants use 'left'/'right'

    // Check that mousemove listener was NOT attached
    expect(window.addEventListener).not.toHaveBeenCalledWith('mousemove', expect.any(Function));
     // Or, more accurately, if it was called but then immediately removed due to mobileView check in useEffect
    expect(mouseMoveListener).toBeNull();
  });

  test('uses desktop variants and enables mousemove listener on desktop', () => {
    isMobile.mockReturnValue(false);
    render(<Menu />); // No mobile props needed for desktop

    const motionDiv = motion.div as jest.Mock;
    expect(motionDiv).toHaveBeenCalled();
    const variantsProp = motionDiv.mock.calls[0][0].variants;

    expect(variantsProp.closed).toHaveProperty('left'); // Desktop LTR
    expect(variantsProp.open).toHaveProperty('left');
    expect(variantsProp.closed).not.toHaveProperty('x');

    // Check that mousemove listener WAS attached
    expect(window.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(mouseMoveListener).not.toBeNull();
  });

  test('overlay is rendered on mobile when menu is open', () => {
    isMobile.mockReturnValue(true);
    render(<Menu isMobileMenuOpen={true} toggleMobileMenu={() => {}} />);
    // The overlay is a sibling div to motion.div, rendered conditionally
    // It has className="fixed inset-0 bg-black/50 z-menu-overlay md:hidden"
    // We can't directly test for this div with a specific test ID unless added.
    // However, its existence is tied to `mobileView && isMobileMenuOpen`
    // This test is more about the logic that would render it.
    // A more direct way would be to query for an element with 'z-menu-overlay' if possible
    // For now, this test confirms the setup where it *should* be rendered.
    // If we could query by a specific unique class:
    // const overlay = document.querySelector('.z-menu-overlay');
    // expect(overlay).toBeInTheDocument();
    // Since it's hard to query directly without a test-id, this test is more conceptual.
    // The actual rendering logic is: {mobileView && isMobileMenuOpen && (<div className="...z-menu-overlay..." />)}
    // We've set mobileView=true (via isMobile mock) and isMobileMenuOpen=true.
    // Thus, the condition for rendering the overlay is met.
    // A snapshot test would catch its presence/absence.
    const { container } = render(<Menu isMobileMenuOpen={true} toggleMobileMenu={() => {}} />);
    // Find div that contains z-menu-overlay class
    const overlay = container.querySelector('div[class*="z-menu-overlay"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('md:hidden'); // Ensure it's meant for mobile
  });

  test('overlay is not rendered on desktop, or when mobile menu is closed', () => {
    isMobile.mockReturnValue(false); // Desktop
    const { container: desktopContainer } = render(<Menu />);
    let overlay = desktopContainer.querySelector('div[class*="z-menu-overlay"]');
    expect(overlay).not.toBeInTheDocument();

    isMobile.mockReturnValue(true); // Mobile
    const { container: mobileClosedContainer } = render(<Menu isMobileMenuOpen={false} toggleMobileMenu={() => {}} />);
    overlay = mobileClosedContainer.querySelector('div[class*="z-menu-overlay"]');
    expect(overlay).not.toBeInTheDocument();
  });
});
