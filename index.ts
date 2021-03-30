import { readdir, stat } from 'fs/promises'
import { sep as _sep } from 'path'

function regexEscape(pattern: string) {
  // :( https://github.com/tc39/proposal-regex-escaping/issues/37
  return pattern.replace(/\\/g, '\\\\')
}

/**
 * @param glob string Shell glob expression.
 * @param matchSep boolean Whether wildcards should match the path component
 * separator (e.g. '/' on Unix).
 * @return regex
 */
function glob2regex(glob: string, matchSep: boolean = false): RegExp {
  // It seems most (all?) popular glob libraries forbid backslashes as path
  // separators in globs. Trying to figure out when a backslash is escaping
  // versus separating is a nightmare. Like them, we presume that every
  // unescaped forward slash is a path separator.
  const sep = regexEscape(_sep)
  const any = matchSep ? '.' : `[^${sep}]`
  const pattern = glob
    .replace(/(?<!\\)\//g, sep)
    .replace(/(?<!\\)\*/g, any + '*')
    .replace(/(?<!\\)\?/g, any)
  return new RegExp(`^${pattern}$`)
}

type Decision = { include: boolean; ascend?: boolean }
type Filter = (path: Path) => Promise<Decision>

export const always = async () => ({ include: true })
export const never = async () => ({ include: false })

export const name = (glob: string) => async (path: Path) => ({
  include: glob2regex(glob).test(path.name),
})

export const path = (glob: string) => async (path: Path) => ({
  include: glob2regex(glob, true).test(path.toString()),
})

export const regex = (pattern: string | RegExp) => {
  const r = new RegExp(pattern)
  return async (path: Path) => ({
    include: r.test(path.toString()),
  })
}

/** A map associating characters, chosen by GNU find, to file types. */
var METHOD_FOR_TYPE = {
  b: 'isBlockDevice',
  c: 'isCharacterDevice',
  d: 'isDirectory',
  f: 'isFile',
  l: 'isSymbolicLink',
  p: 'isFIFO',
  s: 'isSocket',
}

export const type = (c: string) => {
  console.assert(METHOD_FOR_TYPE.hasOwnProperty(c))
  return async (path: Path) => ({
    include: (await path.stat())[METHOD_FOR_TYPE[c]](),
  })
}

export const prune = (filter: Filter) => async (path: Path) => {
  const { include } = await filter(path)
  return { include, ascend: include }
}

export const not = (filter: Filter) => async (path: Path) => {
  const { include, ascend } = await filter(path)
  return { include: !include, ascend }
}

export const or = (...filters: Filter[]) => async (path: Path) => {
  for (const filter of filters) {
    const decision = await filter(path)
    if (decision.include) {
      return decision
    }
  }
  return { include: false }
}

export const and = (...filters: Filter[]) => async (path: Path) => {
  let ascend = false
  for (const filter of filters) {
    const decision = await filter(path)
    if (!decision.include) {
      return { include: false, ascend }
    }
    // Only read ascend from decisions that include.
    ascend ||= decision.ascend
  }
  return { include: true, ascend }
}

export class Path {
  private status = null

  public constructor(public steps: string[] = []) {}

  public get depth(): number {
    return this.steps.length
  }

  public get parent(): Path {
    return new Path(this.steps.slice(0, -1))
  }

  public get name(): string {
    return this.steps[this.steps.length - 1]
  }

  public child(step: string): Path {
    return new Path([...this.steps, step])
  }

  public toString(sep: string = _sep): string {
    return this.steps.join(sep)
  }

  public async stat() {
    if (!this.status) {
      this.status = await stat(this.toString())
    }
    return this.status
  }

  public async isDirectory(): Promise<boolean> {
    return (await this.stat()).isDirectory()
  }

  public async list(): Promise<Path[]> {
    return (await readdir(this.toString())).map((child) => this.child(child))
  }
}

export async function* find(
  filter: Filter = always,
  { start = '.', maxDepth }: { start?: string; maxDepth?: number } = {}
) {
  const prefix = start.split(_sep)
  const stack = [[prefix.pop()]]
  do {
    let top = stack.pop()
    while (top.length > 0) {
      const step = top.shift()
      const path = new Path([...prefix, step])
      const { include, ascend } = await filter(path)
      if (include) {
        yield path
      }
      if (
        !ascend &&
        /* `== null` matches `undefined` too. */
        (maxDepth == null || maxDepth > prefix.length) &&
        (await path.isDirectory())
      ) {
        prefix.push(step)
        stack.push(top)
        top = await readdir(path.toString())
      }
    }
    prefix.pop()
  } while (stack.length > 0)
}
