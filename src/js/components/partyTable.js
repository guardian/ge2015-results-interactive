import template from './templates/partyTable.html!text'
import swig from 'swig'

swig.setFilter('commas', function(input) {
    input = typeof input === 'string' ? input : input.toString();
    var parts = [];
    for (var i = input.length - 3; i >= 0; i-=3) parts.unshift(input.substr(i, 3));
    var firstPos = input.length % 3;
    if (firstPos) parts.unshift(input.substr(0, input.length % 3));
    return parts.join(',');
});

const templateFn = swig.compile(template)

export class PartyTable {
    constructor(el, options) {
        this.el = el;
        this.options = options;
    }
    render(data) {
        var sortedParties = data.overview.parties
            .filter(p1 => p1.votes > 0)
            .sort((p1,p2) => (p1.seats - p2.seats) || (p1.votes - p2.votes)).reverse();
        this.el.innerHTML = templateFn({parties: sortedParties});
    }
}
