module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/* Created by the best team :) */',
        comments: false,
      },
      build: {
        src: 'src/js/main.js',
        dest: 'www/js/main.min.js',
      },
    },
    cssmin: {
      options: {
        mergeIntoShorthands: false,
        roundingPrecision: -1,
      },
      target: {
        files: {
          'www/css/main.min.css': [
            'src/css/normalize.css',
            'src/css/main.css',
          ],
        },
      },
    },
    replace: {
      target: {
        options: {
          patterns: [
            {
              match: /\.js"/g,
              replacement: '.min.js"',
            },
            {
              match: /<link rel="stylesheet" href="css\/normalize\.css">/,
              replacement: '',
            },
            {
              match: /\.css"/,
              replacement: '.min.css"',
            },
          ],
        },
        files: [
          {expand: true, flatten: true, src: ['src/*.html'], dest: 'www/'},
        ],
      },
    },
    copy: {
      main: {
        files: [
          {expand: true, cwd: 'src/', src: ['img/**', 'fonts/**'], dest: 'www/'}
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-replace');

  grunt.registerTask('default', ['uglify', 'cssmin', 'replace', 'copy']);
};
