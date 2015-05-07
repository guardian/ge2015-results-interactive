export function removeClass(el, className) {
    if (el.classList) el.classList.remove(className);
    else el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
}

export function addClass(el, className) {
    if (el.classList) el.classList.add(className);
    else el.className += ' ' + className;
}

export function throttle(callback, limit) {
    var wait = false;
    return function () {
        if (!wait) {
            wait = true;
            setTimeout(function () {
                wait = false;
                callback.call();
            }, limit);
        }
    }
}