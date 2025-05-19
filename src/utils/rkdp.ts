import { create, all } from 'mathjs';
import type { MathJsInstance, EvalFunction } from 'mathjs';
import { TypedEventEmitter } from '@/utils/typedEventEmitter';

type EquationInput = string; // ASCII math expression

type EventMap = {
  equationsUpdated: string[];
  initialConditionsChanged: Record<string, number>;
  rangeChanged: Range;
  toleranceChanged: { atol: number; rtol: number };
  calculationStarted: Range;
  calculationProgress: { x: number; step: number; error: number };
  calculationCanceled: void;
  calculationCompleted: SolutionPoint[];
};

export interface Range {
  start: number;
  end: number;
  initialStep: number;
}

export interface SolutionPoint {
  [varName: string]: number;
}

export class DormandPrinceSolver extends TypedEventEmitter<EventMap> {
  private _math: MathJsInstance;
  private _rawEquations: EquationInput[] = [];
  private _functions: EvalFunction[] = [];
  private _variables: string[] = [];
  private _initialConditions: Record<string, number> = {};
  private _variableRangeName: string = 'x';
  private _range: Range = { start: 0, end: 1, initialStep: 0.1 };
  private _absoluteTolerance: number = 1e-10;
  private _relativeTolerance: number = 1e-6;
  private _minFactor: number = 0.1;
  private _maxFactor: number = 5;
  private _safetyFactor: number = 0.9;
  private _minStep: number | null = null;
  private _maxStep: number | null = null;
  private _cancelRequested = false;

  constructor() {
    super();
    this._math = create(all);
  }

  addEquations(eqs: EquationInput[]) {
    this._rawEquations = eqs;
    this.parseEquations();
    this.emit('equationsUpdated', this._variables.slice());
  }

  setInitialConditions(conds: Record<string, number>) {
    for (const v of Object.keys(conds)) {
      if (!this._variables.includes(v)) {
        throw new Error(`Unknown variable '${v}'.`);
      }
    }
    this._initialConditions = { ...conds };
    this.emit('initialConditionsChanged', this._initialConditions);
  }

  getVariableNames(): string[] {
    return this._variables.slice();
  }

  setRange(variableName: string, start: number, end: number, initialStep: number) {
    if (end <= start) throw new Error('End must be > start');

    this._variableRangeName = variableName;
    this._range = { start, end, initialStep };
    this.emit('rangeChanged', this._range);
  }

  setTolerance(atol: number, rtol: number) {
    this._absoluteTolerance = atol;
    this._relativeTolerance = rtol;
    this.emit('toleranceChanged', { atol, rtol });
  }

  setStepLimits(min: number | null, max: number | null) {
    this._minStep = min;
    this._maxStep = max;
  }

  setFactors(min: number, max: number) {
    this._minFactor = min;
    this._maxFactor = max;
  }

  setSafety(safetyFactor: number) {
    this._safetyFactor = safetyFactor;
  }

  cancel() {
    this._cancelRequested = true;
    this.emit('calculationCanceled', undefined);
  }

