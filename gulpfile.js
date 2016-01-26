var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var browserify = require('browserify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var sass = require('gulp-ruby-sass');
var notify = require('gulp-notify');
var del = require('del');

gulp.task('javascript', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './scripts/weatherOr.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('./scripts/weatherOr.js'))
    .pipe(buffer())
        .pipe(uglify())
        .on('error', gutil.log)
    .pipe(gulp.dest('./dist/'));
});

gulp.task('styles', function () {
  return sass('./sass/styles.scss', { style: 'expanded' })
    .pipe(gulp.dest('./dist/css'))
    .pipe(notify({ message: 'Styles task complete' }));
});

gulp.task('clean', function () {
  return del(['dist/css', 'dist/scripts']);
});

gulp.task('watch', function () {

  // Watch .scss files
  gulp.watch('./sass/*.scss', ['styles']);

  // Watch .js files
  gulp.watch('./scripts/*.js', ['javascript']);  
});