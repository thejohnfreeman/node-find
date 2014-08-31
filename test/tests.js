var find     = require('..')
var Fs       = require('./fs')
var should   = require('should')
var through2 = require('through2')
var terminus = require('terminus')

describe('find', function() {
  var fs = new Fs({
    entries: {
      a: {
        entries: {
          x: {},
          y: {},
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
    .pipe(terminus.concat({objectMode: true}, function(files) {
      files.length.should.equal(7)
      done()
    }))
  })
})

