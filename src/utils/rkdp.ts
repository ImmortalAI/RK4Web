import { create, all } from 'mathjs';
import type { MathJsInstance, EvalFunction } from 'mathjs';

type EquationInput = string; // ASCII math expression

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Subscriber = (...args: any[]) => void;
type EventType =
  | 'equationsUpdated'
  | 'initialConditionsChanged'
  | 'rangeChanged'
  | 'toleranceChanged'
  | 'calculationStarted'
  | 'calculationProgress'
  | 'calculationCanceled'
  | 'calculationCompleted';

export interface Range {
  start: number;
  end: number;
  initialStep: number;
}

export interface SolutionPoint {
  x: number;
  [varName: string]: number;
}

export class DormandPrinceSolver {
  private math: MathJsInstance;
  private rawEquations: EquationInput[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private funcs: ((scope: any) => number)[] = [];
  private variables: string[] = [];
  private initConds: Record<string, number> = {};
  private range: Range = { start: 0, end: 1, initialStep: 0.1 };
  private tolerance: number = 1e-6;
  private subscribers = new Map<string, Set<Subscriber>>();
  private _cancelRequested = false;

  constructor(tolerance: number = 1e-6) {
    this.math = create(all);
    this.tolerance = tolerance;
  }

  addEquations(eqs: EquationInput[]) {
    this.rawEquations = eqs;
    this.parseEquations();
    this.emit('equationsUpdated', this.variables.slice());
  }

  setInitialConditions(conds: Record<string, number>) {
    for (const v of Object.keys(conds)) {
      if (!this.variables.includes(v)) {
        throw new Error(`Unknown variable '${v}'.`);
      }
    }
    this.initConds = { ...conds };
    this.emit('initialConditionsChanged', this.initConds);
  }

  getVariableNames(): string[] {
    return this.variables.slice();
  }

  setRange(start: number, end: number, initialStep: number) {
    if (end <= start) throw new Error('End must be > start');
    this.range = { start, end, initialStep };
    this.emit('rangeChanged', this.range);
  }

  setTolerance(tol: number) {
    this.tolerance = tol;
    this.emit('toleranceChanged', tol);
  }

  subscribe(event: EventType, cb: Subscriber): () => void {
    if (!this.subscribers.has(event)) this.subscribers.set(event, new Set());
    this.subscribers.get(event)!.add(cb);
    return () => this.subscribers.get(event)!.delete(cb);
  }

  cancel() {
    this._cancelRequested = true;
    this.emit('calculationCanceled');
  }

  async calculate(): Promise<SolutionPoint[]> {
    console.log('hello');
    this.checkReady();
    this._cancelRequested = false;

    const { start, end, initialStep } = this.range;

    let x = start;
    let y = this.variables.map((v) => {
      if (this.initConds[v] === undefined) throw new Error(`Missing IC for ${v}`);
      return this.initConds[v];
    });

    const results: SolutionPoint[] = [];
    this.emit('calculationStarted', { range: this.range, tolerance: this.tolerance });

    let h = initialStep;
    const safety = 0.9;
    const maxFactor = 5;
    const minFactor = 0.2;

    while (x < end) {
      if (this._cancelRequested) break;
      if (x + h > end) h = end - x;

      const { y5, y4 } = this.dormandPrinceStep(x, y, h);

      const err = Math.max(...y5.map((yi5, i) => Math.abs(yi5 - y4[i])));
      const tol = this.tolerance * Math.max(1, ...y5.map(Math.abs));

      if (err <= tol) {
        x += h;
        y = y5;
        const point: SolutionPoint = { x };
        this.variables.forEach((v, i) => (point[v] = y[i]));
        results.push(point);
        this.emit('calculationProgress', { x, step: h, error: err });
      }

      const factor = safety * Math.pow(tol / (err || 1e-16), 1 / 5);
      h = Math.min(maxFactor, Math.max(minFactor, factor)) * h;
    }

    if (this._cancelRequested) {
      this.emit('calculationCanceled');
    } else {
      this.emit('calculationCompleted', results);
    }
    return results;
  }

  private dormandPrinceStep(x: number, y: number[], h: number) {
    const c = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
    const a = [
      [],
      [1 / 5],
      [3 / 40, 9 / 40],
      [44 / 45, -56 / 15, 32 / 9],
      [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
      [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
      [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
    ];
    const b5 = a[6];
    const b4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

    const k: number[][] = Array(7)
      .fill(0)
      .map(() => Array(y.length).fill(0));
    for (let i = 0; i < 7; i++) {
      const xi = x + c[i] * h;
      const yi = y.map(
        (yi, j) => yi + k.slice(0, i).reduce((sum, ks, m) => sum + ks[j] * (a[i][m] || 0), 0) * h,
      );
      const scope: Record<string, number> = { x: xi };
      this.variables.forEach((v, j) => (scope[v] = yi[j]));
      k[i] = this.funcs.map((fn) => fn(scope));
    }
    const y5 = y.map((yi, j) => yi + h * b5.reduce((sum, bij, m) => sum + bij * k[m][j], 0));
    const y4 = y.map((yi, j) => yi + h * b4.reduce((sum, bij, m) => sum + bij * k[m][j], 0));
    return { k, y5, y4 };
  }

  private parseEquations() {
    const map: Record<string, { order: number; func: EvalFunction }> = {};
    for (const eq of this.rawEquations) {
      const [lhs, rhs] = eq.split('=');
      if (!rhs) throw new Error(`Invalid equation '${eq}'`);
      const m = lhs.trim().match(/([a-zA-Z]+)_(\d+)/);
      if (!m) throw new Error(`Bad var in '${lhs}'`);
      const base = m[1],
        ord = +m[2];
      const node = this.math.parse(rhs);
      const code = node.compile();
      map[base] = { order: ord, func: code };
    }

    this.variables = [];
    this.funcs = [];
    for (const base of Object.keys(map).sort()) {
      const { order } = map[base];
      for (let k = 0; k < order - 1; k++) {
        const varName = `${base}_${k}`;
        this.variables.push(varName);
        if (k < order) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.funcs.push((scope: any) => scope[`${base}_${k + 1}`]);
        }
      }
      const topVar = `${base}_${order - 1}`;
      this.variables.push(topVar);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.funcs.push((scope: any) => map[base].func.evaluate(scope));
    }
  }

  private checkReady() {
    if (!this.rawEquations.length) throw new Error('No equations set');
    if (
      this.range.start >= this.range.end ||
      this.range.start + this.range.initialStep >= this.range.end
    )
      throw new Error('Range incorrect');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: EventType, ...args: any[]) {
    const subs = this.subscribers.get(event);
    if (subs) {
      for (const cb of subs) cb(...args);
    }
  }
}
