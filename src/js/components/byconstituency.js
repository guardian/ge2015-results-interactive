import template from './templates/byConstituency.html!text'
import swig from 'swig'
import { CartogramLite } from './cartogram-lite';

const templateFn = swig.compile(template);

export class ByConstituency {
    constructor(el) {
        el.innerHTML = templateFn();
        this.before = new CartogramLite(el.querySelector('#by-constituency__before'));
        this.after = new CartogramLite(el.querySelector('#by-constituency__after'));

        // testing
        var ons_ids = ['S14000027', 'N06000003', 'E14000576', 'W07000064'];
        i = 0;
        setInterval(() => this.focusConstituency(ons_ids[i++ % 4]), 3000);
        this.focusConstituency(ons_ids[i++]);
    }

    focusConstituency(ons_id) {
        this.before.focusConstituency(ons_id);
        this.after.focusConstituency(ons_id);
    }
}
