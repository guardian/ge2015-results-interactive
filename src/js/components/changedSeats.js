import template from './templates/byConstituency.html!text'
import tickerTemplate from './templates/byConstituencyTicker.html!text'
import hotseats from '../data/hotseats.json!json'
import swig from 'swig'
import { CartogramLite } from './cartogram-lite';

const templateFn = swig.compile(template);
const tickerTemplateFn = swig.compile(tickerTemplate);

const hotseatsById = {};
hotseats.forEach(s => hotseatsById[s.id] = s)

function getHotseatVerb(cons) {
    var hotseat = hotseatsById[cons.ons_id];
    if (hotseat.party === cons.sitting) { // incumbent
        return hotseat.party === cons.winning ? 'holds' : 'loses';
    } else { // challenger
        return hotseat.party === cons.winning ? 'wins' : 'fails to take';
    }
}

export class ChangedSeats {
    constructor(el) {
        this.el = el;
        this.el.innerHTML = templateFn();

        this.before = new CartogramLite(el.querySelector('#by-constituency__before'));
        this.after = new CartogramLite(el.querySelector('#by-constituency__after'));
        this.time = el.querySelector('.by-constituency__time');
        this.text = el.querySelector('.by-constituency__text');

        this.interesting = [];
        this.interestingI = 0;
        this.firstUpdate = true;
    }

    focusConstituency(ons_id) {
        this.before.focusConstituency(ons_id);
        this.after.focusConstituency(ons_id);
    }

    tick() {
        var how, cons = this.interesting[this.interestingI++ % this.interesting.length];
        if (!cons) return;

        try {
            how = cons.swing < 20 ? `with a ${cons.majority.toFixed(1)}% majority` : `with a ${cons.swing.toFixed(1)}% swing`;
        } catch (e) {
            how = '';
        }
        if (cons.reason === 'hot') {
            var verb = getHotseatVerb(cons);
            var hotseat = hotseatsById[cons.ons_id];
            if (verb === 'fails to take') how = '';

            this.text.innerHTML = tickerTemplateFn({
                'party': hotseat.party,
                'winner': hotseat.candidate,
                'to': verb === 'loses' ? cons.winning : '',
                'verb': verb,
                'name': cons.name,
                'how': how
            });
        } else {
            this.text.innerHTML = tickerTemplateFn({
                'party': cons.winning,
                'winner': cons.winning,
                'loser': cons.sitting,
                'verb': cons.winning === cons.sitting ? 'hold' : 'win',
                'name': cons.name,
                'how': how
            });
        }

        this.time.innerHTML = cons.updated;
        this.focusConstituency(cons.ons_id);
    }

    update(data) {
        var currentlyInteresting = this.interesting.reduce((s, c) => s + c.ons_id, '');
        var newlyInteresting = data.interesting.reduce((s, c) => s + c.ons_id, '');

        if (newlyInteresting !== currentlyInteresting) {
            this.interesting = data.interesting;
            this.interestingI = 0;
        }

        data.constituencies.forEach(function (cons) {
            this.before.setConstituencyParty(cons.ons_id, cons.sitting);
            this.after.setConstituencyParty(cons.ons_id, cons.winning);
        }.bind(this));

        if (this.firstUpdate) {
            window.setInterval(() => this.tick(), 4000);
            this.tick();

            this.el.style.visibility = 'visible';
            this.firstUpdate = false;
        }
    }
}
