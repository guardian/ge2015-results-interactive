var fs = require('fs');

module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    grunt.initConfig({

        watch: {
            js: {
                files: ['src/js/**/*'],
                tasks: ['shell', 'template:snap'],
            },
            css: {
                files: ['src/css/**/*'],
                tasks: ['sass', 'template:snap'],
            },
            harness: {
                files: ['harness/**/*'],
                tasks: ['copy:main','template']
            },
            html: {
                files: ['src/html/**/*'],
                tasks: ['template:snap']
            }
        },

        clean: {
            build: ['build']
        },

        sass: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'build/main.css': 'src/css/main.scss',
                    'build/snap.css': 'src/css/snap.scss'
                }
            }
        },

        shell: {
            jspmBundleStatic: {
                command: './node_modules/.bin/jspm bundle-sfx src/js/main build/main.js',
                options: {
                    execOptions: {
                        cwd: '.'
                    }
                }
            },
            jspmBundleSnap: {
                command: './node_modules/.bin/jspm bundle-sfx src/js/snap build/snap.js',
                options: {
                    execOptions: {
                        cwd: '.'
                    }
                }
            }
        },

        'template': {
            'harness': {
                'options': {
                    'data': {
                        'assetPath': 'http://localhost:8000',
                    }
                },
                'files': {
                    'build/boot.js': ['harness/boot.js.tpl'],
                    'build/interactive.html': ['harness/interactive.html.tpl'],
                    'build/lite.html': ['harness/lite.html.tpl']
                }
            },
            'snap': {
                'options': {
                    'data': function () {
                        var css = fs.readFileSync('build/snap.css');
                        var html = fs.readFileSync('src/html/snap.html');
                        return {'html': JSON.stringify('<div id="election-snap"><style>' + css + '</style>' + html + '</div>') }
                    }
                },
                'files': {
                    'build/snap.json': ['harness/snap.json.tpl']
                }
            }
        },

        copy: {
            main: {
                files: [
                    {expand: true, cwd: 'harness/', src: ['curl.js', 'index.html', 'mega.json', 'front.html'], dest: 'build'},
                ]
            }
        },
        symlink: {
            options: {
                overwrite: false
            },
            explicit: {
                src: 'bower_components/guss-webfonts/webfonts',
                dest: 'build/fonts/0.1.0'
            },
        },

        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8000,
                    base: 'build',
                    middleware: function (connect, options, middlewares) {
                        // inject a custom middleware http://stackoverflow.com/a/24508523
                        middlewares.unshift(function (req, res, next) {
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', '*');
                            return next();
                        });
                        return middlewares;
                    }
                }
            }
      }
    });
    grunt.registerTask('default', ['clean','sass','shell','template','copy','symlink', 'connect', 'watch']);
}
