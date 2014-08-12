var extend   = require('extend')
var fs       = require('graceful-fs') || require('fs')
var path     = require('path')
var Readable = require('readable-stream').Readable
var util     = require('util')
var through  = require('through2')
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
  start:       ['.'],
  maxDepth:    Number.MAX_VALUE,
  filter:      function() { return true },
  prune:       function() { return false },
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
  this.paused    = false
  this.buffer    = []

  var start = this.opts.start.map(function(name) {
    return path.resolve(process.cwd(), name)
  })
  var self = this
  var done = function() {
    self.push(null)
  }
  this.pushLevel(/*level=*/0, /*prefix=*/'', /*entries=*/start, done)
}

util.inherits(FindStream, Readable)

/**
 * lstat every path in `names` (prefixed by `prefix`), and pass to
 * `tryPushEntry`. Call `done` after traversing every path.
 */
FindStream.prototype.pushLevel = function pushLevel(level, prefix, names, done) {
  if (level > this.opts.maxDepth || !names.length) {
    done()
    return
  }

  var self = this
  var bar = barrier(names.length, done)
  names.forEach(function(name) {
    var fullPath = path.join(prefix, name)
    self.opts.fs.lstat(fullPath, function(err, stats) {
      if (err) {
        self.emit('error', err)
      }
      if (self.opts.prune(fullPath, stats)) {
        bar()
        return
      }
      self.tryPushEntry({
        value: {path: fullPath, stats: stats},
        done: bar,
        level: level,
      })
    })
  })
}

/**
 * Buffer `entry` if the stream is paused, otherwise pass to `pushEntry`.
 * Call `done` after pushing.
 */
FindStream.prototype.tryPushEntry = function tryPushEntry(entry) {
  if (this.paused) {
    this.buffer.push(entry)
  } else {
    this.pushEntry(entry)
  }
}

/**
 * Push entry downstream, and if it is a directory, call `pushLevel` on its
 * contents. Call `done` after traversing subtree.
 * @return mayContinue True if the downstream will accept more entries without
 * pausing.
 */
FindStream.prototype.pushEntry = function pushEntry(entry) {
  var self = this
  var value = entry.value
  if (this.opts.filter(value.path, value.stats)) {
    this.paused = !this.push(value) || this.paused
  }
  if (value.stats.isDirectory()) {
    this.opts.fs.readdir(value.path, function(err, entries) {
      if (err) {
        self.emit('error', err)
      }
      self.pushLevel(entry.level + 1, value.path, entries, entry.done)
    })
  } else {
    entry.done()
  }
  return !this.paused
}

FindStream.prototype._read = function _read(size) {
  this.paused = false
  while (size-- && this.buffer.length) {
    if (!this.pushEntry(buffer.shift())) {
      return
    }
  }
}

function find(opts) {
  return new FindStream(opts)
  .pipe(through.obj(function(entry, enc, cb) {
    cb(null, new Vinyl({path: entry.path}))
  }))
}

module.exports = find

