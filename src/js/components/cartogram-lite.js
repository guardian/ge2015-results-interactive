import hexagonsTopo from '../data/hexagons-topo.json!json'
import topojson from 'mbostock/topojson'

const svgns = "http://www.w3.org/2000/svg";

// http://en.wikipedia.org/wiki/Universal_Transverse_Mercator_coordinate_system
const a = 6378.137, f = 1/298.257223563;
const N0 = 0, E0 = 500, k0 = 0.9996;
const n = f / (2 - f);
const n2 = n*n, n3 = n*n2, n4 = n*n3;
const t_part = 2 * Math.sqrt(n)/(1 + n);
const A = a/(1+n) * (1 + 1/4*n2 + 1/64*n4);
const zone = 30;
const λ0 = rad(zone * 6 - 183);
const k0A = k0 * A;

function rad(d) { return d * Math.PI / 180; }
function utm(lat, lon) {
    var φ = rad(lat);
    var λ = rad(lon) - λ0;

    var sinφ = Math.sin(φ);
    var t = Math.sinh(Math.atanh(sinφ) - t_part * Math.atanh(t_part * sinφ));

    var E = E0 + k0A*Math.atanh(Math.sin(λ)/Math.sqrt(1 + t*t));
    var N = N0 + k0A*Math.atan(t/Math.cos(λ));
    return [E, -N];
}

function centroid(points) {
    return points.reduce((a, b) => [a[0] + b[0], a[1] + b[1]]).map((c) => c / points.length);
}

var focusPoint = function () {
    const maxT = 1000;
    var lastX, lastY;

    return function (point, cb) {
        var x = point[0], y = point[1];

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

export class CartogramLite {
    constructor(el) {
        var svg = document.createElementNS(svgns, 'svg');
        svg.setAttribute('viewBox', '-100 -100 200 200');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

        var defs = document.createElementNS(svgns, 'defs');
        defs.innerHTML = [
            '<pattern id="hhogl" patternUnits="userSpaceOnUse" width="4" height="4">',
                '<rect width="4" height="4" fill="#e1e1e1"></rect>',
                '<path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke-width="1" shape-rendering="auto" stroke="#aaa" stroke-linecap="square"></path>',
            '</pattern>'].join('');
        svg.appendChild(defs);

        var scaleG = document.createElementNS(svgns, 'g'),
            constituencyGroup = document.createElementNS(svgns, 'g');

        scaleG.setAttributeNS(null, 'transform', 'scale(1)');

        var constituencies = {};
        var features = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexagons).features;
        features.forEach(function (feature) {
            var coordinates = feature.geometry.coordinates;
            // When there are multiple polygons for a constituency the coordinates have
            // another dimension of unit length arrays, no time to work out why!
            if (coordinates.length > 1) {
                coordinates = Array.prototype.concat.apply([], coordinates.map((s) => s));
            }

            var shapes = coordinates.map(function (cs) {
                var points = cs.map((c) => utm(c[1], c[0]));

                var path = 'M' + points.map((p) => p.join(',')).join('L') + 'Z';
                var el = document.createElementNS(svgns, 'path');
                el.setAttributeNS(null, 'd', path);
                el.setAttributeNS(null, 'fill', 'url(#hhogl)');
                el.setAttribute('class', 'map-constituency');
                constituencyGroup.appendChild(el);

                return {
                    'path': el,
                    'centroid': centroid(points)
                };
            });

            constituencies[feature.properties.constituency] = {
                'paths': shapes.map((p) => p.path),
                'centroid': centroid(shapes.map((p) => p.centroid))
            };
        });

        scaleG.appendChild(constituencyGroup);
        svg.appendChild(scaleG);
        el.appendChild(svg);

        this.constituencies = constituencies;
        this.constituencyGroup = constituencyGroup;

        this.focusPoint = focusPoint();
    }

    focusConstituency(ons_id) {
        var constituency = this.constituencies[ons_id];

        if (constituency != this.lastFocusedConstituency) {
            if (this.lastFocusedConstituency) {
                this.lastFocusedConstituency.paths.forEach((p) => p.removeAttribute('data-selected'));
            }

            constituency.paths.forEach(function (path) {
                path.remove();
                path.setAttribute('data-selected', 'true');
                this.constituencyGroup.appendChild(path);
            }.bind(this));

            this.focusPoint(
                constituency.centroid,
                (x, y) => this.constituencyGroup.setAttributeNS(null, 'transform', `translate(${-x}, ${-y})`)
            );
            this.lastFocusedConstituency = constituency;
        }
    }

    setConstituencyParty(ons_id, party) {
        var constituency = this.constituencies[ons_id];
        if (party != constituency.party) {
            constituency.paths.forEach((p) => p.setAttribute('data-party', party.toLowerCase()));
            constituency.party = party;
        }
    }
}
