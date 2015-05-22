define(function () {
    return function (baseURL, cb) {
        var require = window.require;

        // New frontend
        var isSystemJs = !! window.System;
        // Mobile apps
        var isRequireJs = !! window.requirejs;
        // Frontend
        var isCurl = !! (window.require && ! isRequireJs);

        var moduleLoader = isSystemJs ? 'systemjs' : (isCurl ? 'curl' : (isRequireJs ? 'requirejs' : null));

        switch (moduleLoader) {
            case 'systemjs':
                cb(window.System);
                break;
            case 'curl':
                // https://github.com/systemjs/systemjs/issues/461
                window.require = undefined;

                // We assume curl has the js plugin built in
                // document.write is broken in async, so load ES6 module loader manually
                require(['js!' + baseURL + '/es6-module-loader'], function () {
                    require(['js!' + baseURL + '/system!exports=System'], function (System) {
                        // https://github.com/systemjs/systemjs/issues/461
                        // Restore old require
                        window.require = require;
                        cb(System);
                    });
                });
                break;
            case 'requirejs':
                // https://github.com/systemjs/systemjs/issues/461
                window.require = undefined;

                var shim = {};
                shim[baseURL + '/system.js'] = { exports: 'System' };
                require.config({ shim: shim });

                // document.write is broken in async, so load ES6 module loader manually
                require([baseURL + '/es6-module-loader.js'], function () {
                    require([baseURL + '/system.js'], function (System) {
                        // https://github.com/systemjs/systemjs/issues/461
                        // Restore old require
                        window.require = require;
                        cb(System);
                    });
                });
                break;
            default:
                throw new Error('No module loader found');
                break;
        }
    };
})