import template from './templates/hourbyhour.html!text'
import swig from 'swig'
const templateFn = swig.compile(template);

export class HourByHour {
    constructor(el) {
        this.el = el;
        this.el.innerHTML = templateFn();
    }

    tick() {}
    update(data) {
        this.el.style.visibility = 'visible';
    }
}
