import moment from 'moment'
import qwery from 'qwery'

var offset = 0;

export function relativeDate(el) {
	var now = moment().add(offset, 'milliseconds');
	el.textContent = moment(el.getAttribute('datetime')).from(now);
}

export function relativeDates(el) {
	qwery('.veri__relative-date', el).forEach(relativeDate)
}

export function setCurrentTime(date) {
	var systemClock = new Date();
	offset = date - systemClock;
}
