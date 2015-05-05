import topojson from 'mbostock/topojson'
import hexagonsTopo from '../data/hexagons-topo.json!json'

const svgns = "http://www.w3.org/2000/svg";

// http://en.wikipedia.org/wiki/Universal_Transverse_Mercator_coordinate_system
var rad = (d) => d * Math.PI / 180;
const a = 6378.137, f = 1/298.257223563;
const N0 = 0, E0 = 500, k0 = 0.9996;
const n = f / (2 - f);
const n2 = n*n, n3 = n*n2, n4 = n*n3;
const t_part = 2 * Math.sqrt(n)/(1 + n);
const A = a/(1+n) * (1 + 1/4*n2 + 1/64*n4);
const zone = 30;
const λ0 = rad(zone * 6 - 183);
const k0A = k0 * A;

function utm(lat, lon) {
    var φ = rad(lat);
    var λ = rad(lon) - λ0;

    var sinφ = Math.sin(φ);
    var t = Math.sinh(Math.atanh(sinφ) - t_part * Math.atanh(t_part * sinφ));

    var E = E0 + k0A*Math.atanh(Math.sin(λ)/Math.sqrt(1 + t*t));
    var N = N0 + k0A*Math.atan(t/Math.cos(λ));
    return [E, -N];
}

// TODO: remove this
Array.prototype.flatMap = function (fn) {
    return Array.prototype.concat.apply([], this.map(fn));
};

export class CartogramLite {
    constructor(el) {
        this.el = el;
        var hexFeatures = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexagons).features;

        this.svg = document.createElementNS(svgns, 'svg');
        this.g = document.createElementNS(svgns, 'g');
        this.g.setAttributeNS(null, 'transform', 'scale(0.6) translate(0, 6500)');

        hexFeatures.flatMap(function (feature) {
            var coordinates = feature.geometry.coordinates;
            // When there are multiple paths to a constituency the coordinates have another
            // dimension of unit length arrays, no time to work out why!
            if (coordinates.length > 1) {
                coordinates = coordinates.flatMap((s) => s);
            }

            return coordinates.map(function (cs) {
                return 'M' + cs.map((c) => utm(c[1], c[0]).join(',')).join('L') + 'Z';
            }).map(function (path) {
                var el = document.createElementNS(svgns, 'path');
                el.setAttributeNS(null, 'd', path);
                return el;
            });
        }).forEach((el) => this.g.appendChild(el));

        this.svg.appendChild(this.g);
        this.el.appendChild(this.svg);
    }

    render(data) {

    }
}
