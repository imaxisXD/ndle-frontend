/**
 * Session replay (Orange Replay) stays off on the sign-in and sign-up pages.
 * The loader in the root layout skips them on a first visit, and
 * `createReplayGuard` pauses and resumes recording as the visitor moves
 * between pages without a full reload.
 */
export const REPLAY_PAUSED_PATH = /^\/sign-(?:in|up)(?:\/|$)/;
export const REPLAY_RECORDER_URL = "https://orangereplay.app/or-recorder.js";

export function isReplayPausedPath(pathname: string): boolean {
  return REPLAY_PAUSED_PATH.test(pathname);
}

type ReplayController = { stop(): Promise<void> };

export type ReplayWindow = {
  // Set by the recorder script. `init` returns the running recorder, or starts one.
  OrangeReplay?: { init(config: unknown): ReplayController };
  // Set by the loader in the root layout.
  __orInit?: unknown;
  __orLoaderStarted?: number;
  __ndleStartReplay?: () => void;
};

export function createReplayGuard(
  win: ReplayWindow,
  whenRecorderLoads: (callback: () => void) => void,
): (pathname: string) => void {
  let paused = false;
  let stopping: Promise<void> = Promise.resolve();

  const stop = () => {
    if (!win.OrangeReplay || win.__orInit === undefined) return;
    stopping = win.OrangeReplay.init(win.__orInit)
      .stop()
      .catch(() => undefined);
  };

  return (pathname) => {
    if (isReplayPausedPath(pathname)) {
      if (paused) return;
      paused = true;
      if (win.OrangeReplay) stop();
      // The recorder is still downloading: stop it as soon as it starts.
      else if (win.__orLoaderStarted)
        whenRecorderLoads(() => {
          if (paused) stop();
        });
      return;
    }
    if (!paused) return;
    paused = false;
    if (win.OrangeReplay) {
      const recorder = win.OrangeReplay;
      const config = win.__orInit;
      void stopping.then(() => {
        if (!paused) recorder.init(config);
      });
    } else if (!win.__orLoaderStarted) {
      // The visit began on a sign-in page, so the loader has not run yet.
      win.__ndleStartReplay?.();
    }
  };
}
