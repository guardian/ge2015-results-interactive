import reqwest from 'reqwest'
import { Seatstack } from './components/seatstack'
// import { HourByHour as Analysis } from './components/hourbyhour'
import { ByConstituency as Analysis } from './components/byconstituency'
// import { Coalitions as Analysis } from './components/coalitions'

class ElectionSnap {
    constructor(el, dataUrl) {
        this.dataUrl = dataUrl;

        this.left = el.querySelector('.snap__left-pane');

        this.seatstack = new Seatstack(el.querySelector('#seatstack'), () => null);
        this.analysis = new Analysis(el.querySelector('#analysis'));

        window.setInterval(() => this.fetchDataAndRender(), 10000);
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
    var dataUrl = 'http://visuals.guim.co.uk/2015/05/election/data/frontpage.json';
    setTimeout(() => new ElectionSnap(document.querySelector('#election-snap'), dataUrl), 1);
})();
