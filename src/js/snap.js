import reqwest from 'reqwest'
import { Seatstack } from './components/seatstack';

class ElectionSnap {
    constructor(el, dataUrl) {
        this.el = el;
        this.dataUrl = dataUrl;
        this.seatstack = new Seatstack(el.querySelector('#seatstack'), () => null);

        window.setInterval(this.fetchDataAndRender.bind(this), 5000);
        this.fetchDataAndRender();
    }

    fetchDataAndRender() {
        reqwest({
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            success: function(data) {
                Object.keys(this.components).forEach(key => this.components[key].render(data));
                iframeMessenger.resize();
            }.bind(this)
        });
    }
}

(function () {
    var dataUrl = 'mega.json';
    // var dataUrl = 'http://s3.amazonaws.com/gdn-cdn/2015/05/election/datatest/liveresults.json';

    new ElectionSnap(document.querySelector('#election-snap'), dataUrl);
})();
