import bowser from 'ded/bowser';

export class TimeSlider {
	constructor(el, callback) {
        if (bowser.msie && bowser.version <= 9 || bowser.firefox) return;

		this.el = el;
		el.innerHTML = '<input type="range" min="0" max="1000" value="1000" step="1" />';
		this.input = el.querySelector('input');

		this.input.addEventListener('input', function() {
			callback(this.getSelectedTime());
		}.bind(this)); // TODO: IE
	}

	getSelectedTime() {
		var fromStart = (this.input.value / 1000) * this.range;
		return new Date(this.startTime + fromStart);
	}

	render(data) {
		this.times = data.constituencies.map(c => c['2015'].updated).filter(t => t).sort();
		this.startTime = Date.parse(this.times[0]);
		this.endTime = Date.parse(this.times[this.times.length-1]);
		this.range = this.endTime - this.startTime;
	}
}
