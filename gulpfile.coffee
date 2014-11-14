gulp = require('gulp')
coffee = require('gulp-coffee')
gulpUtil = require('gulp-util')
sourceMaps = require('gulp-sourcemaps')
mocha = require('gulp-mocha')
coffeelint = require('gulp-coffeelint')
coffeeify = require('gulp-coffeeify')


gulp.task('coffee', ->
  # compiles all coffee script files from src to lib, adding source maps as well
  gulp.src('src/*.coffee')
    .pipe(sourceMaps.init())
    .pipe(coffee({bare: true}).on('error', gulpUtil.log))
    .pipe(sourceMaps.write())
    .pipe(gulp.dest('build/node'))
)

gulp.task('browserify', ->
  gulp.src('src/olorin.coffee')
    .pipe(coffeeify())
    .pipe(gulp.dest('build/browser'))
)

gulp.task('test', ->
  gulp.src([
    'test/unit/*.coffee'
#    'test/integration/*.coffee'
  ], {read: false}).pipe(mocha({reporter: 'nyan'}))
)

gulp.task('lint', ->
  gulp.src(['*.coffee', 'src/*.coffee', 'test/*.coffee', 'test/*/*.coffee'])
    .pipe(coffeelint())
    .pipe(coffeelint.reporter())
)

gulp.task('watch', ->
  gulp.watch('src/*.coffee', ['test'])
)

gulp.task('build', ['coffee', 'browserify'], ->
  console.log('Done.')
)

gulp.task('default', ['lint', 'test', 'build'], ->
  console.log('Done.')
)
