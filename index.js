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
  fs:    fs,
  start: ['.'],
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
  this.opts   = extend({}, defaultOpts, opts)
  this.paused = false
  this.buffer = []
  var start = this.opts.start.map(function(name) {
    return path.resolve(process.cwd(), name)
  })
  var self = this
  var done = function() {
    console.log('closing')
    self.push(null)
  }
  this.pushLevel(/*prefix=*/'', /*entries=*/start, done)
}

util.inherits(FindStream, Readable)

/**
 * lstat every path in `names` (prefixed by `prefix`), and pass to
 * `tryPushEntry`. Call `done` after traversing every path.
 */
FindStream.prototype.pushLevel = function pushLevel(prefix, names, done) {
  if (names.length === 0) {
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
      self.tryPushEntry({path: fullPath, stats: stats}, bar)
    })
  })
}

/**
 * Buffer `entry` if the stream is paused, otherwise pass to `pushEntry`.
 * Call `done` after pushing.
 */
FindStream.prototype.tryPushEntry = function tryPushEntry(entry, done) {
  if (this.paused) {
    this.buffer.push({entry: entry, done: done})
  } else {
    this.pushEntry(entry, done)
  }
}

/**
 * Push entry downstream, and if it is a directory, call `pushLevel` on its
 * contents. Call `done` after traversing subtree.
 * @return mayContinue True if the downstream will accept more entries without
 * pausing.
 */
FindStream.prototype.pushEntry = function pushEntry(entry, done) {
  var self = this
  console.log('pushing', entry.path)
  this.paused = !this.push(entry) || this.paused
  if (entry.stats.isDirectory()) {
    this.opts.fs.readdir(entry.path, function(err, entries) {
      if (err) {
        self.emit('error', err)
      }
      self.pushLevel(entry.path, entries, done)
    })
  } else {
    done()
  }
  return !this.paused
}

FindStream.prototype._read = function _read(size) {
  this.paused = false
  while (size-- && this.buffer.length) {
    var front = buffer.shift()
    if (!this.pushEntry(front.entry, front.done)) {
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

