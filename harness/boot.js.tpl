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
                addCSS('<%= assetPath %>main.css');
            }, 10);


            var load = function (System) {
                var x = System;
                // TODO: What if Traceur runtime is already loaded?
                System.import('<%= assetPath %>traceur-runtime.js').then(function () {
                    window.System = x;
                    // Load main application
                    System.import('<%= assetPath %>main.js').then(function(main) {
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
                require(['js!<%= assetPath %>es6-module-loader'], function () {
                    require(['js!<%= assetPath %>system!exports=System'], load);
                });
            } else {
                // Mobile apps using RequireJS
                // TODO: Document
                var require = window.require;
                window.require = undefined;

                require.config({
                    shim: { '<%= assetPath %>system': { exports: 'System' } }
                });

                // document.write is broken in async, so load ES6 module loader manually
                require(['<%= assetPath %>es6-module-loader'], function () {
                    require(['<%= assetPath %>system'], load);
                });
            }

        }
    };
});
