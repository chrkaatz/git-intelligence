import { useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react';
import {
  Bars3Icon,
  FolderIcon,
  HomeIcon,
  XMarkIcon,
  CodeBracketIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: HomeIcon, id: 'dashboard' },
  {
    name: 'Developer Analytics',
    to: '/developer-analytics',
    icon: CodeBracketIcon,
    id: 'developer-analytics',
  },
  {
    name: 'Projects',
    to: '/projects',
    icon: FolderOpenIcon,
    id: 'projects',
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
  const router = useRouterState();

  const currentPath = router.location.pathname;
  const currentView =
    navigation.find((item) => currentPath.startsWith(item.to))?.id ||
    'dashboard';

  return (
    <>
      <div>
        <Dialog
          open={sidebarOpen}
          onClose={setSidebarOpen}
          className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5">
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      aria-hidden="true"
                      className="size-6 text-white"
                    />
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
                                )}>
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
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="relative flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 dark:border-white/10 dark:bg-gray-900 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:bg-black/10">
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
                            )}>
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
                <li className="-mx-6 mt-auto">
                  <a
                    href="#"
                    className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">
                    <img
                      alt=""
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      className="size-8 rounded-full bg-gray-50 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
                    />
                    <span className="sr-only">Your profile</span>
                    <span aria-hidden="true">Tom Cook</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-xs sm:px-6 lg:hidden dark:bg-gray-900 dark:shadow-none dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:border-b dark:before:border-white/10 dark:before:bg-black/10">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="relative -m-2.5 p-2.5 text-gray-700 lg:hidden dark:text-gray-400">
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
          <div className="relative flex-1 text-sm/6 font-semibold text-gray-900 dark:text-white">
            {navigation.find((item) => item.id === currentView)?.name ||
              'Dashboard'}
          </div>
          {sidebar && (
            <button
              type="button"
              onClick={() => setProjectsSidebarOpen(true)}
              className="relative -m-2.5 p-2.5 text-gray-700 dark:text-gray-400"
              title="Open projects">
              <span className="sr-only">Open projects</span>
              <FolderIcon aria-hidden="true" className="size-6" />
            </button>
          )}
          <a href="#" className="relative">
            <span className="sr-only">Your profile</span>
            <img
              alt=""
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              className="size-8 rounded-full bg-gray-50 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
            />
          </a>
        </div>

        {/* Projects sidebar mobile dialog */}
        {sidebar && (
          <Dialog
            open={projectsSidebarOpen}
            onClose={setProjectsSidebarOpen}
            className="relative z-50 xl:hidden">
            <DialogBackdrop
              transition
              className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
            />

            <div className="fixed inset-0 flex">
              <DialogPanel
                transition
                className="relative ml-auto flex w-full max-w-sm flex-1 transform transition duration-300 ease-in-out data-closed:translate-x-full">
                <TransitionChild>
                  <div className="absolute top-0 right-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                    <button
                      type="button"
                      onClick={() => setProjectsSidebarOpen(false)}
                      className="-m-2.5 p-2.5">
                      <span className="sr-only">Close projects</span>
                      <XMarkIcon
                        aria-hidden="true"
                        className="size-6 text-white"
                      />
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

        <main className="lg:pl-72">
          <div className="xl:pl-96">
            <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
              {/* Floating button for projects sidebar on lg screens (not xl) */}
              {sidebar && (
                <div className="fixed bottom-6 right-6 z-40 lg:block xl:hidden">
                  <button
                    type="button"
                    onClick={() => setProjectsSidebarOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    title="Open projects">
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
          <aside className="fixed inset-y-0 left-72 hidden w-96 overflow-y-auto border-r border-gray-200 px-4 py-6 sm:px-6 lg:px-8 xl:block dark:border-white/10">
            {sidebar}
          </aside>
        )}
      </div>
    </>
  );
}
