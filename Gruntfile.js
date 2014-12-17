"use strict";

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		watch: {
			scripts: {
				files: ['public/javascripts/**/*.js'],
				tasks: ['jshint']
			},
			css: {
				files: ['public/stylesheets/less/**/*.less'],
				tasks: ['less:compile']
			}
		},
		jshint: {
			uses_defaults: ['public/javascripts/**/*.js'],
			options: {
				curly: false,
				eqeqeq: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				boss: true,
				eqnull: true,
				browser: true,
				devel: false,
				laxcomma: true,
				globals: {
					define: true,
					require: true,
					$: true,
					_: true
				}
			},
			with_overrides: {
				options: {
					browser: false,
					node: true
				},
				globals: {
					__dirname: true,
					module: true,
					define: false,
					require: false,
					$: false,
					_: false
				},
				files: {
					src: ['Gruntfile.js', 'app.js', 'middleware/*.js']
				}
			}
		},
		requirejs: {
			combine: {
				options: {
					appDir: 'public/',
					baseUrl: 'vendor',
					dir: 'public-optimized/temp/',
					optimize: 'uglify2',
					optimizeCss: 'none',
					mainConfigFile: 'public/javascripts/app/main.js',
					generateSourceMaps: true,
					preserveLicenseComments: false,
					paths: {
						config: 'empty:',
						google: 'https://maps.googleapis.com/maps/api/js?libraries=places'
					},
					modules: [
						{ name: 'app/router' }
					]
				}
			}
		},
		less: {
			compile: {
				src: ['public/stylesheets/less/styles.less'],
				dest: 'public/stylesheets/styles.css',
				options: {
					compile: true
				}
			},
			compress: {
				src: ['public/stylesheets/less/styles.less'],
				dest: 'public-optimized/temp/stylesheets/styles.css',
				options: {
					compile: true,
					compress: true
				}
			}
		},
		rename: {
			build: {
				src: 'public-optimized/temp/build.txt',
				dest: 'build.txt'
			}
		},
		clean: {
			dist: ['public-optimized/temp']
		},
		zopfli: {
			optimized: {
				options: {
					mode: 'gzip'
				},
				expand: true,
				cwd: 'public-optimized/temp/',
				src: [
					'stylesheets/**/*.css',
					'javascripts/**/*.js',
					'vendor/**/*.js',
					'javascripts/**/*.map',
					'vendor/**/*.map',
					'templates/**/*.html'
				],
				dest: 'public-optimized/<%= pkg.version %>/',
				extDot: 'last'
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-rename');
	grunt.loadNpmTasks('grunt-zopfli');

	// Default task.
	grunt.registerTask('default', ['jshint', 'requirejs', 'less', 'rename', 'zopfli', 'clean']);
	
	// CSS-only
	grunt.registerTask('css', ['recess']);
};