var find  = require('.')
var debug = require('gulp-debug')
var drain = require('./drain')

find().pipe(debug()).pipe(drain.objs)

