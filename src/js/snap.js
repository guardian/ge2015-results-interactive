import reqwest from 'reqwest'
import { Seatstack } from './components/seatstack'
import { HourByHour } from './components/hourbyhour'
import { ByConstituency } from './components/byconstituency'
import { Coalitions } from './components/coalitions'

class ElectionSnap {
    constructor(el, dataUrl) {
        this.dataUrl = dataUrl;

        this.left = el.querySelector('.snap__left-pane');

        this.seatstack = new Seatstack(el.querySelector('#seatstack'), () => null);
        //this.analysis = new HourByHour(el.querySelector('#analysis'));
        this.analysis = new ByConstituency(el.querySelector('#analysis'));
        //this.analysis = new Coalitions(el.querySelector('#analysis'));

        window.setInterval(() => this.fetchDataAndRender(), 5000);
        this.fetchDataAndRender();
    }

    fetchDataAndRender() {
        reqwest({
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            success: function(data) {
                this.left.style.visibility = 'visible';
                this.seatstack.render(data);
                this.analysis.update(data);
            }.bind(this)
        });
    }
}

(function () {
    var dataUrl = 'http://visuals.guim.co.uk/2015/05/election/datatest/frontpage.json';
    setTimeout(() => new ElectionSnap(document.querySelector('#election-snap'), dataUrl), 1);
})();
