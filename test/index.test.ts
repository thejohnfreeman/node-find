import { sep } from 'path'
import { chdir } from 'process'
import { always, name, path, type, not, and, prune } from '..'
import { check, pushd, popd } from './common'

describe('find abc', () => {
  beforeAll(() => pushd('test/abc'))
  afterAll(() => popd())

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

describe('find names', () => {
  beforeAll(() => pushd('test/names'))
  afterAll(() => popd())

  check('should match extension', name('*.z'), {}, ['./x.y.z'])
  check('should match type: file', type('f'), {}, ['./x.y.z'])
  check('should match extension and type', and(name('*.z'), type('f')), {}, [
    './x.y.z',
  ])
  check(
    'should match extension and type at start',
    and(name('*.z'), type('f')),
    { start: './x.y.z' },
    ['./x.y.z']
  )
})
