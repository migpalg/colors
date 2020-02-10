module.exports = grunt => {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/* Created by the best team :) */',
      },
      build: {
        src: 'src/js/app.js',
        dest: 'dist/js/app.min.js'
      },
    },
  });
}
