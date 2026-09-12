import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const filename = process.argv[2];
assert(
  filename,
  "Usage: node scripts/verify-tubes-lifecycle.mjs <path/to/vendor/tubes1.js>",
);
const source = readFileSync(filename, "utf8");
const wrapper = source.slice(
  source.indexOf("class BC {"),
  source.indexOf("function PC("),
);
assert(source.includes('document.body.removeEventListener("click",sB)'));
assert(source.includes("onError:s.onError,rendererOptions:"));

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function environment() {
  const events = () => {
    const handlers = new Map();
    return {
      handlers,
      addEventListener(name, fn) {
        if (!handlers.has(name)) handlers.set(name, new Set());
        handlers.get(name).add(fn);
      },
      removeEventListener(name, fn) {
        handlers.get(name)?.delete(fn);
      },
      fire(name) {
        for (const fn of [...(handlers.get(name) ?? [])]) fn();
      },
    };
  };
  const window = {
    ...events(),
    devicePixelRatio: 3,
    innerWidth: 1280,
    innerHeight: 720,
  };
  const document = { ...events(), hidden: false };
  const timers = new Map();
  let nextTimer = 0;
  const observers = [];
  class Observer {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
    trigger(visible) {
      this.callback([{ isIntersecting: visible }]);
    }
  }
  class Clock {
    start() {
      this.running = true;
    }
    stop() {
      this.running = false;
    }
    getDelta() {
      return 10;
    }
  }
  class Camera {
    constructor() {
      this.fov = 50;
      this.isPerspectiveCamera = true;
      this.position = { length: () => 5 };
    }
    updateProjectionMatrix() {}
  }
  class Scene {
    traverse() {}
    clear() {
      this.cleared = true;
    }
  }
  class Renderer {
    initialized = false;
    initCalls = 0;
    disposeCalls = 0;
    _animation = {
      active: false,
      starts: 0,
      stop() {
        this.active = false;
      },
      start() {
        assert.equal(this.active, false, "Starting a second animation loop");
        this.active = true;
        this.starts++;
      },
      setAnimationLoop(fn) {
        this.callback = fn;
      },
    };
    init() {
      this.initCalls++;
      assert.equal(this.initCalls, 1);
      return new Promise((resolve, reject) => {
        this.resolveInit = () => {
          this.initialized = true;
          this._animation.start();
          resolve(this);
        };
        this.rejectInit = reject;
      });
    }
    hasInitialized() {
      return this.initialized;
    }
    setSize(width, height) {
      this.width = width;
      this.height = height;
    }
    setPixelRatio(value) {
      this.pixelRatio = value;
    }
    render() {
      this.renders = (this.renders ?? 0) + 1;
    }
    dispose() {
      assert(
        this.initialized,
        "Disposing uninitialized renderer would create one upstream",
      );
      this.disposeCalls++;
      this._animation.stop();
    }
  }
  const context = vm.createContext({
    window,
    document,
    console,
    cn: Clock,
    kr: Camera,
    Yr: Scene,
    oC: Renderer,
    tt: {
      degToRad: (n) => (n * Math.PI) / 180,
      radToDeg: (n) => (n * 180) / Math.PI,
    },
    IntersectionObserver: Observer,
    ResizeObserver: Observer,
    setTimeout(fn) {
      const id = ++nextTimer;
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  vm.runInContext(wrapper + "\nglobalThis.Adapter = BC;", context);
  const parent = { offsetWidth: 600, offsetHeight: 320 };
  const canvas = { style: {}, parentElement: parent };
  const errors = [];
  const app = new context.Adapter({
    canvas,
    size: "parent",
    onError: (error) => errors.push(error),
  });
  const io = observers.at(-1);
  return { app, io, window, document, observers, timers, parent, errors };
}

{
  const { app, io, window, document } = environment();
  assert.equal(app.renderer.pixelRatio, 1.5);
  app.setPaused(true);
  io.trigger(true);
  assert.equal(
    app.renderer.initCalls,
    0,
    "Initial user pause must defer renderer initialization",
  );
  app.setPaused(false);
  app.setPaused(false);
  assert.equal(app.renderer.initCalls, 1);
  app.renderer.resolveInit();
  await flush();
  assert(app.renderer._animation.active);
  app.renderer._animation.callback();
  assert.equal(app.renderer.renders, 1);
  app.setPaused(true);
  assert.equal(app.renderer._animation.active, false);
  io.trigger(false);
  io.trigger(true);
  document.hidden = true;
  document.fire("visibilitychange");
  document.hidden = false;
  document.fire("visibilitychange");
  assert.equal(
    app.renderer._animation.active,
    false,
    "IO/visibility must not override user pause",
  );
  app.setPaused(false);
  assert(app.renderer._animation.active);
  io.trigger(false);
  assert.equal(app.renderer._animation.active, false);
  io.trigger(true);
  assert(app.renderer._animation.active);
  window.fire("resize");
  app.dispose();
  app.dispose();
  assert.equal(app.renderer.disposeCalls, 1);
}

{
  const { app, io } = environment();
  io.trigger(true);
  app.setPaused(true);
  app.renderer.resolveInit();
  await flush();
  assert.equal(
    app.renderer._animation.active,
    false,
    "Pause during init must prevent later startup",
  );
  app.setPaused(false);
  assert(app.renderer._animation.active);
  app.dispose();
}

{
  const { app, io, window, document, observers, timers } = environment();
  io.trigger(true);
  window.fire("resize");
  assert.equal(timers.size, 1);
  app.dispose();
  assert.equal(timers.size, 0);
  assert.equal(window.handlers.get("resize").size, 0);
  assert.equal(document.handlers.get("visibilitychange").size, 0);
  assert(observers.every((observer) => observer.disconnected));
  assert.equal(app.renderer.disposeCalls, 0);
  app.renderer.resolveInit();
  await flush();
  assert.equal(
    app.renderer.disposeCalls,
    1,
    "Late init must release its renderer",
  );
  assert.equal(app.renderer._animation.active, false);
  app.resize();
  app.setPaused(false);
  io.trigger(true);
  assert.equal(app.renderer.initCalls, 1);
}

{
  const { app, io, parent } = environment();
  parent.offsetWidth = 0;
  app.resize();
  io.trigger(true);
  assert.equal(app.renderer.initCalls, 0);
  parent.offsetWidth = 500;
  app.resize();
  app.renderer.resolveInit();
  await flush();
  assert(app.renderer._animation.active);
  app.dispose();
}

{
  const { app } = environment();
  app.dispose();
  assert.equal(
    app.renderer.initCalls,
    0,
    "Never-visible cleanup must not initialize",
  );
  assert.equal(app.renderer.disposeCalls, 0);
}

{
  const { app, io, errors } = environment();
  io.trigger(true);
  const failure = new Error("GPU unavailable");
  app.renderer.rejectInit(failure);
  await flush();
  assert.equal(errors[0], failure);
  app.setPaused(false);
  io.trigger(true);
  assert.equal(app.renderer.initCalls, 1, "Failed init must not repeat");
  app.dispose();
}

console.log(
  "PASS: user pause, visibility, init races, late disposal, listeners, resize timer, zero size, DPR, and error fallback.",
);
