import { useState, useEffect, type ReactNode } from 'react';
import React from 'react';
import { ProjectsSidebar } from './ProjectsSidebar';
import { Link, useRouterState } from '@tanstack/react-router';
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react';
import {
  Bars3Icon,
  FolderIcon,
  HomeIcon,
  XMarkIcon,
  CodeBracketIcon,
  FolderOpenIcon,
  HeartIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: HomeIcon, id: 'dashboard' },
  {
    name: 'Contributions Overview',
    to: '/developer-analytics',
    icon: CodeBracketIcon,
    id: 'developer-analytics',
  },
  {
    name: 'Codebase Health',
    to: '/codebase-health',
    icon: HeartIcon,
    id: 'codebase-health',
  },
  {
    name: 'Repository Evolution',
    to: '/repository-evolution',
    icon: ChartBarIcon,
    id: 'repository-evolution',
  },
  {
    name: 'Bus Factor & Ownership',
    to: '/bus-factor-and-ownership',
    icon: ExclamationTriangleIcon,
    id: 'bus-factor-and-ownership',
  },
  {
    name: 'Social Network Analysis',
    to: '/social-network-analysis',
    icon: UserGroupIcon,
    id: 'social-network-analysis',
  },
  {
    name: 'Risk Analytics',
    to: '/risk-analytics',
    icon: ShieldExclamationIcon,
    id: 'risk-analytics',
  },
  {
    name: 'Technical Debt Indicators',
    to: '/technical-debt-indicators',
    icon: WrenchScrewdriverIcon,
    id: 'technical-debt-indicators',
  },
  {
    name: 'Projects',
    to: '/projects',
    icon: FolderOpenIcon,
    id: 'projects',
  },
  {
    name: 'Settings',
    to: '/settings',
    icon: Cog6ToothIcon,
    id: 'settings',
  },
];

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectsSidebarOpen, setProjectsSidebarOpen] = useState(false);

  // Load collapsed state from localStorage
  const [navSidebarCollapsed, setNavSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('navSidebarCollapsed');
    return saved === 'true';
  });
  const [projectsSidebarCollapsed, setProjectsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('projectsSidebarCollapsed');
    return saved === 'true';
  });

  const router = useRouterState();

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('navSidebarCollapsed', String(navSidebarCollapsed));
  }, [navSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('projectsSidebarCollapsed', String(projectsSidebarCollapsed));
  }, [projectsSidebarCollapsed]);

  const currentPath = router.location.pathname;
  // Map cross-repo routes to their base navigation items
  const normalizedPath = currentPath.startsWith('/cross-repo-repository-evolution')
    ? '/repository-evolution'
    : currentPath.startsWith('/cross-repo-analytics')
      ? '/developer-analytics'
      : currentPath.startsWith('/cross-repo-codebase-health')
        ? '/codebase-health'
        : currentPath.startsWith('/cross-repo-bus-factor-and-ownership')
          ? '/bus-factor-and-ownership'
          : currentPath.startsWith('/cross-repo-social-network-analysis')
            ? '/social-network-analysis'
            : currentPath.startsWith('/cross-repo-risk-analytics')
              ? '/risk-analytics'
              : currentPath.startsWith('/cross-repo-technical-debt-indicators')
                ? '/technical-debt-indicators'
                : currentPath;
  const currentView =
    navigation.find((item) => normalizedPath.startsWith(item.to))?.id || 'dashboard';

  return (
    <>
      <div>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                  </button>
                </div>
              </TransitionChild>

              {/* Sidebar component for mobile */}
              <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2 dark:bg-gray-900 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:border-r dark:before:border-white/10 dark:before:bg-black/10">
                <div className="relative flex h-16 shrink-0 items-center gap-x-3">
                  <img
                    src="/logo_alt.png"
                    alt="Git Intelligence"
                    className="h-8 w-auto rounded-lg"
                  />
                  <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    Git Intelligence
                  </h1>
                </div>
                <nav className="relative flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const isCurrent = currentView === item.id;
                          return (
                            <li key={item.name}>
                              <Link
                                to={item.to}
                                className={classNames(
                                  isCurrent
                                    ? 'bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
                                  'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                                )}
                              >
                                <item.icon
                                  aria-hidden="true"
                                  className={classNames(
                                    isCurrent
                                      ? 'text-indigo-600 dark:text-white'
                                      : 'text-gray-400 group-hover:text-indigo-600 dark:text-gray-500 dark:group-hover:text-white',
                                    'size-6 shrink-0'
                                  )}
                                />
                                {item.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div
          className={classNames(
            'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300',
            navSidebarCollapsed ? 'lg:w-16' : 'lg:w-72'
          )}
        >
          <div
            className={classNames(
              'relative flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:bg-black/10 transition-all duration-300',
              navSidebarCollapsed ? 'px-2 overflow-hidden' : 'px-6'
            )}
          >
            <div
              className={classNames(
                'relative flex h-16 shrink-0 items-center gap-x-3',
                navSidebarCollapsed && 'justify-center'
              )}
            >
              {!navSidebarCollapsed && (
                <>
                  <img
                    src="/logo_alt.png"
                    alt="Git Intelligence"
                    className="h-8 w-auto rounded-lg"
                  />
                  <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    Git Intelligence
                  </h1>
                </>
              )}
              {navSidebarCollapsed && (
                <img src="/logo_alt.png" alt="Git Intelligence" className="h-8 w-auto rounded-lg" />
              )}
            </div>
            <nav className="relative flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => {
                      const isCurrent = currentView === item.id;
                      return (
                        <li key={item.name}>
                          <Link
                            to={item.to}
                            className={classNames(
                              isCurrent
                                ? 'bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
                              'group flex rounded-md p-2 text-sm/6 font-semibold',
                              navSidebarCollapsed ? 'justify-center' : 'gap-x-3'
                            )}
                          >
                            <item.icon
                              aria-hidden="true"
                              className={classNames(
                                isCurrent
                                  ? 'text-indigo-600 dark:text-white'
                                  : 'text-gray-400 group-hover:text-indigo-600 dark:text-gray-500 dark:group-hover:text-white',
                                'size-6 shrink-0'
                              )}
                            />
                            {!navSidebarCollapsed && item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
                {/*<li>
                  <div className="text-xs/6 font-semibold text-gray-400 dark:text-gray-500">
                    Your teams
                  </div>
                  <ul role="list" className="-mx-2 mt-2 space-y-1">
                    {teams.map((team) => (
                      <li key={team.name}>
                        <a
                          href={team.href}
                          className={classNames(
                            team.current
                              ? 'bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
                            'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                          )}>
                          <span
                            className={classNames(
                              team.current
                                ? 'border-indigo-600 text-indigo-600 dark:border-white/20 dark:text-white'
                                : 'border-gray-200 text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600 dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:text-white',
                              'flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white text-[0.625rem] font-medium dark:bg-white/5'
                            )}>
                            {team.initial}
                          </span>
                          <span className="truncate">{team.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>*/}
                {/* Collapse button */}
                <li
                  className={classNames(
                    'mt-auto space-y-2',
                    navSidebarCollapsed ? '-mx-2 mb-2' : '-mx-6 mt-2 mb-2'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setNavSidebarCollapsed(!navSidebarCollapsed)}
                    className={classNames(
                      'flex items-center rounded-md p-2 text-sm/6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors',
                      navSidebarCollapsed ? 'w-full justify-center' : 'w-full gap-x-3'
                    )}
                    title={navSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {navSidebarCollapsed ? (
                      <ChevronRightIcon className="size-6 shrink-0" />
                    ) : (
                      <>
                        <ChevronLeftIcon className="size-6 shrink-0" />
                        <span>Collapse</span>
                      </>
                    )}
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-xs sm:px-6 lg:hidden dark:bg-gray-900 dark:shadow-none dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:border-b dark:before:border-white/10 dark:before:bg-black/10">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="relative -m-2.5 p-2.5 text-gray-700 lg:hidden dark:text-gray-400"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
          <div className="relative flex-1 text-sm/6 font-semibold text-gray-900 dark:text-white">
            {navigation.find((item) => item.id === currentView)?.name || 'Dashboard'}
          </div>
          {sidebar && (
            <button
              type="button"
              onClick={() => setProjectsSidebarOpen(true)}
              className="relative -m-2.5 p-2.5 text-gray-700 dark:text-gray-400"
              title="Open projects"
            >
              <span className="sr-only">Open projects</span>
              <FolderIcon aria-hidden="true" className="size-6" />
            </button>
          )}
          <Link
            to="/settings"
            className="relative -m-2.5 p-2.5 text-gray-700 dark:text-gray-400"
            title="Settings"
          >
            <span className="sr-only">Settings</span>
            <Cog6ToothIcon aria-hidden="true" className="size-6" />
          </Link>
        </div>

        {/* Projects sidebar mobile dialog */}
        {sidebar && (
          <Dialog
            open={projectsSidebarOpen}
            onClose={setProjectsSidebarOpen}
            className="relative z-50 xl:hidden"
          >
            <DialogBackdrop
              transition
              className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
            />

            <div className="fixed inset-0 flex">
              <DialogPanel
                transition
                className="relative ml-auto flex w-full max-w-sm flex-1 transform transition duration-300 ease-in-out data-closed:translate-x-full"
              >
                <TransitionChild>
                  <div className="absolute top-0 right-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                    <button
                      type="button"
                      onClick={() => setProjectsSidebarOpen(false)}
                      className="-m-2.5 p-2.5"
                    >
                      <span className="sr-only">Close projects</span>
                      <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                    </button>
                  </div>
                </TransitionChild>

                {/* Projects sidebar for mobile */}
                <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-4 py-6 sm:px-6 dark:bg-gray-900 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:border-l dark:before:border-white/10 dark:before:bg-black/10">
                  {sidebar}
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        )}

        <main
          className={classNames(
            'transition-all duration-300',
            // Main padding accounts for nav sidebar width
            navSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'
          )}
        >
          <div
            className={classNames(
              'transition-all duration-300',
              // Inner div padding accounts for projects sidebar width
              // When collapsed: 16px, when expanded: 96px, when no sidebar: 0
              !sidebar ? '' : projectsSidebarCollapsed ? 'xl:pl-16' : 'xl:pl-96'
            )}
          >
            <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
              {/* Floating button for projects sidebar on lg screens (not xl) */}
              {sidebar && (
                <div className="fixed bottom-6 right-6 z-40 lg:block xl:hidden">
                  <button
                    type="button"
                    onClick={() => setProjectsSidebarOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    title="Open projects"
                  >
                    <FolderIcon aria-hidden="true" className="size-5" />
                    <span>Projects</span>
                  </button>
                </div>
              )}
              {children}
            </div>
          </div>
        </main>

        {/* Projects sidebar for desktop (xl screens) */}
        {sidebar && (
          <aside
            className={classNames(
              'fixed inset-y-0 hidden overflow-y-auto border-r border-gray-200 dark:border-white/10 transition-all duration-300 xl:block',
              navSidebarCollapsed ? 'left-16' : 'left-72',
              projectsSidebarCollapsed ? 'w-16 px-2' : 'w-96 px-4 py-6 sm:px-6 lg:px-8'
            )}
          >
            <div className="relative h-full">
              {React.isValidElement(sidebar) && sidebar.type === ProjectsSidebar
                ? React.cloneElement(
                    sidebar as React.ReactElement<{
                      onCollapse?: () => void;
                      showCollapseButton?: boolean;
                      isCollapsed?: boolean;
                      onExpand?: () => void;
                    }>,
                    {
                      onCollapse: () => setProjectsSidebarCollapsed(true),
                      showCollapseButton: !projectsSidebarCollapsed,
                      isCollapsed: projectsSidebarCollapsed,
                      onExpand: () => setProjectsSidebarCollapsed(false),
                    }
                  )
                : sidebar}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
