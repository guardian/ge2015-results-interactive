import template from './templates/details.html!text'
import swig from 'swig'
import { relativeDates } from '../lib/relativedate'

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
    constructor(el, options) {
        this.el = el;
        this.options = options;
        this.initEventHandlers();
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

            var verb = e.winningParty === e.sittingParty ? 'hold' : 'gain';
            var fromParty = verb === 'gain' ? ` from ${partyName(e.sittingParty)}` : '';
            var how = e.percentageMajority ? `with a ${e.percentageMajority.toFixed(1)}% majority` : '';
            var turnout = e.percentageTurnout ? `, ${e.percentageTurnout.toFixed(0)}% turnout` : '';

            return `${partyName(e.winningParty)} ${verb}${fromParty} ${how}${turnout}`
        } else {
            return 'Result pending'
        }
    }

    get twitterShareText() {
        var c = this.constituenciesById[this.selectedConstituency];
        var e = c['2015']

        var verb = e.winningParty === e.sittingParty ? 'hold' : 'gain';
        var fromParty = verb === 'gain' ? ` from ${e.sittingParty}` : '';
        var how = e.percentageMajority ? `with a ${e.percentageMajority.toFixed(1)}% majority` : '';

        return `${c.name} - ${e.winningParty} ${verb}${fromParty} ${how} - ${this.options.share_url}#c=${this.selectedConstituency}`;
    }

    get twitterShareUrl() {
        var c = this.constituenciesById[this.selectedConstituency];
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.twitterShareText)}`;
    }

    get facebookShareUrl() {
        var facebookParams = [
            ['display', 'popup'],
            ['app_id', '741666719251986'],
            ['link', encodeURIComponent(this.options.share_url)],
            ['redirect_uri', 'http://www.facebook.com']
        ];
        var queryString = facebookParams.map(pair => pair.join('=')).join('&');
        return 'https://www.facebook.com/dialog/feed?' + queryString;
    }

    initEventHandlers() {
        // share buttons
        this.el.addEventListener('click', function(evt) {
            if (/button/i.test(evt.target.nodeName)) {
                if (evt.target.getAttribute('data-source') === 'facebook') {
                    window.open(this.facebookShareUrl, 'share', 'width=600,height=200');
                } else if (evt.target.getAttribute('data-source') === 'twitter') {
                    window.open(this.twitterShareUrl, 'share', 'width=600,height=200');
                }
            }
        }.bind(this))
    }

    hide() {
        this.selectedConstituency = null;
        this.el.className = 'veri__details';
    }
}