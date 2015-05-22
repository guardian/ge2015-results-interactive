'use strict';
define(['polyfill-systemjs'], function(polyfillSystemJs) {
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

            var baseURL = '<%= assetPath %>';
            var moduleId = 'main';
            polyfillSystemJs(baseURL, function (System) {
                // TODO: Use System.clone
                // https://github.com/systemjs/systemjs/issues/457
                System.paths['main'] = baseURL + '/' + moduleId + '.js';
                System.paths['interactive-traceur-runtime'] = baseURL + '/traceur-runtime' + '.js';
                // Annoyingly Traceur runtime is not bundled, so we load it
                // manually
                // https://github.com/systemjs/systemjs/issues/431
                System.import('interactive-traceur-runtime').then(function () {
                    // Traceur runtime overrides window.System
                    // https://github.com/systemjs/builder/issues/169#issuecomment-103933246
                    window.System = System;
                    System.import(moduleId).then(function (main) {
                        main.default.init(el, context, config, mediator);
                    });
                });
            });
        }
    };
});
