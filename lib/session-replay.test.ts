import { describe, expect, test, vi } from "vitest";
import {
  createReplayGuard,
  isReplayPausedPath,
  type ReplayWindow,
} from "./session-replay";

function fakeRecorder() {
  let running = false;
  const recorder = {
    starts: 0,
    stops: 0,
    get running() {
      return running;
    },
    init: vi.fn((_config: unknown) => {
      if (!running) {
        running = true;
        recorder.starts++;
      }
      return {
        stop: async () => {
          running = false;
          recorder.stops++;
        },
      };
    }),
  };
  return recorder;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("session replay pages", () => {
  test("only the sign-in and sign-up pages are excluded", () => {
    for (const path of ["/sign-in", "/sign-in/factor-one", "/sign-up", "/sign-up/verify"]) {
      expect(isReplayPausedPath(path)).toBe(true);
    }
    for (const path of ["/", "/dashboard", "/links/sign-in", "/sign-inx", "/signin"]) {
      expect(isReplayPausedPath(path)).toBe(false);
    }
  });
});

describe("session replay guard", () => {
  test("recording stops on sign-in and resumes on the next page", async () => {
    const recorder = fakeRecorder();
    recorder.init({});
    const win: ReplayWindow = { OrangeReplay: recorder, __orInit: {}, __orLoaderStarted: 1 };
    const guard = createReplayGuard(win, () => {});

    guard("/");
    guard("/sign-in");
    await settle();
    expect(recorder.running).toBe(false);

    guard("/sign-up");
    await settle();
    expect(recorder.starts).toBe(1);

    guard("/dashboard");
    await settle();
    expect(recorder.running).toBe(true);
    expect(recorder.starts).toBe(2);
  });

  test("a visit that begins on sign-in loads replay only after leaving it", () => {
    const win: ReplayWindow = {};
    win.__ndleStartReplay = vi.fn(() => {
      win.__orLoaderStarted = 1;
    });
    const guard = createReplayGuard(win, () => {});

    guard("/sign-in");
    expect(win.__ndleStartReplay).not.toHaveBeenCalled();
    guard("/dashboard");
    expect(win.__ndleStartReplay).toHaveBeenCalledTimes(1);
  });

  test("a recorder still downloading is stopped once it starts on sign-in", async () => {
    const recorder = fakeRecorder();
    const win: ReplayWindow = { __orInit: {}, __orLoaderStarted: 1 };
    const onLoad: Array<() => void> = [];
    const guard = createReplayGuard(win, (callback) => onLoad.push(callback));

    guard("/");
    guard("/sign-in");
    // The script arrives and starts recording on its own.
    win.OrangeReplay = recorder;
    recorder.init({});
    for (const callback of onLoad) callback();
    await settle();
    expect(recorder.running).toBe(false);
  });

  test("a recorder that arrives after the visitor left sign-in keeps recording", async () => {
    const recorder = fakeRecorder();
    const win: ReplayWindow = { __orInit: {}, __orLoaderStarted: 1 };
    const onLoad: Array<() => void> = [];
    const guard = createReplayGuard(win, (callback) => onLoad.push(callback));

    guard("/sign-in");
    guard("/");
    win.OrangeReplay = recorder;
    recorder.init({});
    for (const callback of onLoad) callback();
    await settle();
    expect(recorder.running).toBe(true);
    expect(recorder.stops).toBe(0);
  });
});
