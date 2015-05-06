import template from './templates/byConstituency.html!text'
import swig from 'swig'
import { CartogramLite } from './cartogram-lite';

const templateFn = swig.compile(template);

const textTemplates = {
    'bigswing': swig.compile('{{winning}} win {{name}} with a {{swing}}% swing'),
    'marginal': swig.compile('{{winning}} win <strong>{{name}}</strong> with a {{percentage}}% majority'),
    'hotseat': swig.compile('{{person}} {{verb}} <strong>{{name}}</strong> with a {{percentage}}% majority')
};

export class ByConstituency {
    constructor(el) {
        this.el = el;
        this.el.innerHTML = templateFn();

        this.before = new CartogramLite(el.querySelector('#by-constituency__before'));
        this.after = new CartogramLite(el.querySelector('#by-constituency__after'));
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

        var constituency = this.interesting.shift();
        this.text.innerHTML = textTemplates.marginal(constituency);
        this.focusConstituency(constituency.ons_id);
    }

    update(data) {
        var alreadyInteresting = this.interesting.map(c => c.ons_id);
        var newlyInteresting = data.interesting.filter(c => alreadyInteresting.indexOf(c.ons_id) === -1);
        this.interesting = this.interesting.concat(newlyInteresting);

        data.constituencies.forEach(function (constituency) {
            this.before.setConstituencyParty(constituency.ons_id, constituency.sitting);
            this.after.setConstituencyParty(constituency.ons_id, constituency.winning);
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
