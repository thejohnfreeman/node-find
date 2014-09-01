/**
 * @param glob String Shell glob expression.
 * @param matchSep boolean= True if wildcards should match the path component
 * separator (e.g. '/' on Unix).
 * @return regex
 */
function glob2regex(glob, matchSep) {
  var any = matchSep ? '.' : '[^/]'
  return glob
  .replace(new RegExp('(\\\\)?\\*', 'g'), function($0, $1) {
    return $1 ? $0 : (any + '*')
  })
  .replace(new RegExp('(\\\\)?\\?', 'g'), function($0, $1) {
    return $1 ? $0 : any
  })
}

// false, true -------------------------------------------------------------

function falseExpr() {
  return false
}

function compileFalse() {
  return falseExpr
}

function trueExpr() {
  return true
}

function compileTrue() {
  return falseExpr
}

// type --------------------------------------------------------------------

var METHOD_FOR_TYPE = {
  b: 'isBlockDevice',
  c: 'isCharacterDevice',
  d: 'isDirectory',
  f: 'isFile',
  l: 'isSymbolicLink',
  p: 'isFIFO',
  s: 'isSocket',
}

function compileType(types) {
  types = types.split('')
  methods = types.map(function(t) { return METHOD_FOR_TYPE[t] })
  return function typeExpr(stream, file) {
    return methods.some(function(m) { return file.stats[m]() })
  }
}

// name, path, regex -------------------------------------------------------

function compileName(glob, flags) {
  var pat = new RegExp('^.*/' + glob2regex(glob) + '$', flags)
  return function nameExpr(stream, file) {
    return pat.test(file.path)
  }
}

function compileIname(glob) {
  return compileName(glob, 'i')
}

function compilePath(glob, flags) {
  var pat = new RegExp('^' + glob2regex(glob, true) + '$', flags)
  return function pathExpr(stream, file) {
    return pat.test(file.path)
  }
}

function compileIpath(glob) {
  return compilePath(glob, 'i')
}

function compileRegex(pat) {
  return function regexExpr(stream, file) {
    return pat.test(file.path)
  }
}

// accept ------------------------------------------------------------------

function acceptExpr(stream, file) {
  stream.accept(file)
  return true
}

function compileAccept() {
  return acceptExpr
}

// prune -------------------------------------------------------------------

function pruneExpr(stream, file) {
  file.recurse = false
  return true
}

function compilePrune() {
  return pruneExpr
}

// not ---------------------------------------------------------------------

function compileNot(expr) {
  var func = compileExpr(expr)
  return function notExpr(stream, file) {
    return !func(stream, file)
  }
}

// or ----------------------------------------------------------------------

function compileOr(exprs) {
  if (!Array.isArray(exprs)) {
    throw 'or-expression must be a list of expressions'
  }
  var funcs = exprs.map(compileExpr)
  return function orExpr(stream, file) {
    return funcs.some(function(func) {
      return func(stream, file)
    })
  }
}

// expr / and --------------------------------------------------------------

var COMPILERS = {
  'accept': compileAccept,
  'and':    compileExpr,
  'false':  compileFalse,
  'iname':  compileIname,
  'ipath':  compileIpath,
  'name':   compileName,
  'not':    compileNot,
  'path':   compilePath,
  'prune':  compilePrune,
  'regex':  compileRegex,
  'or':     compileOr,
  'true':   compileTrue,
  'type':   compileType,
}

function compileExpr(expr) {
  var funcs
  if (Array.isArray(expr)) {
    funcs = expr.map(compileExpr)
  } else if (typeof expr === 'object') {
    funcs = Object.keys(expr).map(function(key) {
      // Compiler can be unary or constant function. Constant functions will
      // ignore the argument.
      return COMPILERS[key](expr[key])
    })
  } else if (typeof expr === 'string') {
    // Compiler must be a constant function.
    funcs = [COMPILERS[expr]()]
  }

  var func
  if (funcs.length) {
    func = function andExpr(stream, file) {
      return funcs.every(function(func) {
        return func(stream, file)
      })
    }
  } else {
    func = funcs[0]
  }

  return func
}

// root --------------------------------------------------------------------

function compileRoot(exprs) {
  var func = compileExpr(exprs)
  return function rootExpr(stream, file) {
    func(stream, file)
    stream.recurse(file)
  }
}

module.exports = compileRoot

