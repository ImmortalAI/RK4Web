import { boolean } from 'mathjs';

export interface XYPoint {
  x: number;
  y: number;
}

export interface ChartDataProp {
  labels?: string[];
  datasets: Array<{
    label: string;
    data: XYPoint[];
    /** optional styling */
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
    tension?: number;
    yAxisID?: string;
  }>;
}

export interface ChartOptionsProp {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  stacked?: boolean;
  aspectRatio?: number;

  scales?: {
    [scaleName: string]: {
      type?: 'linear' | 'time' | 'category';
      display?: boolean;
      position?: 'bottom' | 'top' | 'left' | 'right';
      title?: {
        display?: boolean;
        text?: string;
      };
      ticks?: {
        color?: string;
      };
      grid?: {
        color?: string;
      };
      beginAtZero?: boolean;
    };
  };

  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
      labels?: {
        color?: string;
      };
    };
    title?: {
      display?: boolean;
      text?: string;
    };
    tooltip?: Record<string, unknown>;
  };
}
