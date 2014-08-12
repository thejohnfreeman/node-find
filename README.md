# node-find                                                                                                          
  
An approximation of GNU find as a [vinyl][] stream.                                                                  
  
[vinyl]: https://github.com/wearefractal/vinyl
  
## Usage
    
### `find(opts)` 

Return a stream of the files under the starting paths, according to search parameters.

#### Options

   Name    |                 Type               |        Description
---------- | ---------------------------------- | ---------------------------
`start`    | `Array.<string>`                   | List of paths to be roots of traversal. Default is `['.']`.
`fs`       | `Module`                           | An alternative [filesystem module][fs]. Default is [graceful-fs][] when available; otherwise [fs][].
`maxDepth` | `number`                           | Limit for depth of recursion. All of the starting paths are at level 0. Default is `Infinity`.
`filter`   | `function(string, Stats): boolean` | Given the absolute path to a file and its [stats][], return true if it should appear in the stream. Default always returns true.
`prune`    | `function(string, Stats): boolean` | Given the absolute path to a directory and its [stats][], return true if the directory tree rooted at the directory should not appear in the stream. Default always returns false.

[fs]: http://nodejs.org/api/fs.html
[graceful-fs]: https://github.com/isaacs/node-graceful-fs
[stats]: http://nodejs.org/api/fs.html#fs_class_fs_stats

### `find(paths...)`                                                                                                
    
Equivalent to `find({start: paths})`.                                 
    
## License

[MIT](http://opensource.org/licenses/MIT)

