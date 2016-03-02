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
var open = require('gulp-open');
var runseq = require('run-sequence');

gulp.task('javascript', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './scripts/App.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('./scripts/App.js'))
    .pipe(buffer())
        .pipe(uglify())
        .on('error', gutil.log)
    .pipe(gulp.dest('./dist/'))
    .pipe(notify({ message: 'JavaScript minified'}));
});

gulp.task('styles', function () {
  return sass('./sass/styles.scss', { style: 'expanded' })
    .pipe(gulp.dest('./dist/css'))
    .pipe(notify({ message: 'SASS preprocessed' }));
});

gulp.task('clean', function () {
  return del(['dist/css', 'dist/scripts', 'qunit/test']);
});

gulp.task('qunit', function () {
  // set up the browserify instance on a task basis
  var q = browserify({
    entries: './test/tests.js',
    debug: true
  });

  return q.bundle()
    .pipe(source('./test/tests.js'))
    .pipe(buffer())
        .on('error', gutil.log)
    .pipe(gulp.dest('./qunit/'))
    .pipe(notify({ message: 'QUnit tests built'}));
});

gulp.task('open', function () {
  gulp.src('./index.html')
  .pipe(open());
});

gulp.task('watch', ['build'], function () {

  // Watch .scss files
  gulp.watch('./sass/*.scss', ['styles']);

  // Watch .js files
  gulp.watch('./scripts/*.js', ['javascript']);

  // Watch test tests
  gulp.watch('./test/*.js', ['qunit']);
});

gulp.task('build', function (callback) {
  runseq('clean',
    ['javascript', 'styles', 'qunit'],
    'open',
    callback);
});

gulp.task('default', ['build']);

gulp.task('test', ['qunit'], function () {
  gulp.src('./test/test.html')
  .pipe(open());  
});