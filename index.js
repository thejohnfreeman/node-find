'use strict'

const compile = require('./compile')
const extend = require('extend')
const fs = require('graceful-fs') || require('fs')
const Path = require('path')
const Readable = require('readable-stream').Readable
const util = require('util')
const Vinyl = require('vinyl')

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

const customProps = ['ppbase', 'level', 'child', 'pppath']

/**
 * @property base String path where the search started.
 * @property ppbase String pretty-printed form of `base`, passed by the user.
 * @property path String path to the file.
 * @property level number the file's depth in the search tree.
 */
class File extends Vinyl {
  constructor (base, ppbase, path, level) {
    super({base: base, path: path})
    this.ppbase = ppbase
    this.level = level
  }

  child (fname) {
    const path = Path.join(this.path, fname)
    return new File(this.base, this.ppbase, path, this.level + 1)
  }

  pppath () {
    return this.path.replace(this.base, this.ppbase)
  }

  static isCustomProp (name) {
    return super.isCustomProp(name) && customProps.indexOf(name) < 0
  }
}

const defaultOpts = {
  fs: fs,
  paths: ['.'],
  maxDepth: Infinity,
  filter: function (stream, file) {
    stream.accept(file)
    stream.recurse(file)
  }
}

/**
 * @return barrier A function that calls `fn` in context `ctx` on its `n`th
 * invocation.
 */
function barrier (n, fn, ctx) {
  var i = 0
  return function () {
    if (++i === n) {
      fn.apply(ctx, arguments)
    }
  }
}

function FindStream (opts) {
  Readable.call(this, {objectMode: true})
  this.opts = extend({}, defaultOpts, opts)
  this.flowing = false
  this.buffer = []

  if (this.opts.expr) {
    this.opts.filter = compile(this.opts.expr)
  }

  const files = this.opts.paths.map(function (ppbase) {
    const path = Path.resolve(process.cwd(), ppbase)
    return new File(path, ppbase, path, /* level= */0)
  })
  const self = this
  const done = function () {
    self.push(null)
  }
  this.enqueue(files, done)
}

util.inherits(FindStream, Readable)

/**
 * lstat every file in `files`, and append to the buffer. Wait until next
 * call to `_read` before pushing any files downstream. Call `done` after
 * traversing every path.
 * @private
 */
FindStream.prototype.enqueue = function enqueue (files, done) {
  if (!files.length) {
    return done()
  }

  // Done only after all subpaths are done.
  const bar = barrier(files.length, done)

  const self = this
  files.forEach(function (file) {
    self.opts.fs.lstat(file.path, function (err, stats) {
      if (err) {
        self.emit('error', err)
      }

      file.recurse = true
      file.stats = stats
      file.done = bar
      self.buffer.push(file)

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
FindStream.prototype._read = function _read (size) {
  this.flowing = true
  while (size-- && this.buffer.length) {
    this.opts.filter(this, this.buffer.shift())
  }
}

/**
 * Push file downstream. Called from filter function after `file` was popped
 * from buffer, so this function should not touch the buffer.
 */
FindStream.prototype.accept = function accept (file) {
  this.flowing = this.push(file)
}

/**
 * Continue recursive search, unless directory is marked do-not-recurse.
 */
FindStream.prototype.recurse = function recurse (file) {
  if (!file.recurse ||
      file.level >= this.opts.maxDepth ||
      !file.stats.isDirectory()) {
    return file.done()
  }

  const self = this
  this.opts.fs.readdir(file.path, function (err, fnames) {
    if (err) {
      self.emit('error', err)
    }
    const files = fnames.map(file.child.bind(file))
    self.enqueue(files, file.done)
  })
}

function find (opts) {
  if (typeof opts === 'undefined') {
    opts = {paths: ['.']}
  } else if (typeof opts === 'string') {
    opts = {paths: [opts]}
  } else if (Array.isArray(opts)) {
    opts = {paths: Array.prototype.slice.call(opts)}
  }
  return new FindStream(opts)
}

module.exports = find

