var gulp = require('gulp'),
    coffee = require('gulp-coffee'),
    gulpUtil = require('gulp-util'),
    sourceMaps = require('gulp-sourcemaps'),
    mocha = require('gulp-mocha');

require('coffee-script/register');

gulp.task('default', function() {
    console.log('default');
});

gulp.task('coffee', function(){
    gulp.src('src/*.coffee')
        .pipe(sourceMaps.init())
        .pipe(coffee({bare: true}).on('error', gulpUtil.log))
        .pipe(sourceMaps.write())
        .pipe(gulp.dest('lib/'));
});

gulp.task('mocha', function(){
    gulp.src('test/*.coffee', {read: false}).pipe(mocha({reporter: 'nyan'}));
});
