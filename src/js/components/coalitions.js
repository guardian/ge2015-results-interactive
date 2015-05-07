import template from './templates/coalitions.html!text'
import swig from 'swig'
const templateFn = swig.compile(template);

const coalitions = [
    {
        'parties': ['Lab', 'SNP'],
        'copy': 'Lab and the SNP would have the numbers to win a confidence vote'
    },
    {
        'parties': ['Con', 'LD'],
        'copy': 'The current governing Con/LD coalition could not form a stable government'
    },
    {
        'parties': ['Lab', 'SNP', 'SDLP', 'PC', 'Green'],
        'copy': 'An anti-Tory bloc (Lab, SNP, SDLP, PC, Green) would vote down a Conservative government'
    },
    {
        'parties': ['Lab', 'LD'],
        'copy': 'Labour and the Lib Dems fall well short of a majority'
    },
    {
        'parties': ['Lab', 'SNP', 'LD'],
        'copy': 'Labour, the SNP and the Lib Dems would secure a comfortable majority',
    },
    {
        'parties': ['Con', 'LD', 'DUP', 'UKIP'],
        'copy': 'Even with support from the DUP and Ukip, the current Con/LD coalition could not form a government'
    }
];


export class Coalitions {
    constructor(el) {
        this.el = el;
        this.i = 0;
        this.partySeats = {};
        this.tick();
    }

    tick() {
        this.el.innerHTML = templateFn({
            'seats': function (parties) {
                var total = parties.reduce((seats, p) => seats + this.partySeats[p], 0);
                return total ? `${total} seats` : '';
            }.bind(this),
            'data': coalitions[this.i++ % coalitions.length]
        });

        if (this.timeout) {
            window.clearTimeout(this.timeout);
        }
        this.timeout = window.setTimeout(() => this.tick(), 6000);
    }

    update(data) {
        this.el.style.visibility = 'visible';
        data.seatstack.parties.forEach(function (party) {
            this.partySeats[party.name] = party.seats;
        }.bind(this));
    }
}
