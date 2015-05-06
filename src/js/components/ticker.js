import template from './templates/ticker.html!text'
import swig from 'swig'
import { relativeDates } from '../lib/relativedate'
import hotseats from '../data/hotseats.json!json'

const templateFn = swig.compile(template)

const hotseatsById = new Map(hotseats.map(s => [s.id, s]))

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
		how: e.swing < 30 ? `with a ${e.percentageMajority.toFixed(1)}% majority` : `with a ${e.swing.toFixed(1)}% swing`,
		updated: e.updated
	};
}

export class Ticker {
	constructor(el, onClick, onHover) {
		this.el = el;
		this.onHover = onHover;
		this.onClick = onClick;
	}

	render(data) {
		this.el.innerHTML = '<ul class="veri__ticker">'
		var listEl = this.el.querySelector('.veri__ticker')
		data
			.map(constituency => processEvent(constituency))
			.map(entry => this.createTickerEntryElement(entry))
			.forEach(el => listEl.appendChild(el))
		relativeDates(this.el);
	}

	createTickerEntryElement(entry) {
		var tmp = document.implementation.createHTMLDocument();
		tmp.body.innerHTML = templateFn({entry: entry});
		var el = tmp.body.children[0]
		el.addEventListener('mouseenter', () => this.onHover(entry))
		el.addEventListener('mouseleave', () => this.onHover(null))
		el.addEventListener('click', () => this.onClick(entry.id))
		return el;
	}
}
