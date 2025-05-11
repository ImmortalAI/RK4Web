export interface XYPoint {
  x: number
  y: number
}

export interface ChartDataProp {
  datasets: Array<{
    label: string
    data: XYPoint[]
    /** optional styling */
    backgroundColor?: string
    borderColor?: string
    fill?: boolean
    tension?: number
  }>
}

export interface ChartOptionsProp {
  responsive?: boolean
  maintainAspectRatio?: boolean

  scales?: {
    x?: {
      type?: "linear" | "time" | "category"
      position?: "bottom" | "top"
      title?: {
        display?: boolean
        text?: string
      }
    }
    y?: {
      beginAtZero?: boolean
      title?: {
        display?: boolean
        text?: string
      }
    }
  }

  plugins?: {
    legend?: {
      display?: boolean
      position?: "top" | "bottom" | "left" | "right"
    }
    title?: {
      display?: boolean
      text?: string
    }
    tooltip?: Record<string, unknown>
  }
}
