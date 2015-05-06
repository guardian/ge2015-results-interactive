import hexagonsTopo from '../data/hexagons-topo.json!json'
import regionsTopo from '../data/regions-topo.json!json'
import topojson from 'mbostock/topojson'
import { utm, centroid } from '../lib/geo'
import { pan } from '../lib/pan'

const svgns = "http://www.w3.org/2000/svg";

function createPolygons(feature, clazz, group) {
    var coordinates = feature.geometry.coordinates;
    // When there are multiple polygons for a constituency the coordinates have
    // another dimension of unit length arrays, no time to work out why!
    if (feature.geometry.type === 'MultiPolygon') {
        coordinates = Array.prototype.concat.apply([], coordinates.map(s => s));
    }

    return coordinates.map(function (cs) {
        var points = cs.map(c => utm(c[1], c[0]));

        var path = 'M' + points.map(p => p.join(',')).join('L') + 'Z';
        var el = document.createElementNS(svgns, 'path');
        el.setAttributeNS(null, 'd', path);
        el.setAttribute('class', clazz);
        group.appendChild(el);

        return {
            'path': el,
            'center': centroid(points)
        };
    });
}

function createText(feature, clazz, group) {
    var coordinate = feature.geometry.coordinates;
    var [x, y] = utm(coordinate[1], coordinate[0]);
    var el = document.createElementNS(svgns, 'text');
    el.setAttributeNS(null, 'x', x);
    el.setAttributeNS(null, 'y', y);
    el.setAttribute('class', clazz);
    el.textContent = feature.properties.name;
    group.appendChild(el);
}

function createConstituencies() {
    var group = document.createElementNS(svgns, 'g');
    var constituencies = {};

    var features = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexagons).features;
    features.forEach(function (feature) {
        var shapes = createPolygons(feature, 'map-constituency', group);
        constituencies[feature.properties.constituency] = {
            'paths': shapes.map(p => p.path),
            'center': centroid(shapes.map(p => p.center))
        };
    });

    return [group, constituencies];
}

function createRegions() {
    var group = document.createElementNS(svgns, 'g');
    var regions = {};

    var features = topojson.feature(regionsTopo, regionsTopo.objects.regions).features;
    var citiesFeatures = features.filter(d => d.geometry.type === 'Point' && d.properties.abbr);
    citiesFeatures.forEach(feature => createText(feature, 'map-city map-city--below', group));
    citiesFeatures.forEach(feature => createText(feature, 'map-city', group));

    return [group, regions];
}

export class CartogramLite {
    constructor(el) {
        var svg = document.createElementNS(svgns, 'svg');
        svg.setAttribute('viewBox', '-100 -100 200 200');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        el.appendChild(svg);

        var defs = document.createElementNS(svgns, 'defs');
        defs.innerHTML = [
            '<pattern id="hhogl" patternUnits="userSpaceOnUse" width="4" height="4">',
                '<rect width="4" height="4" fill="#e1e1e1"></rect>',
                '<path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke-width="1" shape-rendering="auto" stroke="#aaa" stroke-linecap="square"></path>',
            '</pattern>'].join('');
        svg.appendChild(defs);

        var [regionContainer, _] = createRegions();
        var [constituencyContainer, constituencies] = createConstituencies();

        this.container = document.createElementNS(svgns, 'g');
        this.container.appendChild(constituencyContainer);
        this.container.appendChild(regionContainer);
        svg.appendChild(this.container);

        this.constituencies = constituencies;
        this.constituencyContainer = constituencyContainer;

        this.pan = pan();
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
                this.constituencyContainer.appendChild(path);
            }.bind(this));

            this.pan(
                constituency.center,
                (x, y) => this.container.setAttributeNS(null, 'transform', `translate(${-x}, ${-y})`)
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
