function File (type) {
  this.type = type
}

File.prototype.isFile = function isFile () {
  return this.type === 'f'
}

File.prototype.isDirectory = function isDirectory () {
  return this.type === 'd'
}

function Fs (tree) {
  this.tree = tree
}

Fs.prototype.find = function find (path) {
  var steps = path.split('/')
  if (steps[0] !== '') {
    throw new Error('relative path in test: ' + path)
  }
  var file = this.tree
  for (var i = 1; i < steps.length; ++i) {
    var step = steps[i]
    if (step === '') {
      continue
    }
    file = file[step]
    if (typeof file === 'undefined') {
      throw new Error('file does not exist: ' + path)
    }
  }
  return file
}

Fs.prototype.lstat = function lstat (path, done) {
  var file = this.find(path)
  file = (typeof file === 'object') ? new File('d') : new File('f')
  done(null, file)
}

Fs.prototype.readdir = function readdir (path, done) {
  var dir = this.find(path)
  var files = Object.getOwnPropertyNames(dir)
  done(null, files)
}

module.exports = Fs

