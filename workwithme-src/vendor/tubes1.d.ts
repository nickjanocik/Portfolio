type TubeColor = string | number;

export interface TubeOptions {
  count?: number;
  colors?: TubeColor[];
  minRadius?: number;
  maxRadius?: number;
  minTubularSegments?: number;
  maxTubularSegments?: number;
  lerp?: number;
  noise?: number;
  lights?: { intensity: number; colors: TubeColor[] };
  material?: { metalness?: number; roughness?: number };
}

export interface TubesCursorOptions {
  /** This integration intentionally uses no postprocessing/bloom resources. */
  bloom: false;
  tubes?: TubeOptions;
  sleepRadiusX?: number;
  sleepRadiusY?: number;
  sleepTimeScale1?: number;
  sleepTimeScale2?: number;
  onError?: (error: unknown) => void;
}

export interface TubesApp {
  three: {
    setPaused(paused: boolean): void;
    resize(): void;
    onError: (error: unknown) => void;
    readonly isDisposed: boolean;
  };
  tubes: {
    setColors(colors: TubeColor[]): void;
    /** Supply exactly four light colors, as required by the upstream scene. */
    setLightsColors(colors: TubeColor[]): void;
    setLightsIntensity(intensity: number): void;
  };
  dispose(): void;
}

export default function createTubesCursor(
  canvas: HTMLCanvasElement,
  options: TubesCursorOptions,
): TubesApp;
