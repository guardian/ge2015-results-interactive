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

        window.setInterval(() => this.fetchDataAndRender(), 20000);
        this.fetchDataAndRender();
    }

    fetchDataAndRender() {
        reqwest({
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            success: function(data) {
                reqwest({
                    url: 'http://visuals.guim.co.uk/2015/05/election/data/keyseats.json',
                    type: 'json',
                    crossOrigin: true,
                    success: function (interesting) {
                        data.interesting = interesting.interesting.filter(i => i);
                        console.log(data.interesting);
                        this.left.style.visibility = 'visible';
                        this.seatstack.render(data);
                        this.analysis.update(data);

                        if (data.seatstack.resultCount === 650) {
                            this.left.querySelector('h2').textContent = 'Full results';
                        }
                    }.bind(this)
                });
            }.bind(this)
        });
    }
}

(function () {
    var dataUrl = 'http://visuals.guim.co.uk/2015/05/election/data/frontpage.json';
    setTimeout(() => new ElectionSnap(document.querySelector('#election-snap'), dataUrl), 1);
})();
