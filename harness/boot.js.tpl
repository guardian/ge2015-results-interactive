'use strict';
define(['load-main'], function(loadMain) {
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
            });
        }
    };
});
