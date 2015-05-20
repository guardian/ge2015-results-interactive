var fs = require('fs');
var timestamp = Date.now();

var s3bucket = 'gdn-cdn';
var s3path = '2015/05/results-interactive/';
var s3target = 'http://visuals.guim.co.uk/' + s3path + timestamp;

module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    var s3 = grunt.option('s3') || false;

    grunt.log.writeln('Compiling ' + (s3 ? 'for S3' : 'locally'));

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
                tasks: ['copy:build','template']
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
                command: './node_modules/.bin/jspm bundle ' + (s3 ? '-m ' : '') + 'main build/main.js',
                options: {
                    execOptions: {
                        cwd: '.'
                    }
                }
            },
            jspmBundleSnap: {
                command: './node_modules/.bin/jspm bundle ' + (s3 ? '-m ' : '') + 'snap build/snap.js',
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
                        'assetPath': s3 ? s3target + '/' : '',
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
            build: {
                files: [
                    {expand: true, cwd: 'harness/', src: ['curl.js', 'index.html', 'mega.json', 'front.html', 'frontpage.json'], dest: 'build'},
                    {expand: true, cwd: 'src/js/jspm_packages/', src:
                        ['es6-module-loader.js',
                         'system.js'], dest: 'build' },
                     {expand: true, cwd: 'src/js/jspm_packages/github/jmcriffey/bower-traceur-runtime@0.0.87', src:
                        ['traceur-runtime.js'], dest: 'build' }
                ]
            },
            deploy: {
                files: [
                    {expand: true, cwd: 'build/', src: ['boot.js'], dest: 'deploy' },
                    {expand: true, cwd: 'build/', src:
                        ['main.js', 'main.css', 'main.js.map', 'main.css.map',
                         'es6-module-loader.js', 'system.js', 'traceur-runtime.js'], dest: 'deploy/' + timestamp }
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
            jspm_packages: {
                src: 'src/js/jspm_packages',
                dest: 'build/jspm_packages'
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
    grunt.registerTask('default', ['clean','sass','shell','template','copy:build','symlink', 'connect', 'watch']);
    grunt.registerTask('build', ['clean','sass','shell','template', s3 ? 'copy' : 'copy:build']);
}
