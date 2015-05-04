import template from './templates/details.html!text'
import swig from 'swig'
import { relativeDates } from '../lib/relativedate'

swig.setFilter('pad', function(input, amnt) {
    var padding = amnt - input.toFixed(0).length;
    return (padding > 0 ? (new Array(padding+1)).join('0') : '') + input;
})

swig.setFilter('commas', function(input) {
    input = typeof input === 'string' ? input : input.toString();
    var parts = [];
    for (var i = input.length - 3; i >= 0; i-=3) parts.unshift(input.substr(i, 3));
    var firstPos = input.length % 3;
    if (firstPos) parts.unshift(input.substr(0, input.length % 3));
    return parts.join(',');
});

const templateFn = swig.compile(template)

function data2context(data) {

    var partiesByName = {};
    data.overview.parties.forEach(p => partiesByName[p.name] = p)
    var totalSeatsWon = data.overview.parties.map(p => p.seats).reduce((a,b) => a+b)

    var parties = ['Lab', 'SNP', 'Green', 'Others', 'Pending', 'UKIP', 'LD', 'Con'];
    var selectedPartySeatCount = parties
        .filter(name => name !== 'Others' && name !== 'Pending')
        .map(name => partiesByName[name].seats)
        .reduce((a,b) => a + b )

    partiesByName.Others = { seats: totalSeatsWon - selectedPartySeatCount }
    partiesByName.Pending = { seats: 650 - totalSeatsWon }

    return {
        seatstack: parties.map(function(name){
            return {name: name, seats: partiesByName[name].seats };
        })
    };
}

export class Details {
    constructor(el) {
        this.el = el;
    }
    render(data) {
        var constituenciesById = this.constituenciesById = {};
        data.constituencies.forEach(c => constituenciesById[c.ons_id] = c)
        if (this.selectedConstituency) this.selectConstituency(this.selectedConstituency);
        else this.el.className = 'veri__details';
    }

    selectConstituency(constituencyId) {
        this.selectedConstituency = constituencyId;
        if (constituencyId) {
            this.el.innerHTML = templateFn({
                msgFn: this.generateResultHTML,
                constituency: this.constituenciesById[constituencyId],
                updated: this.constituenciesById[constituencyId]['2015'].updated
            });
            relativeDates(this.el);
        }
        this.el.className = 'veri__details' + (constituencyId ? ' veri__details--show' : '');
    }

    generateResultHTML(constituency) {
        var c = constituency;
        if (c['2015'].winningParty) {
            var partyName = (party) =>
                `<strong>${party}</strong>`

            var e = c['2015']

            var verb = e.winningParty === e.sittingParty ? 'holds' : 'gains';
            var fromParty = verb === 'gains' ? ` from ${partyName(e.sittingParty)}` : '';
            var how = e.percentageMajority ? `with a ${e.percentageMajority.toFixed(1)}% majority` : '';
            var turnout = e.percentageTurnout ? `, ${e.percentageTurnout.toFixed(0)}% turnout` : '';

            return `${partyName(e.winningParty)} ${verb}${fromParty} ${how}${turnout}`
        } else {
            return 'Result pending'
        }
    }

    initEventHandlers() {
        // 741666719251986
        // 'https://www.facebook.com/dialog/feed?display=popup&app_id=741666719251986&link=http%3A%2F%2Fgu.com%2Fp%2F464t6&picture=&redirect_uri=http://www.theguardian.com'
        // 'https://twitter.com/intent/tweet?text=The%20Guardian%20poll%20projection%20http%3A%2F%2Fgu.com%2Fp%2F464t6%0ACON%20274%20seats%20%7C%20LAB%20270%20%7C%20SNP%2054%20%7C%20LD%2027%20%7C%20Ukip%203%20%7C%20Green%201%0A3%20days%20to%20%23GE2015%20&source=webclient'
        // var params = {
        //     display: 'popup',
        //     app_id: '741666719251986',
        // }
    }

    hide() {
        this.selectedConstituency = null;
        this.el.className = 'veri__details';
    }
}