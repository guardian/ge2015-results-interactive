'use strict';
define([], function() {
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
                addCSS('<%= assetPath %>/main.css');
            }, 10);


            var load = function (System) {
                var x = System;
                System.import('jspm_packages/github/jmcriffey/bower-traceur-runtime@0.0.87/traceur-runtime').then(function () {
                    window.System = x;
                    // Load main application
                    System.import('<%= assetPath %>main').then(function(main) {
                        main.default.init(el, context, config, mediator);
                    });
                });
            };

            // TODO:
            // System.clone

            if (window.System) {
                // New frontend using SystemJS — the new world!
                load(window.System);
            } else if (window.curl) {
                // Frontend using curl
                // TODO: Document
                var require = window.require;
                window.require = undefined;

                // document.write is broken in async, so load ES6 module loader manually
                require(['js!jspm_packages/es6-module-loader'], function () {
                    require(['js!jspm_packages/system!exports=System'], load);
                });
            } else {
                // Mobile apps using RequireJS
                // TODO: Document
                var require = window.require;
                window.require = undefined;

                require.config({
                    shim: { 'jspm_packages/system': { exports: 'System' } }
                });

                // document.write is broken in async, so load ES6 module loader manually
                require(['jspm_packages/es6-module-loader'], function () {
                    require(['jspm_packages/system'], load);
                });
            }

        }
    };
});
