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
  insensitive: false,
  name:        undefined,
  path:        undefined,
  regex:       undefined,
  prune:       {},
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

/**
 * @param glob String Shell glob expression.
 * @param matchSep boolean True if wildcards should match the path component
 * separator (e.g. '/' on Unix).
 * @return regex
 */
function glob2regex(glob, matchSep) {
  var any = matchSep ? '.' : '[^/]'
  return glob
  .replace(/(\\)?\*/, function($0, $1) {
    return $1 ? $0 : (any + '*')
  })
  .replace(/(\\)?\?/, function($0, $1) {
    return $1 ? $0 : any
  })
}

function pathGlob2regex(glob) {
  return glob2regex(glob, true)
}

var alwaysMatch = function() { return true }
var neverMatch = function() { return false }

function compilePathMatch(opts) {
  var pats = []
  if (opts.name) {
    pats.push('^.*/(?:' + compilePathMatch1(opts.name, glob2regex) + ')$')
  }
  if (opts.path) {
    pats.push('^(?:' + compilePathMatch1(opts.path, pathGlob2regex) + ')$')
  }
  if (opts.regex) {
    pats.push(compilePathMatch1(opts.regex))
  if (!pats.length) {
    return
  }
  pats = new RegExp(pats.join('|'), opts.insensitive ? 'i' : '')
  return function(p) { return pats.test(p) }
}

function compilePathMatch1(pats, template) {
  if (!util.isArray(pats)) {
    pats = [pats]
  }
  if (template) {
    pats = pats.map(template)
  }
  return pats
  .map(function(pat) { return '(?:' + pat + ')' })
  .join('|')
}

var TEST_METHOD_NAME_FOR_TYPE = {
  b: 'isBlockDevice',
  c: 'isCharacterDevice',
  d: 'isDirectory',
  f: 'isFile',
  l: 'isSymbolicLink',
  p: 'isFIFO',
  s: 'isSocket',
}

function compileTypeMatch(opts) {
  if (!opts.type) {
    return alwaysMatch
  }
  var method = TEST_METHOD_NAME_FOR_TYPE[opts.type]
  return function(stats) {
    return stats[method]()
  }
}

function FindStream(opts) {
  Readable.call(this, {objectMode: true})
  this.opts      = extend({}, defaultOpts, opts)
  this.paused    = false
  this.buffer    = []
  this.pathMatch = compilePathMatch(this.opts) || alwaysMatch
  this.typeMatch = compileTypeMatch(this.opts)
  this.pruneMatch = compilePathMatch(this.opts.prune) || neverMatch

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
    if (self.pruneMatch(fullPath)) {
      bar()
      return
    }
    self.opts.fs.lstat(fullPath, function(err, stats) {
      if (err) {
        self.emit('error', err)
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
  if (this.pathMatch(value.path) && this.typeMatch(value.stats)) {
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

