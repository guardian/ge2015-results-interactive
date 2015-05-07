import reqwest from 'reqwest'
import { Seatstack } from './components/seatstack'
import { HourByHour } from './components/hourbyhour'
import { ByConstituency } from './components/byconstituency'
import { Coalitions } from './components/coalitions'

class ElectionSnap {
    constructor(el, dataUrl) {
        this.el = el;
        this.dataUrl = dataUrl;

        this.seatstack = new Seatstack(el.querySelector('#seatstack'), () => null);
        //this.analysis = new HourByHour(el.querySelector('#analysis'));
        this.analysis = new ByConstituency(el.querySelector('#analysis'));
        //this.analysis = new Coalitions(el.querySelector('#analysis'));

        //window.setInterval(() => this.fetchDataAndRender(), 5000);
        this.fetchDataAndRender();
    }

    fetchDataAndRender() {
        reqwest({
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            success: function(data) {
                this.seatstack.render(data);
                this.analysis.update(data);
            }.bind(this)
        });
    }
}

(function () {
    var dataUrl = 'http://interactive.guim.co.uk/thrashers/election-snap/frontpage.json';
    // var dataUrl = 'http://s3.amazonaws.com/gdn-cdn/2015/05/election/datatest/liveresults.json';

    new ElectionSnap(document.querySelector('#election-snap'), dataUrl);
})();
