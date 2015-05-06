export var pan = function () {
    const maxT = 1000;
    var lastX, lastY;

    return function (point, cb) {
        var [x, y] = point;

        if (lastX && window.requestAnimationFrame) {
            var start = 0;
            var deltaX = x - lastX, deltaY = y - lastY;

            window.requestAnimationFrame(function step(t) {
                if (!start) start = t;

                var deltaT = Math.min(1, (t - start) / maxT);
                deltaT = 1-(--deltaT)*deltaT*deltaT*deltaT
                //deltaT *= (2 - deltaT); // ease-out

                var x = lastX + deltaX * deltaT;
                var y = lastY + deltaY * deltaT;
                cb(x, y);

                if (deltaT < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    lastX = x;
                    lastY = y;
                }
            });
        } else {
            cb(x, y);
            lastX = x;
            lastY = y;
        }
    };
};