  async calculate(useAdaptive: boolean): Promise<SolutionPoint[]> {
    this.checkReady();
    this._cancelRequested = false;

    const { start, end, initialStep } = this._range;

    let x = start;
    let y = this._variables.map((v) => {
      if (this._initialConditions[v] === undefined) throw new Error(`Missing IC for ${v}`);
      return this._initialConditions[v];
    });

    const initialPoint: SolutionPoint = { [this._variableRangeName]: x };
    this._variables.forEach((v, i) => {
      if (!v.includes('_')) {
        initialPoint[v] = y[i];
      }
    });
    const results: SolutionPoint[] = [initialPoint];
    this.emit('calculationStarted', this._range);

    let h = initialStep;
    const minH = this._minStep ?? 1e-10;
    const maxH = this._maxStep ?? (end - start) * 0.1;

    while (x < end) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (this._cancelRequested) break;
      if (x + h > end) h = end - x;

      const { y5, y4 } = this.dormandPrinceStep(x, y, h);

      if (useAdaptive) {
        const tol = y5.map(
          (yi5, i) =>
            this._absoluteTolerance +
            this._relativeTolerance * Math.max(Math.abs(y[i]), Math.abs(yi5)),
        );
        const err_all = y5.map((yi5, i) => Math.abs(yi5 - y4[i]));
        // Use L2 norm (Euclidean distance)
        const err = Math.sqrt(
          err_all.reduce((sum, err_i, i) => sum + (err_i / tol[i]) ** 2, 0) / y.length,
        );

        if (err <= 1) {
          x += h;
          y = y5;
          const point: SolutionPoint = { [this._variableRangeName]: x };
          this._variables.forEach((v, i) => {
            if (!v.includes('_')) {
              point[v] = y[i];
            }
          });

          results.push(point);
          this.emit('calculationProgress', { x, step: h, error: err });
        } else {
          console.warn("Error is too big: ", err);
        }

        const rawFactor = err === 0 ? this._maxFactor : this._safetyFactor * (1 / err) ** 0.2;
        const factor = Math.min(this._maxFactor, Math.max(this._minFactor, rawFactor));

        h = h * factor;
        h = Math.max(minH, Math.min(h, maxH));
      } else {
        const err = Math.max(...y5.map((yi5, i) => Math.abs(yi5 - y4[i])));
        x += h;
        y = y5;
        const point: SolutionPoint = { [this._variableRangeName]: x };
        this._variables.forEach((v, i) => {
          if (!v.includes('_')) {
            point[v] = y[i];
          }
        });

        results.push(point);
        this.emit('calculationProgress', { x, step: h, error: err });
      }
    }

    if (this._cancelRequested) {
      this.emit('calculationCanceled', undefined);
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
      const scope: Record<string, number> = { [this._variableRangeName]: xi };
      this._variables.forEach((v, j) => (scope[v] = yi[j]));
      k[i] = this._functions.map((fn) => fn.evaluate(scope));
    }
    const y5 = y.map((yi, j) => yi + h * b5.reduce((sum, bij, m) => sum + bij * k[m][j], 0));
    const y4 = y.map((yi, j) => yi + h * b4.reduce((sum, bij, m) => sum + bij * k[m][j], 0));
    return { k, y5, y4 };
  }

  private parseEquations() {
    this._variables = [];
    this._functions = [];
    for (const eq of this._rawEquations) {
      let [lhs, rhs] = eq.split('=');
      if (!rhs) throw new Error(`Invalid equation '${eq}'`);
      lhs = lhs.trim().replace(/\^′/g, '^(′)').replace(/\^″/g, '^(′′)');
      rhs = rhs
        .replace(/\^′/g, '^(′)')
        .replace(/\^″/g, '^(′′)')
        .replace(/\^\((′+)\)/g, (match, quotes) => {
          return `_${quotes.length}`;
        });

      const m = lhs.match(/^([a-zA-Z])\^\((′+)\)$/);
      if (!m) throw new Error(`Bad var in '${lhs}'`);
      const base = m[1],
        ord = m[2].length;
      const node = this._math.parse(rhs);
      const code = node.compile();

      for (let k = 0; k < ord - 1; k++) {
        const varName = k === 0 ? base : `${base}_${k}`;
        this._variables.push(varName);
        this._functions.push(this._math.parse(`${base}_${k + 1}`).compile());
      }
      const topVar = ord === 1 ? base : `${base}_${ord - 1}`;
      this._variables.push(topVar);
      this._functions.push(code);
    }
  }

  private checkReady() {
    if (!this._rawEquations.length) throw new Error('No equations set');
    if (
      this._range.start >= this._range.end ||
      this._range.start + this._range.initialStep >= this._range.end
    )
      throw new Error('Range incorrect');
  }
}
