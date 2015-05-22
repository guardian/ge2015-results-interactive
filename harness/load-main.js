define(function () {
    return function loadMain(moduleId, baseURL, cb) {
        var systemLoad = function (System) {
            // https://github.com/systemjs/systemjs/issues/461
            // Restore old require
            window.require = require;

            // TODO: Use System.clone
            // https://github.com/systemjs/systemjs/issues/457
            System.paths['main'] = baseURL + moduleId + '.js';
            System.paths['interactive-traceur-runtime'] = baseURL + 'traceur-runtime' + '.js';
            // Annoyingly Traceur runtime is not bundled, so we load it
            // manually
            // https://github.com/systemjs/systemjs/issues/431
            System.import('interactive-traceur-runtime').then(function () {
                window.System = System;
                System.import('main').then(cb);
            });
        };

        var require = window.require;

        // New frontend
        var isSystemJs = !! window.System;
        // Frontend (poor heuristic but version is static)
        var isCurl = window.require.version === "0.8.10";
        // Mobile apps
        var isRequireJs = !! (window.require && ! isCurl);

        var moduleLoader = isSystemJs ? 'systemjs' : (isCurl ? 'curl' : (isRequireJs ? 'requirejs' : null));

        // MIGRATE TO SYSTEMJS AND DEPRECATE OLD MODULE LOADERS ASAP
        switch (moduleLoader) {
            case 'systemjs':
                systemLoad(window.System);
                break;
            case 'curl':
                // https://github.com/systemjs/systemjs/issues/461
                window.require = undefined;

                // document.write is broken in async, so load ES6 module loader manually
                require(['js!' + baseURL + 'es6-module-loader'], function () {
                    require(['js!' + baseURL + 'system!exports=System'], systemLoad);
                });
                break;
            case 'requirejs':
                // https://github.com/systemjs/systemjs/issues/461
                window.require = undefined;

                var shim = {};
                shim[baseURL + 'system.js'] = { exports: 'System' };
                require.config({ shim: shim });

                // document.write is broken in async, so load ES6 module loader manually
                require([baseURL + 'es6-module-loader.js'], function () {
                    require([baseURL + 'system.js'], systemLoad);
                });
                break;
            default:
                throw new Error('No module loader found');
                break;
        }
    };
})