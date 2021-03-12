# node-find

An approximation of GNU find as an asynchronous iterator.

[![npm](https://img.shields.io/npm/v/node-find.svg)](https://www.npmjs.com/package/node-find)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Build Status](https://travis-ci.org/thejohnfreeman/node-find.svg?branch=master)](https://travis-ci.org/thejohnfreeman/node-find)
[![Coverage Status](https://coveralls.io/repos/github/thejohnfreeman/node-find/badge.svg?branch=master)](https://coveralls.io/github/thejohnfreeman/node-find?branch=master)
[![Code Climate](https://codeclimate.com/github/thejohnfreeman/node-find/badges/gpa.svg)](https://codeclimate.com/github/thejohnfreeman/node-find)


## Usage

### `find(filter, [options])`

Return an asynchronous iterator of the files under a starting path,
according to search parameters.

#### Options

- `start :: string`

  The root of traversal. Default is `['.']`.

- `maxDepth :: number`

  Limit for depth of recursion. The starting path is at level 0.
  Default is no limit.

- `filter :: async (Path) => {include: boolean, ascend: boolean}`

  Given a path to a file, asynchronously answer two questions:
  1. **Should the file appear in the sequence?** If yes, return `true` for
     `include`.
  1. **Should the search descend into this directory?** If no, return `true`
     for `ascend`. This value has no effect or meaning for paths that are not
     directories.

Check the [tests][] for examples.

[tests]: https://github.com/thejohnfreeman/node-find/blob/master/test/tests.js


### Filters

##### Shell patterns

Only GNU find shell patterns are supported: `*` for any sequence of characters,
`?` for a single character, and `[`, `]` surrounding a character class. These
special characters may be matched explicitly by escaping them with a backslash
(`\`).

To get the "globstar" (`**`) matching popular in [node-glob][], use a `path`
filter with a simple shell pattern.

[node-glob]: https://github.com/isaacs/node-glob

##### Matchers

- `name(string)`

  Includes a path if the last component of the pathname matches the given
  shell pattern.

- `path(string)`

  Includes a path if the full pathname matches the given shell pattern.
  Path component separators (e.g. `/` on Linux) are treated as normal
  characters and do not have to be matched explicitly.

- `regex(string | RegExp)`

  Includes a path if the full pathname matches the given regular
  expression.

- `never`

  Includes no paths.

- `always`

  Includes every path.

- `type(string)`

  Includes a path if it has the specified type. The type symbols are taken
  from GNU find.

  - `'b'` block device
  - `'c'` character device
  - `'d'` directory
  - `'f'` regular file
  - `'l'` symbolic link
  - `'p'` FIFO
  - `'s'` socket

##### Operators

- `prune(filter)`

  Prevent descent into directories that match the given filter, but still
  include them in the sequence!

- `and(...filters)`

  The logical AND operator. Includes a path if all subfilters include the
  path. Ascends if any subfilter that includes the path chose to ascend. Stops
  evaluating filters after the first exclusion.

- `or(...filters)`

  The logical OR operator. Includes a path if any subfilter includes the path.
  Stops evaluating filters after the first inclusion. Ascends if that
  subfilter chose to ascend.

- `not(filter)`

  The unary NOT operator. Includes a path if the subfilter excludes it. Passes
  through the subfilter's descision on ascent.


## License

[MIT](http://opensource.org/licenses/MIT)
