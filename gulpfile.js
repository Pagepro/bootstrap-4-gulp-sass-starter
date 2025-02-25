// The require statement tells Node to look into the node_modules folder for a package
// Once the package is found, we assign its contents to the variable
// gulp.src tells the Gulp task what files to use for the task
// gulp.dest tells Gulp where to output the files once the task is completed.
var gulp = require('gulp'),
  browserSync = require('browser-sync').create(),
  sass = require('gulp-sass'),
  del = require('del'),
  panini = require('panini'),
  sourcemaps = require('gulp-sourcemaps'),
  imagemin = require('gulp-imagemin'),
  cache = require('gulp-cache'),
  runSequence = require('run-sequence'),
  minify = require('gulp-minify'),
  cssnano = require('gulp-cssnano'),
  autoprefixer = require('gulp-autoprefixer'),
  concat = require('gulp-concat');

// Styleguide Variables
var styleguide = require('sc5-styleguide'),
  sourcePath = 'src',
  staticPath = 'static',
  styleSourcePath = sourcePath + '/**/scss',
  scssWild = styleSourcePath + '/**/*.scss',
  scssRoot = styleSourcePath + '/app.scss',
  extraScssRoot = styleSourcePath + '/styleguide.scss',
  styleguideTmpPath = 'styleguide',
  isProdOrCommit = false;

// ------------ Development Tasks -------------
// Compile Sass into CSS
gulp.task('sass', function () {
  return gulp.src(['src/assets/scss/*.scss'])
    .pipe(sourcemaps.init())
    .pipe(sass({
      // outputStyle: 'expanded',
      sourceComments: 'map',
      sourceMap: 'sass',
      outputStyle: 'nested'
    }).on('error', sass.logError))
    .pipe(autoprefixer({ grid: true }))
    .pipe(cssnano()) // Use cssnano to minify CSS
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(browserSync.stream())
})

// Using panini, template, page and partial files are combined to form html markup
gulp.task('compile-html', function () {
  return gulp.src('src/pages/**/*.html')
    .pipe(panini({
      root: 'src/pages/',
      layouts: 'src/layouts/',
      partials: 'src/partials/',
      helpers: 'src/helpers/',
      data: 'src/data/'
    }))
    .pipe(gulp.dest('dist'))
})

// Reset Panini's cache of layouts and partials
gulp.task('resetPages', (done) => {
  panini.refresh()
  done()
  console.log('Clearing panini cache')
})

// Watches for changes while gulp is running
gulp.task('watch', ['sass'], function () {
  // Live reload with BrowserSync
  browserSync.init({
    server: './dist'
  })

  gulp.watch(['src/assets/js/**/*.js'], ['scripts', browserSync.reload])
  gulp.watch(['src/assets/scss/**/*'], ['sass', browserSync.reload])
  gulp.watch(['src/assets/img/**/*'], ['images'])
  gulp.watch(['src/assets/video/**/*'], ['media'])
  gulp.watch(['src/**/*.html'], ['resetPages', 'compile-html', browserSync.reload])
  console.log('Watching for changes')
})

gulp.task('sgimages', function () {
  gulp
    .src(staticPath + '/img/**.*')
    .pipe(gulp.dest(styleguideTmpPath + '/static/img'))
})

// TODO - sprites
// gulp.task('sgsvg', function () {
//   gulp
//     .src(staticPath + '/svg/symbol/svg/sprite.symbol.svg')
//     .pipe(gulp.dest(styleguideTmpPath + '/static/svg/symbol/svg'))
// })

gulp.task('sgjs', function () {
  gulp
    .src(staticPath + '/js/**.*')
    .pipe(gulp.dest(styleguideTmpPath + '/static/js'))
})

// Style guide
gulp.task('styleguide:generate', function () {
  return gulp
    .src(scssWild)
    .pipe(styleguide.generate({
      title: 'Shippy Styleguide',
      extraHead: ['<script src="/static/js/app.js"></script>'],
      disableEncapsulation: true,      
      server: !isProdOrCommit,
      rootPath: styleguideTmpPath,
      overviewPath: 'README.md',
      showReferenceNumbers: true,
      appRoot: isProdOrCommit ? '/styleguide' : ''
    }))
    .pipe(gulp.dest(styleguideTmpPath))
})

gulp.task('styleguide:applystyles', function () {
  return gulp
    .src([scssRoot, extraScssRoot])
    .pipe(
      sass({
        errLogToConsole: true,
      })
    )
    .pipe(styleguide.applyStyles())
    .pipe(gulp.dest(styleguideTmpPath));
})

gulp.task('styleguide', [
  'styleguide:generate',
  'styleguide:applystyles',
  'sgimages',
  // 'sgsvg', TODO
  'sgjs'
  // 'sgfonts'
])

gulp.task('styleguidewatch', ['styleguide'], function () {
  // Start watching changes and update styleguide whenever changes are detected
  // Styleguide automatically detects existing server instance
  gulp.watch([scssWild], ['styleguide'])
})

// ------------ Optimization Tasks -------------
// Copies image files to dist
gulp.task('images', function () {
  return gulp.src('src/assets/img/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe(cache(imagemin([
      imagemin.gifsicle({ interlaced: true }),
      imagemin.jpegtran({ progressive: true }),
      imagemin.optipng({ optimizationLevel: 5 })
    ]))) // Caching images that ran through imagemin
    .pipe(gulp.dest('dist/assets/img/'))
})

// Copies video assets to dist
gulp.task('media', function () {
  return gulp.src('src/assets/video/**/*')
    .pipe(gulp.dest('dist/assets/video/'))
})

// Places font files in the dist folder
gulp.task('font', function () {
  return gulp.src('src/assets/fonts/*.+(eot|woff|ttf|otf)')
    .pipe(gulp.dest('dist/assets/fonts'))
    .pipe(browserSync.stream())
})

// Concatenating js files
gulp.task('scripts', function () {
  return gulp.src('src/assets/js/app.js')
    .pipe(sourcemaps.init())
    // If concatenating more than one JS file
    // .pipe(concat('app.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(minify())
    .pipe(gulp.dest('dist/assets/js/'))
    .pipe(browserSync.stream())
})

// Cleaning/deleting files no longer being used in dist folder
gulp.task('clean:dist', function () {
  console.log('Removing old files from dist')
  return del.sync('dist')
})

// ------------ Build Sequence -------------
// Simply run 'gulp' in terminal to run local server and watch for changes
gulp.task('default', ['clean:dist', 'font', 'scripts', 'images', 'compile-html', 'resetPages', 'media', 'watch']);

// Creates production ready assets in dist folder
gulp.task('build', function () {
  console.log('Building production ready assets');
  runSequence('clean:dist', 'sass', ['scripts', 'images', 'font', 'compile-html'])
})
