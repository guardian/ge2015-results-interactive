import reqwest from 'reqwest'
import { Seatstack } from './components/seatstack'
import { HourByHour } from './components/hourbyhour'
import { CartogramLite } from './components/cartogram-lite'
import { Coalitions } from './components/coalitions'

class ElectionSnap {
    constructor(el, dataUrl) {
        this.el = el;
        this.dataUrl = dataUrl;

        this.seatstack = new Seatstack(el.querySelector('#seatstack'), () => null);
        //this.analysis = new HourByHour(el.querySelector('#analysis'));
        this.analysis = new CartogramLite(el.querySelector('#analysis'));
        //this.analysis = new Coalitions(el.querySelector('#analysis'));

        window.setInterval(this.fetchDataAndRender.bind(this), 5000);
        this.fetchDataAndRender();
    }

    fetchDataAndRender() {
        reqwest({
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            success: function(data) {
                this.seatstack.render(data);
                this.analysis.render(data);
            }.bind(this)
        });
    }
}

(function () {
    var dataUrl = 'mega.json';
    // var dataUrl = 'http://s3.amazonaws.com/gdn-cdn/2015/05/election/datatest/liveresults.json';

    new ElectionSnap(document.querySelector('#election-snap'), dataUrl);
})();
