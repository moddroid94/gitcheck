/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RepoList } from './components/RepoList';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <RepoList />
      </div>
    </ThemeProvider>
  );
}
