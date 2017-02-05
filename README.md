# node-find

An approximation of GNU find as a [vinyl][] stream.

[vinyl]: https://github.com/wearefractal/vinyl

[![npm](https://img.shields.io/npm/v/node-find.svg)](https://www.npmjs.com/package/node-find)
[![Dependency Status](https://gemnasium.com/badges/github.com/thejohnfreeman/node-find.svg)](https://gemnasium.com/github.com/thejohnfreeman/node-find)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Build Status](https://travis-ci.org/thejohnfreeman/node-find.svg?branch=master)](https://travis-ci.org/thejohnfreeman/node-find)
[![Coverage Status](https://coveralls.io/repos/github/thejohnfreeman/node-find/badge.svg?branch=master)](https://coveralls.io/github/thejohnfreeman/node-find?branch=master)
[![Code Climate](https://codeclimate.com/github/thejohnfreeman/node-find/badges/gpa.svg)](https://codeclimate.com/github/thejohnfreeman/node-find)


## Usage

### `find([opts])`

Return a stream of the files under the starting paths, according to search
parameters.

#### Options

- `paths :: Array.<string>`

  List of paths to be roots of traversal. Default is `['.']`.

- `fs :: Module`

  An alternative [filesystem module][fs]. Default is [graceful-fs][] when
  available; otherwise [fs][].

- `maxDepth :: number`

  Limit for depth of recursion. All of the starting paths are at level 0.
  Default is `Infinity`.

- `filter :: function(Stream, File): boolean`

  Given the stream and a file, asynchronously answer two questions:
  1. **Should the file appear in the stream?** If so, call `stream.accept(file)`. If
  not, do nothing.
  1. **Should the search recurse on this file, if it is a directory?** If so, call
  `stream.recurse(file)`. This will be a no-op on files that are not
  directories. Otherwise, call `file.done()`, or set `file.recurse = false`
  before calling `stream.recurse(file)`. `filter` must call exactly one of these
  methods to signal the end of its asynchronous computation.

  To help make its decision, `filter` has access to `file.path` and
  `file.stats` (which contains the [results of `lstat`][stats]).

- `expr :: FindExpression`

  Instead of specifying `filter`, you may give a find expression (based on the
  same from [GNU find][find-expr]) that will be compiled into an appropriate
  filter function. Check the [tests][] for examples.

[fs]: http://nodejs.org/api/fs.html
[graceful-fs]: https://github.com/isaacs/node-graceful-fs
[stats]: http://nodejs.org/api/fs.html#fs_class_fs_stats
[find-expr]: http://www.gnu.org/software/findutils/manual/html_mono/find.html#find-Expressions
[tests]: https://github.com/thejohnfreeman/node-find/blob/master/test/tests.js

#### Expressions

If given, the find expression will be evaluated against every file in the
recursive traversal. Unlike GNU find, an implicit "print" command (in this
case, called `accept`) will not be added for you; that is, an expression
with no `accept` command will never do anything, and the stream will be empty.

Like in GNU find, the default composition operator is `and`.

##### Shell patterns

Only GNU find shell patterns are supported: `*` for any sequence of characters,
`?` for a single character, and `[`, `]` surrounding a character class. These
special characters may be matched explicitly by escaping them with a backslash
(`\`).

To get the "globstar" (`**`) matching popular in [node-glob][], use a `path`
primary with a simple shell pattern.

[node-glob]: https://github.com/isaacs/node-glob

##### Primaries

- `{'name': string}`

  True if the last component of the pathname being examined matches the given
  GNU find shell pattern.

- `{'iname': string}`

  Like `name`, but the match is case insensitive.

- `{'path': string}`

  True if the pathname being examined matches the given GNU find shell pattern.
  Slashes (`/`) are treated as normal characters and do not have to be matched
  explicitly.

- `{'ipath': string}`

  Like `path`, but the match is case insensitive.

- `{'regex': RegExp}`

  True if the *whole path* of the file matches the given regular expression.

- `{'iregex': RegExp}`

  Like `regex`, but the match is case insensitive.

- `'false'`

  Always false.

- `'true'`

  Always true

- `{'type': string}`

  True if the file is of the specified type(s). Use a string of characters to
  specify multiple file types.

  - `'b'` block special
  - `'c'` character special
  - `'d'` directory
  - `'f'` regular file
  - `'l'` symbolic link
  - `'p'` FIFO
  - `'s'` socket

##### Commands

- `'accept'`

  Put the file in the stream and return true.

- `'prune'`

  Prevent recursion on the file (if it is a directory) and return true.

##### Operators

- `{'and': Array.<FindExpression>}` or `Array.<FindExpression>`

  The logical AND operator.  As it is implied by the juxtaposition of two
  expressions (in an array), it does not have to be specified. The expression
  evaluates to true if all subexpressions are true. Only evaluates up to the
  first false expression.

- `{'or': Array.<FindExpression>}`

  The logical OR operator. The expression evaluates to true if any subexpression
  is true. Only evaluates up to the first true expression.

- `{'not': FindExpression}`

  The unary NOT operator. Evaluates to true if the subexpression is false.


### `find(paths...)`

Equivalent to `find({paths: paths})`.

## License

[MIT](http://opensource.org/licenses/MIT)

