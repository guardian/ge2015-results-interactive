import template from './templates/hourbyhour.html!text'
import swig from 'swig'
const templateFn = swig.compile(template);

export class HourByHour {
    constructor(el) {
        el.innerHTML = templateFn();
    }

    tick() {}
    update(data) {}
}
