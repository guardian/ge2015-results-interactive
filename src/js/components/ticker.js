import template from './templates/ticker.html!text'
import swig from 'swig'
import { relativeDates } from '../lib/relativedate'
import hotseats from '../data/hotseats.json!json'

const templateFn = swig.compile(template)

const hotseatsById = new Map()
hotseats.map(s => [s.id, s]).forEach(v => hotseatsById.set(v[0],v[1]))

function getHotseatVerb(constituency) {
	var e = constituency['2015']
	var hotseat = hotseatsById.get(constituency.ons_id);
	if (hotseat.party === e.sittingParty) { // incumbent
		return hotseat.party === e.winningParty ? 'holds' : 'loses';
	} else { // challenger
		return hotseat.party === e.winningParty ? 'wins' : 'fails to take';
	}
}

function processEvent(constituency) {
	var e = constituency['2015']
	var hotseat = hotseatsById.get(constituency.ons_id);

	return {
		id: constituency.ons_id,
		name: constituency.name,

		hotseat: !!hotseat,
		hotseatCandidate: hotseat && hotseat.candidate,
		hotseatParty: hotseat && hotseat.party,
		hotseatVerb: hotseat && getHotseatVerb(constituency),

		winningParty: e.winningParty,
		sittingParty: e.sittingParty,
		swing: e.swing,
		percentageMajority: e.percentageMajority,
		verb: e.winningParty === e.sittingParty ? 'hold' : 'win',
		how: e.swing > 20 ? `with a ${e.swing.toFixed(1)}% swing` : `with a ${e.percentageMajority.toFixed(1)}% majority`,
		updated: e.updated
	};
}

export class Ticker {
	constructor(el, opts) {
		this.el = el;
		this.opts = opts;
		this.onHover = opts.onHover;
		this.onClick = opts.onClick;
	}

	render(data) {
		if (data.length) {
			this.el.innerHTML = '<ul class="veri__ticker">'
			var listEl = this.el.querySelector('.veri__ticker')
			data
				.map(constituency => processEvent(constituency))
				.map(entry => this.createTickerEntryElement(entry))
				.forEach(el => listEl.appendChild(el))
			relativeDates(this.el);
		} else {
			this.el.innerHTML = '<div class="veri__empty-ticker">Awaiting results</div>';
		}
	}

	createTickerEntryElement(entry) {
		var tmp = document.createElement('div');
		tmp.innerHTML = templateFn({entry: entry});
		var el = tmp.children[0]
		var link = el.querySelector('.veri__ticker-msg')
		if (this.onHover) {
			el.addEventListener('mouseenter', () => this.onHover(entry))
			el.addEventListener('mouseleave', () => this.onHover(null))
		}
		link.addEventListener('click', function(e) {
			e.preventDefault();
			this.onClick(entry.id)
		}.bind(this));
		return el;
	}
}
