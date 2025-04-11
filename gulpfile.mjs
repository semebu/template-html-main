import { src, dest, watch, series, parallel } from 'gulp';
import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
const sass = gulpSass(dartSass);

import plumber from 'gulp-plumber';
import notify from 'gulp-notify';
import sassGlob from 'gulp-sass-glob-use-forward';
import mmq from 'gulp-merge-media-queries';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssdeclsort from 'css-declaration-sorter';
import postcssPresetEnv from 'postcss-preset-env';
import sourcemaps from 'gulp-sourcemaps';
import babel from 'gulp-babel';
import browserSyncModule from 'browser-sync';
import imagemin from 'gulp-imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import changed from 'gulp-changed';
import { deleteAsync } from 'del';

import webp from 'gulp-webp';
import rename from 'gulp-rename';

const browserSync = browserSyncModule.create();

const srcPath = {
  css: "src/sass/**/*.scss",
  js: "src/js/**/*",
  img: "src/images/**/*",
  html: ["src/**/*.html", "!./node_modules/**"],
};

const destPath = {
  all: "dist/**/*",
  css: "dist/assets/css/",
  js: "dist/assets/js/",
  img: "dist/assets/images/",
  html: "dist/",
};

const htmlCopy = () => {
  return src(srcPath.html).pipe(dest(destPath.html));
};

const cssSass = () => {
  return src(srcPath.css)
    .pipe(sourcemaps.init())
    .pipe(plumber({ errorHandler: notify.onError("Error:<%= error.message %>") }))
    .pipe(sassGlob())
    .pipe(
      sass.sync({
        includePaths: ["src/sass"],
        outputStyle: "expanded",
      })
    )
    .pipe(
      postcss([
        postcssPresetEnv(),
        autoprefixer({ grid: true }),
        cssdeclsort({ order: "alphabetical" }),
      ])
    )
    .pipe(mmq())
    .pipe(sourcemaps.write("./"))
    .pipe(dest(destPath.css))
    .pipe(notify({ message: "Sassをコンパイルしました！", onLast: true }));
};

const imgImagemin = async () => {
  const { default: imageminSvgo } = await import('imagemin-svgo');

  return src(srcPath.img)
    .pipe(changed(destPath.img))
    .pipe(
      imagemin(
        [
          imageminMozjpeg({ quality: 80 }),
          imageminPngquant(),
          imageminSvgo({ plugins: [{ removeViewbox: false }] }),
        ],
        { verbose: true }
      )
    )
    .pipe(dest(destPath.img))
    .pipe(webp())
    .pipe(dest(destPath.img));
};

const jsBabel = () => {
  return src(srcPath.js)
    .pipe(plumber({ errorHandler: notify.onError("Error: <%= error.message %>") }))
    .pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(dest(destPath.js));
};

const browserSyncOption = {
  notify: false,
  server: "dist",
};

const browserSyncFunc = (done) => {
  browserSync.init(browserSyncOption);
  done();
};

const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

const clean = () => {
  return deleteAsync(destPath.all, { force: true });
};

const watchFiles = () => {
  watch(srcPath.css, series(cssSass, browserSyncReload));
  watch(srcPath.js, series(jsBabel, browserSyncReload));
  watch(srcPath.img, series(imgImagemin, browserSyncReload));
  watch(srcPath.html, series(htmlCopy, browserSyncReload));
};

// タスク登録
export const dev = series(
  series(cssSass, jsBabel, imgImagemin, htmlCopy),
  parallel(watchFiles, browserSyncFunc)
);

export const build = series(clean, cssSass, jsBabel, imgImagemin, htmlCopy);
export default dev;
