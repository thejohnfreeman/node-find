var find     = require('..')
var Fs       = require('./fs')
var should   = require('should')
var through2 = require('through2')
var terminus = require('terminus')

function expectCount(n, done) {
  return terminus.concat({objectMode: true}, function(files) {
    files.length.should.equal(n)
    done()
  })
}

describe('find', function() {
  var fs = new Fs({
    entries: {
      a: {
        entries: {
          x1: {},
          x2: {},
        }
      },
      b: {
        entries: {
          m: {},
          n: {},
        }
      }
    }
  })

  it('should find everything by default', function(done) {
    find({paths: ['/'], fs: fs})
    .pipe(expectCount(7, done))
  })

  describe('name expression', function() {
    it('should match exactly', function(done) {
      find({paths: ['/'], fs: fs, expr: [{'name': 'x1'}, 'accept']})
      .pipe(expectCount(1, done))
    })

    it('should match trailing glob', function(done) {
      find({paths: ['/'], fs: fs, expr: [{'name': 'x*'}, 'accept']})
      .pipe(expectCount(2, done))
    })

    it('should match leading glob', function(done) {
      find({paths: ['/'], fs: fs, expr: [{'name': '*1'}, 'accept']})
      .pipe(expectCount(1, done))
    })
  })

})

