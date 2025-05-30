import { atom } from 'nanostores';

// Define the type for the language object
interface Language {
  code: string;
  name?: string; // Optional: for display purposes
}

// Create an atom for the language store, defaulting to English
export const languageStore = atom<Language>({ code: 'en' });

// Function to update the language
export function setLanguage(languageCode: string) {
  // In a real scenario, you might want to fetch language details
  // or validate the code against a list of supported languages.
  languageStore.set({ code: languageCode });
}

// Example: How to listen for changes (optional, for components that need to react)
// languageStore.listen(newLanguage => {
//   console.log('Language changed to:', newLanguage.code);
// });

// Example: How to update the language (e.g., from a language selector UI)
// setLanguage('ar'); // Sets language to Arabic
// setLanguage('en'); // Sets language to English
