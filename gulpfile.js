var gulp = require('gulp'),
    coffee = require('gulp-coffee'),
    gulpUtil = require('gulp-util'),
    sourceMaps = require('gulp-sourcemaps'),
    mocha = require('gulp-mocha');

gulp.task('default', function() {
    console.log('default');
});

gulp.task('coffee', function(){
    var compile = function compile_coffeeTask(src){
        src.pipe(sourceMaps.init())
            .pipe(coffee({bare: true}).on('error', gulpUtil.log))
            .pipe(sourceMaps.write());

        return src
    };

    compile(gulp.src('src/*.coffee')).pipe(gulp.dest('lib/'));
    compile(gulp.src('test/*.coffee')).pipe(gulp.dest('test/'));
});

gulp.task('mocha', ['coffee'], function(){
    gulp.src('test/*.js', {read: false}).pipe(mocha({reporter: 'nyan'}));
});
