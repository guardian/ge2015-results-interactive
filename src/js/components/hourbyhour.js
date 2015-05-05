import template from './templates/hourbyhour.html!text'
import swig from 'swig'
const templateFn = swig.compile(template);

export class HourByHour {
    constructor(el) {
        this.el = el;
    }

    render(data) {
        this.el.innerHTML = templateFn(data);
    }
}
