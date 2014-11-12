gulp = require('gulp')
coffee = require('gulp-coffee')
gulpUtil = require('gulp-util')
sourceMaps = require('gulp-sourcemaps')
mocha = require('gulp-mocha')
coffeelint = require('gulp-coffeelint')

gulp.task('coffee', ->
  # compiles all coffee script files from src to lib, adding source maps as
  # well
  gulp.src('src/*.coffee')
    .pipe(sourceMaps.init())
    .pipe(coffee({bare: true}).on('error', gulpUtil.log))
    .pipe(sourceMaps.write())
    .pipe(gulp.dest('lib/'))
)

gulp.task('test', ->
  gulp.src([
    'test/unit/*.coffee'
#    'test/integration/*.coffee'
  ], {read: false}).pipe(mocha({reporter: 'nyan'}))
)

gulp.task('lint', ->
  gulp.src(['src/*.coffee', 'test/*.coffee', 'test/*/*.coffee'])
    .pipe(coffeelint())
    .pipe(coffeelint.reporter())
)

gulp.task('build', ->
  console.log('build: todo')
)

gulp.task('default', ['lint', 'test', 'coffee', 'build'], ->
  console.log('Done.')
)
