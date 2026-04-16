import { createParser } from 'nuqs/server'

// Custom integer parser — avoids nuqs internal returnNaN bundling bug
export const parseAsInteger = createParser({
  parse: (v: string) => {
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  },
  serialize: (v: number) => String(v),
})
