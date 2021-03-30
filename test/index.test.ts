import { sep } from 'path'
import { chdir } from 'process'
import { find, always, name, path, type, not, prune } from '..'

function test1(desc, tree, expr, paths) {}

async function toList<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  let items = []
  for await (const item of iterator) {
    items.push(item)
  }
  return items
}

function check(desc, filter, options, expected) {
  test(desc, async () => {
    let actual = await toList(find(filter, options)).then((paths) =>
      paths.map((path) => path.toString('/'))
    )
    expect(actual).toEqual(expected)
  })
}

chdir('test/abc')

describe('find', () => {
  check('should find everything by default', always, {}, [
    '.',
    './a',
    './a/a',
    './a/a/b',
    './a/a/bb',
    './a/b',
    './a/b/c',
  ])

  check('should stop at max depth', always, { maxDepth: 1 }, ['.', './a'])

  describe('name expression', () => {
    check('should match exactly', name('b'), {}, ['./a/a/b', './a/b'])

    check('should match trailing glob', name('b*'), {}, [
      './a/a/b',
      './a/a/bb',
      './a/b',
    ])

    check('should match leading glob', name('*b'), {}, [
      './a/a/b',
      './a/a/bb',
      './a/b',
    ])

    check('should match directories', name('a'), {}, ['./a', './a/a'])
  })

  describe('path expression', function () {
    check('should match exactly', path('./a/b/c'), {}, ['./a/b/c'])

    check('should not match name', path('a'), {}, [])

    check('should not match subpath', path('a/a'), {}, [])

    check('should match trailing glob', path('./a/b*'), {}, [
      './a/b',
      './a/b/c',
    ])

    check('should match leading glob', path('*b/c'), {}, ['./a/b/c'])
  })

  describe('prune expression', function () {
    check('should stop descent', prune(name('b')), {}, ['./a/a/b', './a/b'])

    check(
      'should stop descent even if match excluded',
      not(prune(name('b'))),
      {},
      ['.', './a', './a/a', './a/a/bb']
    )
  })

  describe('type expression', function () {
    check('should match directories', type('d'), {}, [
      '.',
      './a',
      './a/a',
      './a/b',
    ])

    check('should match files', type('f'), {}, [
      './a/a/b',
      './a/a/bb',
      './a/b/c',
    ])

    check(
      'should match the start when it is a file',
      type('f'),
      { start: './a/b/c' },
      ['./a/b/c']
    )
  })
})
