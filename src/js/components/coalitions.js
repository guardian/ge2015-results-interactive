import template from './templates/coalitions.html!text'
import swig from 'swig'
const templateFn = swig.compile(template);

export class Coalitions {
    constructor(el) {
        this.el.innerHTML = templateFn();
    }

    tick() {
        // TODO: scroll coalitions
    }

    update(data) {}
}
