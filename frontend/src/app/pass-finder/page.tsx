import Link from "next/link";
import PassFinderClient from "../../components/PassFinderClient";

export default function PassFinderPage() {
  return (
    <div className="bg-white text-zinc-900 dark:bg-zinc-950 relative min-h-screen font-sans selection:bg-zinc-200 dark:text-zinc-50 dark:selection:bg-zinc-800 overflow-x-hidden">
      <div className="fixed inset-0 z-[-1] isolate pointer-events-none antialiased">
        <svg
          className="h-full w-full absolute inset-0 stroke-zinc-200/50 dark:stroke-zinc-800/50 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid-pattern-pass" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M0 40L40 0H20L0 20M40 40V20L20 40"
                strokeWidth="1"
                fill="none"
              ></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#grid-pattern-pass)"></rect>
        </svg>
        <div className="w-[40rem] h-[40rem] rounded-full bg-gradient-to-br absolute top-0 right-0 -mr-20 -mt-20 from-zinc-200/40 to-zinc-100/0 blur-3xl dark:from-zinc-800/20 dark:to-zinc-900/0 transform-gpu opacity-60"></div>
        <div className="w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr absolute bottom-0 left-0 -ml-20 -mb-20 from-zinc-200/40 to-zinc-100/0 blur-3xl dark:from-zinc-800/20 dark:to-zinc-900/0 transform-gpu opacity-60"></div>
      </div>

      <nav className="w-full mx-auto px-6 lg:px-8 py-6 items-center justify-between relative z-50 max-w-screen-2xl flex">
        <div className="items-center flex gap-3">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 items-center justify-center rounded flex">
            <svg className="w-5 h-5 text-white dark:text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              ></path>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            where
            <span className="text-zinc-400 dark:text-zinc-600">ISS?</span>
          </span>
        </div>
        <div className="md:flex items-center hidden gap-8">
          <a
            href="/live-map"
          >
            <button
            type="button"
            className="hidden uppercase hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors sm:block text-sm font-bold tracking-widest text-zinc-500"
            >
              Live Map
            </button>
          </a>

          <a
            href="/pass-finder"
          >
            <button
            type="button"
            className="dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors bg-zinc-900 text-white dark:bg-zinc-100 px-5 py-2 rounded-full text-sm font-semibold"
            >
              Passes
            </button>
          </a>
        </div>
        <div>
        </div>
      </nav>

      <main className="w-full mx-auto px-6 lg:px-8 pb-20 max-w-screen-2xl">
        <div className="mt-8 mb-10">
          <div className="md:flex-row md:items-end justify-between flex flex-col gap-6">
            <div>
              <div className="items-center mb-2 flex gap-2">
                <span className="items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 inline-flex gap-1.5 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  LOCAL VISIBILITY
                </span>
                <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
                  PASS FINDER
                </span>
              </div>
              <p className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Find the next visible pass for your location
              </p>
            </div>
            <div className="items-end flex flex-col">
              <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
                Status
              </span>
              <span className="text-2xl font-medium text-zinc-900 font-mono dark:text-white">
                Awaiting Input
              </span>
            </div>
          </div>
        </div>

        <PassFinderClient />
        <div className="mt-10 text-xs text-zinc-500 dark:text-zinc-400">
          Contact me at whereisstheiss@gmail.com
        </div>
      </main>
    </div>
  );
}
