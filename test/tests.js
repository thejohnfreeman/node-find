/* eslint-env mocha */

var find = require('..')
var FileSystem = require('./fs')
require('should')
var terminus = require('terminus')

function testWith (desc, opts, paths) {
  it(desc, function (done) {
    find(opts)
    .pipe(terminus.concat({objectMode: true}, function (files) {
      files.length.should.equal(paths.length)
      files.forEach(function (file) {
        paths.should.containEql(file.path)
      })
      done()
    }))
  })
}

function test (desc, tree, expr, paths) {
  testWith(desc,
             /* opts= */{paths: ['/'], fs: new FileSystem(tree), expr: expr},
             paths)
}

describe('find', function () {
  test('should find everything by default',
       {}, ['accept'], ['/'])

  testWith('should stop at max depth',
           {paths: ['/'], fs: new FileSystem({'x': {'y': 0}}), maxDepth: 1},
           ['/', '/x'])

  describe('name expression', function () {
    test('should match exactly',
         {'a': 0, 'aa': 0, 'b': 0},
         [{'name': 'a'}, 'accept'],
         ['/a'])
    test('should match trailing glob',
         {'a': 0, 'aa': 0, 'b': 0},
         [{'name': 'a*'}, 'accept'],
         ['/a', '/aa'])
    test('should match leading glob',
         {'a': 0, 'aa': 0, 'b': 0},
         [{'name': '*a'}, 'accept'],
         ['/a', '/aa'])
    test('should match case-sensitively',
         {'a': 0, 'A': 0},
         [{'name': 'a'}, 'accept'],
         ['/a'])
    test('should match case-insensitively against lowercase',
         {'a': 0, 'A': 0},
         [{'iname': 'a'}, 'accept'],
         ['/a', '/A'])
    test('should match case-insensitively against uppercase',
         {'a': 0, 'A': 0},
         [{'iname': 'A'}, 'accept'],
         ['/a', '/A'])
    test('should match directories',
         {'x': {'x': 0}},
         [{'name': 'x'}, 'accept'],
         ['/x', '/x/x'])
  })

  describe('path expression', function () {
    test('should match exactly',
         {'x': {'a': 0}},
         [{'path': '/x/a'}, 'accept'],
         ['/x/a'])
    test('should not match name',
         {'x': {'a': 0}},
         [{'path': 'a'}, 'accept'],
         [])
    test('should not match subpath',
         {'x': {'a': 0}},
         [{'path': 'x/a'}, 'accept'],
         [])
    test('should match trailing glob',
         {'x': {'a': 0}},
         [{'path': '/x*'}, 'accept'],
         ['/x', '/x/a'])
    test('should match leading glob',
         {'x': {'a': 0}},
         [{'path': '*a'}, 'accept'],
         ['/x/a'])
    test('should match case-sensitively',
         {'x': {'a': 0}, 'X': {'A': 0}},
         [{'path': '/x*'}, 'accept'],
         ['/x', '/x/a'])
    test('should match case-insensitively against lowercase',
         {'x': {'a': 0}, 'X': {'A': 0}},
         [{'ipath': '/x*'}, 'accept'],
         ['/x', '/x/a', '/X', '/X/A'])
    test('should match case-insensitively against uppercase',
         {'x': {'a': 0}, 'X': {'A': 0}},
         [{'ipath': '/X*'}, 'accept'],
         ['/x', '/x/a', '/X', '/X/A'])
  })

  describe('prune expression', function () {
    test('should remove matches',
         {'x': {'x': 0}},
         [{'name': 'x'}, 'prune', 'accept'],
         ['/x'])
    test('should not implicitly accept',
         {'x': {'a': 0}, 'y': {'b': 0}},
      {'or': [
           [{'name': 'x'}, 'prune'],
        'accept'
      ]},
         ['/', '/y', '/y/b'])
  })

  describe('type expression', function () {
    test('should match directories',
         {'x': 0},
         [{'type': 'd'}, 'accept'],
         ['/'])
    test('should match files',
         {'x': 0},
         [{'type': 'f'}, 'accept'],
         ['/x'])
  })
})

