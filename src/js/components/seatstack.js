import template from './templates/seatstack.html!text'
import swig from 'swig'
const templateFn = swig.compile(template)

function data2context(data) {
	var partyData = data.seatstack.parties;
	return {
		partyData: partyData,
		resultCount: data.seatstack.resultCount,
		partyListLeft: partyData.slice(0,3),
		partyListRight: partyData.slice(4)
	};
}

export class Seatstack {
	constructor(el, hoverFn) {
		this.el = el;

		this.el.addEventListener('mouseover', function(evt) {
			var partyName = evt.target.getAttribute('data-partyhover') || evt.target.parentElement.getAttribute('data-partyhover')
			if (partyName) hoverFn(partyName.toLowerCase());
		});

		this.el.addEventListener('mouseout', function(evt) {
			var partyName = evt.target.getAttribute('data-partyhover') || evt.target.parentElement.getAttribute('data-partyhover')
			if (partyName) hoverFn(null);
		});

	}
	render(data) {
		this.el.innerHTML = templateFn(data2context(data));
	}
}
