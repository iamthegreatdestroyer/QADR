'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Atom, Github, Settings, Moon, Sun } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-qadr-500 to-qadr-700">
            <Atom className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            QADR
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-qadr-600 dark:text-gray-300 dark:hover:text-qadr-400 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/analyze"
            className="text-sm font-medium text-gray-700 hover:text-qadr-600 dark:text-gray-300 dark:hover:text-qadr-400 transition-colors"
          >
            Analyze
          </Link>
          <Link
            href="/resolve"
            className="text-sm font-medium text-gray-700 hover:text-qadr-600 dark:text-gray-300 dark:hover:text-qadr-400 transition-colors"
          >
            Resolve
          </Link>
          <Link
            href="/benchmarks"
            className="text-sm font-medium text-gray-700 hover:text-qadr-600 dark:text-gray-300 dark:hover:text-qadr-400 transition-colors"
          >
            Benchmarks
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="btn btn-ghost p-2"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <a
            href="https://github.com/iamthegreatdestroyer/QADR"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost p-2"
            aria-label="GitHub repository"
          >
            <Github className="h-5 w-5" />
          </a>
          <Link href="/settings" className="btn btn-ghost p-2" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden btn btn-ghost p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/analyze"
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              Analyze
            </Link>
            <Link
              href="/resolve"
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              Resolve
            </Link>
            <Link
              href="/benchmarks"
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              Benchmarks
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
