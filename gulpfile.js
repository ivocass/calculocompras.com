



var bootstrap_sass = './bower_components/bootstrap-sass/';

var isBuild = false;

var babelify = require('babelify'),
    browserify = require("browserify"),
    browserSync = require('browser-sync'),
    buffer = require('vinyl-buffer'),
    // historyApiFallback = require('connect-history-api-fallback'),
  	del = require('del'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    runSequence = require('run-sequence'),
    sass = require('gulp-sass'),
    source = require('vinyl-source-stream'),
  	sourcemaps = require("gulp-sourcemaps"),
    watchify = require('watchify');
    fileinclude = require('gulp-file-include');


const bundler = watchify(browserify('./src/js/app.js', {debug:true}));

bundler.transform("babelify", {presets: ["es2015"]});

gulp.task('js', bundle);
bundler.on('update', bundle);
bundler.on('log', gutil.log); // output build logs to cli


function bundle(){

  var task = bundler.bundle()
  // log errors if they happen
    .on('error', gutil.log.bind(gutil, gutil.colors.red(
       '\n\n*********************************** \n' +
      'BROWSERIFY ERROR:' +
      '\n*********************************** \n\n'
  )))
  .pipe(source('bundle.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true })) // load map from browserify file
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest("public/js"))
  .pipe(browserSync.reload({stream: true}));

  return task;
}


gulp.task('sass', function(){

    // use styles.scss, put inside the other scss files and put that inside public/css/styles.css
    return gulp.src('src/scss/styles.scss')
        .pipe(sass({ includePaths: ['src/scss'], errLogToConsole: true }))
        .pipe(gulp.dest('./public/css'))
        .pipe(browserSync.reload({stream: true}));
});

//gulp.watch('app/scss/**/*.scss', ['sass']);

gulp.task('watch', function(){
  gulp.watch('src/scss/**/*.scss', ['sass']);
  // gulp.watch('src/**/*.html').on('change', copyUpdatedHtmlFile);
  gulp.watch('src/**/*.html', ['html-modular']);
  gulp.watch('src/assets/*').on('change', copyUpdatedAssetsFile);
  //gulp.watch('src/**/*.js', ['js']); not necessary. using watchify
});

// function copyUpdatedHtmlFile(file){
  
//   // do not return!
//   gulp.src(file.path, { base: 'src/' })
//   .pipe(gulp.dest('public/'))
//   .pipe(browserSync.reload({stream: true}));
// }

function copyUpdatedAssetsFile(file) {
  
  // do not return!
  gulp.src(file.path, { base: 'src/assets/' })
  .pipe(gulp.dest('public/assets/'))
    .pipe(browserSync.reload({stream: true}));
}

gulp.task('html-simple', function(){

  return gulp.src('src/**/*.html')
  .pipe(gulp.dest('public/'));

  // no need to reload on this task
   // .pipe(browserSync.reload({stream: true}));
});

// include every html file into public/index.html
gulp.task('html-modular', function() {
  
  // do not return!
  gulp.src('src/index.html')
    .pipe(fileinclude({
      prefix: '@@'
    }))
    .pipe(gulp.dest('public/'))
    .pipe(browserSync.reload({stream: true}));
});


gulp.task('browserSync', function() {

  return browserSync.init
  ({
    server: 
    {
      baseDir: ["public"],
      // not necessary. no routing on this app
      // routes: 
      // {
      //   '/bower_components': 'bower_components'
      // },
      // middleware: [ historyApiFallback() ]
    }
  })
});



// //////////////////////////////////////////////////////////////////
// Build tasks
// //////////////////////////////////////////////////////////////////

// start from scratch
gulp.task('build:clean', function(){

	return del(['public/*', 'docs/*']);
});

// copy all files from src to public
gulp.task('build:copy', function(){

  // to ignore directories, we need to negate dir AND contents!
  return gulp.src(['src/**/*/', '!src/html/', '!src/html/**', , '!src/scss/', '!src/scss/**', '!src/js/**', 'src/js/bundle.js', 'src/js/bundle.js.map'])
	.pipe(gulp.dest('public/'));
});

// copy all files from src to public
gulp.task('publish', function(){

  return gulp.src('public/**/*/')
  .pipe(gulp.dest('docs/'));
});

// remove unwanted build:copy files
gulp.task('build:remove', function(){

	return del([
    // no need to delete for now. files are ignored in build:copy
		// 'public/scss/',
		// 'public/html/',
		// 'public/js/!(*.min.js)'
		]);
});

gulp.task('build', function() {

  isBuild = true;

  return runSequence(
              'build:clean',
              'build:copy',
              // 'build:remove',
              'sass',
              'js',
              'html-modular',
              'publish',
              'exit');
});

gulp.task('exit', function(){ 
  process.exit();
})


// copy the glyphicons dir
// gulp.task('fonts', function(){

//   return gulp.src(bootstrap_sass+"assets/fonts/bootstrap/*")
//   .pipe(gulp.dest('public/fonts/bootstrap'));
// });


gulp.task('default', ['sass', 'html-modular', 'js', 'browserSync', 'watch']);
