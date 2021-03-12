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

function check(desc, start, filter, options, expected) {
  test(desc, async () => {
    let actual = await toList(find(start, filter, options)).then((paths) =>
      paths.map((path) => path.toString('/'))
    )
    expect(actual).toEqual(expected)
  })
}

chdir('test')

describe('find', () => {
  check('should find everything by default', 'abc', always, {}, [
    'abc',
    'abc/a',
    'abc/a/a',
    'abc/a/a/b',
    'abc/a/a/bb',
    'abc/a/b',
    'abc/a/b/c',
  ])

  check('should stop at max depth', 'abc', always, { maxDepth: 1 }, [
    'abc',
    'abc/a',
  ])

  describe('name expression', () => {
    check('should match exactly', 'abc', name('b'), {}, [
      'abc/a/a/b',
      'abc/a/b',
    ])

    check('should match trailing glob', 'abc', name('b*'), {}, [
      'abc/a/a/b',
      'abc/a/a/bb',
      'abc/a/b',
    ])

    check('should match leading glob', 'abc', name('*b'), {}, [
      'abc/a/a/b',
      'abc/a/a/bb',
      'abc/a/b',
    ])

    check('should match directories', 'abc', name('a'), {}, [
      'abc/a',
      'abc/a/a',
    ])
  })

  describe('path expression', function () {
    check('should match exactly', 'abc', path('abc/a'), {}, ['abc/a'])
    check('should not match name', 'abc', path('a'), {}, [])
    check('should not match subpath', 'abc', path('a/a'), {}, [])
    check('should match trailing glob', 'abc', path('abc/a/b*'), {}, [
      'abc/a/b',
      'abc/a/b/c',
    ])
    check('should match leading glob', 'abc', path('*b/c'), {}, ['abc/a/b/c'])
  })

  describe('prune expression', function () {
    check('should stop descent', 'abc', prune(name('b')), {}, [
      'abc/a/a/b',
      'abc/a/b',
    ])

    check(
      'should stop descent even if match excluded',
      'abc',
      not(prune(name('b'))),
      {},
      ['abc', 'abc/a', 'abc/a/a', 'abc/a/a/bb']
    )
  })

  describe('type expression', function () {
    check('should match directories', 'abc', type('d'), {}, [
      'abc',
      'abc/a',
      'abc/a/a',
      'abc/a/b',
    ])
    check('should match files', 'abc', type('f'), {}, [
      'abc/a/a/b',
      'abc/a/a/bb',
      'abc/a/b/c',
    ])
  })
})
