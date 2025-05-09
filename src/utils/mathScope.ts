import { parse } from 'mathjs'
import { convertLatexToAsciiMath } from 'mathlive'

/**
 * Extracts variables from a math expression and builds a scope object.
 * @param expr - Math expression (ASCII) to parse
 * @returns Object with variables as keys and default value of 0
 */
export function createScope(expr: string): Record<string, number> {
  const node = parse(expr)
  const vars = new Set<string>()

  node.traverse((n) => {
    if (n.type === 'SymbolNode') {
      vars.add(n.toString())
    }
  })

  const scope: Record<string, number> = {}
  for (const v of vars) {
    scope[v] = 0
  }

  return scope
}

/**
 * Extracts variables from a LaTeX expression and builds a scope object.
 * @param expr - LaTeX expression to parse
 * @returns Object with variables as keys and default value of 0
 */
export function createScopeTeX(expr: string): Record<string, number> {
  const asciiExpr = convertLatexToAsciiMath(expr)
  return createScope(asciiExpr)
}
