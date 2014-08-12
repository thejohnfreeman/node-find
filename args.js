var util = require('util')

/**
 * @param glob String Shell glob expression.
 * @param matchSep boolean True if wildcards should match the path component
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

function pathGlob2regex(glob) {
  return glob2regex(glob, true)
}

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
  }
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
    return
  }
  var method = TEST_METHOD_NAME_FOR_TYPE[opts.type]
  return function(stats) {
    return stats[method]()
  }
}

exports.compilePathMatch = compilePathMatch
exports.compileTypeMatch = compileTypeMatch

