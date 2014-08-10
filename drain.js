var util     = require('util')
var Writable = require('readable-stream').Writable

function Drain(opts) {
  Writable.call(this, opts)
}

util.inherits(Drain, Writable)

Drain.prototype._write = function _write(_, enc, next) {
  next()
}

Drain.strs = new Drain()
Drain.objs = new Drain({objectMode: true})

module.exports = Drain

