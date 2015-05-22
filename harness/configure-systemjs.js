define(function () {
    return function (baseURL, moduleId, System) {
        // TODO: Use System.clone
        // https://github.com/systemjs/systemjs/issues/457
        System.paths['main'] = baseURL + '/' + moduleId + '.js';
        System.paths['interactive-traceur-runtime'] = baseURL + '/traceur-runtime' + '.js';
        return System;
    };
});
