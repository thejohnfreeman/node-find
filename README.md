# node-find                                                                                                          
  
An approximation of GNU find as a [vinyl][] stream.                                                                  
  
[vinyl]: https://github.com/wearefractal/vinyl
  
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

### `find(paths...)`                                                                                                
    
Equivalent to `find({paths: paths})`.                                 
    
## License

[MIT](http://opensource.org/licenses/MIT)

