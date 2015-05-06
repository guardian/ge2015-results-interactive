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

export class ByConstituency {
    constructor(el) {
        this.el = el;
        this.el.innerHTML = templateFn();

        this.before = new CartogramLite(el.querySelector('#by-constituency__before'));
        this.after = new CartogramLite(el.querySelector('#by-constituency__after'));
        this.time = el.querySelector('#by-constituency__time');
        this.text = el.querySelector('#by-constituency__text');

        this.interesting = [];
        this.firstUpdate = true;
    }

    focusConstituency(ons_id) {
        this.before.focusConstituency(ons_id);
        this.after.focusConstituency(ons_id);
    }

    tick() {
        if (this.interesting.length === 0) {
            this.interesting = this.lastInteresting;
        }

        var cons = this.interesting.shift();
        var how = cons.swing < 30 ? `with a ${cons.majority}% majority` : `with a ${cons.swing}% swing`;
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
                'verb': cons.winning === cons.sitting ? 'hold' : 'win',
                'name': cons.name,
                'how': how
            });
        }

        this.time.innerHTML = cons.updated;
        this.focusConstituency(cons.ons_id);
    }

    update(data) {
        var alreadyInteresting = this.interesting.map(c => c.ons_id);
        var newlyInteresting = data.interesting.filter(c => alreadyInteresting.indexOf(c.ons_id) === -1);
        this.interesting = this.interesting.concat(newlyInteresting);

        data.constituencies.forEach(function (cons) {
            this.before.setConstituencyParty(cons.ons_id, cons.sitting);
            this.after.setConstituencyParty(cons.ons_id, cons.winning);
        }.bind(this));

        // Store in case client's internet drops
        this.lastInteresting = data.interesting;

        if (this.firstUpdate) {
            this.tick();
            this.el.style.visiblity = 'visible';
            this.firstUpdate = false;
        }
    }
}
