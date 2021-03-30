import { find } from '..'
import { cwd, chdir } from 'process'

async function toList<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  let items = []
  for await (const item of iterator) {
    items.push(item)
  }
  return items
}

export function check(desc, filter, options, expected) {
  test(desc, async () => {
    let actual = await toList(find(filter, options)).then((paths) =>
      paths.map((path) => path.toString('/'))
    )
    expect(actual).toEqual(expected)
  })
}

const stack = []
export function pushd(path) {
  stack.push(cwd())
  chdir(path)
}

export function popd() {
  chdir(stack.pop())
}
