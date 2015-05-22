'use strict';
define([], function() {
    function loadMain(moduleId, assetPath, cb) {
        return function (el, context, config, mediator) {
            var require = window.require;

            var systemLoad = function (System) {
                // https://github.com/systemjs/systemjs/issues/461
                // Restore old require
                window.require = require;

                // TODO: Use System.clone
                // https://github.com/systemjs/systemjs/issues/457
                System.paths['main'] = assetPath + moduleId + '.js';
                System.paths['interactive-traceur-runtime'] = assetPath + 'traceur-runtime' + '.js';
                // Annoyingly Traceur runtime is not bundled, so we load it
                // manually
                // https://github.com/systemjs/systemjs/issues/431
                System.import('interactive-traceur-runtime').then(function () {
                    window.System = System;
                    System.import('main').then(cb);
                });
            };

            if (window.System) {
                systemLoad(window.System);
            } else if (window.require.version === "0.8.10") {
                // DEPRECATE ASAP
                // Frontend using curl
                // https://github.com/systemjs/systemjs/issues/461
                window.require = undefined;

                // document.write is broken in async, so load ES6 module loader manually
                require(['js!' + assetPath + 'es6-module-loader'], function () {
                    require(['js!' + assetPath + 'system!exports=System'], systemLoad);
                });
            } else {
                // DEPRECATE ASAP
                // Mobile apps using RequireJS
                // https://github.com/systemjs/systemjs/issues/461
                window.require = undefined;

                var shim = {};
                shim[assetPath + 'system.js'] = { exports: 'System' };
                require.config({ shim: shim });

                // document.write is broken in async, so load ES6 module loader manually
                require([assetPath + 'es6-module-loader.js'], function () {
                    require([assetPath + 'system.js'], systemLoad);
                });
            }
        };
    }

    function addCSS(url) {
        var head = document.querySelector('head');
        var link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('type', 'text/css');
        link.setAttribute('href', url);
        head.appendChild(link);
    }

    return {
        boot: function(el, context, config, mediator) {
            // Load CSS

            el.innerHTML = '<div style="font-size: 24px; text-align: center; padding: 72px 0; font-family: \'Guardian Egyptian Web\',Georgia,serif;">Loading…</div>';

            window.setTimeout(function() {
                addCSS('<%= assetPath %>main.css');
            }, 10);

            loadMain('main', '<%= assetPath %>', function (main) {
                main.default.init(el, context, config, mediator);
            }).apply(null, arguments);
        }
    };
});
