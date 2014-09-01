var find     = require('..')
var Fs       = require('./fs')
var should   = require('should')
var through2 = require('through2')
var terminus = require('terminus')

function test(desc, tree, expr, count) {
  it(desc, function(done) {
    find({paths: ['/'], fs: new Fs(tree), expr: expr})
    .pipe(terminus.concat({objectMode: true}, function(files) {
      files.length.should.equal(count)
      done()
    }))
  })
}

describe('find', function() {

  test('should find everything by default',
       {}, ['accept'], 1)

  describe('name expression', function() {
    test('should match exactly',
         {'a': 0, 'aa': 0, 'b': 0},
         [{'name': 'a'}, 'accept'], 1)
    test('should match trailing glob',
         {'a': 0, 'aa': 0, 'b': 0},
         [{'name': 'a*'}, 'accept'], 2)
    test('should match case-sensitively',
         {'a': 0, 'A': 0},
         [{'name': 'a'}, 'accept'], 1)
    test('should match case-insensitively against lowercase',
         {'a': 0, 'A': 0},
         [{'iname': 'a'}, 'accept'], 2)
    test('should match case-insensitively against uppercase',
         {'a': 0, 'A': 0},
         [{'iname': 'A'}, 'accept'], 2)
    test('should match leading glob',
         {'a': 0, 'aa': 0, 'b': 0},
         [{'name': '*a'}, 'accept'], 2)
  })

})

