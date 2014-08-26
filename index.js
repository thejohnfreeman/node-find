var compile  = require('./compile')
var extend   = require('extend')
var fs       = require('graceful-fs') || require('fs')
var Path     = require('path')
var Readable = require('readable-stream').Readable
var util     = require('util')
var Vinyl    = require('vinyl')

/* A Stream can be turned into an EventEmitter, but not vice versa, because
 * EventEmitters have no sense of "backpressure", i.e. blocking when their
 * outgoing queue is full. I did not see any Stream-based directory walkers
 * that respond to pruning branches of the directory tree, so I am
 * implementing my own recursive walk.
 *
 * node-walk
 * : EventEmitter, not Stream
 * : cannot prune branches
 * node-findit
 * : EventEmitter, not Stream
 * node-glob
 * : EventEmitter, not Stream
 * : cannot prune branches
 * node-stream
 * : does not respond to backpressure
 * : cannot prune branches
 */

var defaultOpts = {
  fs:          fs,
  paths:       ['.'],
  maxDepth:    Infinity,
  filter:      function(stream, file) {
    stream.accept(file)
    stream.recurse(file)
  },
}

/**
 * @return barrier A function that calls `fn` in context `ctx` on its `n`th
 * invocation.
 */
function barrier(n, fn, ctx) {
  var i = 0
  return function() {
    if (++i === n) {
      fn.apply(ctx, arguments)
    }
  }
}

function FindStream(opts) {
  Readable.call(this, {objectMode: true})
  this.opts      = extend({}, defaultOpts, opts)
  this.flowing   = false
  this.buffer    = []

  if (this.opts.expr) {
    this.opts.filter = compile(this.opts.expr)
  }

  var paths = this.opts.paths.map(function(name) {
    return Path.resolve(process.cwd(), name)
  })
  var self = this
  var done = function() {
    self.push(null)
  }
  this.enqueue(/*level=*/0, /*prefix=*/'', /*paths=*/paths, done)
}

util.inherits(FindStream, Readable)

/**
 * Do nothing if `level` greater than maximum allowed depth. Otherwise,
 * lstat every path in `paths` (prefixed by `prefix`), and append to the
 * buffer. Wait until next call to `_read` before pushing any files
 * downstream. Call `done` after traversing every path.
 * @private
 */
FindStream.prototype.enqueue = function enqueue(level, prefix, paths, done) {
  if (!paths.length) {
    return done()
  }

  var self = this
  var bar = barrier(paths.length, done)
  paths.forEach(function(path) {
    path = Path.join(prefix, path)
    self.opts.fs.lstat(path, function(err, stats) {
      if (err) {
        self.emit('error', err)
      }
      self.buffer.push({
        path: path,
        recurse: true,
        stats: stats,
        done: bar,
        level: level,
      })
      if (self.flowing) {
        self._read(self.buffer.length)
      }
    })
  })
}

/**
 * Resume flowing unconditionally.
 * @private
 */
FindStream.prototype._read = function _read(size) {
  this.flowing = true
  while (size-- && this.buffer.length) {
    this.opts.filter(this, this.buffer.shift())
  }
}

/**
 * Push file downstream. Called from filter function after `file` was popped
 * from buffer, so this function should not touch the buffer.
 */
FindStream.prototype.accept = function accept(file) {
  this.flowing = this.push(new Vinyl({path: file.path}))
}

/**
 * Continue recursive search, unless directory is marked do-not-recurse.
 */
FindStream.prototype.recurse = function recurse(file) {
  if (!file.recurse
      || file.level >= this.opts.maxDepth
      || !file.stats.isDirectory())
  {
    return file.done()
  }

  var self = this
  this.opts.fs.readdir(file.path, function(err, files) {
    if (err) {
      self.emit('error', err)
    }
    self.enqueue(file.level + 1, file.path, files, file.done)
  })
}

function find(opts) {
  if (typeof opts === 'string') {
    opts = {paths: Array.prototype.slice.call(opts)}
  }
  return new FindStream(opts)
}

module.exports = find

