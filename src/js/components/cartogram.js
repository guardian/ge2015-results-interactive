import hexagonsTopo from '../data/hexagons-topo.json!json'
import regionsTopo from '../data/regions-topo.json!json'
import topojson from 'mbostock/topojson'
import d3 from 'd3'
import textures from 'riccardoscalco/textures'
import dropdownHTML from './templates/cartogramDropdown.html!text'
import bonzo from 'ded/bonzo'
import gradientSvgTemplate from './templates/gradient.svg!text'
import swig from 'swig'
import { Legend } from './legend'

const gradientTemplateFn = swig.compile(gradientSvgTemplate)

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

var getDist = (x1,y1,x2,y2) => Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));

export class UKCartogram {
    constructor(el, opts) {


        this.initOptions(opts);
        this.el = el;
        this.svg = d3.select(el).append("svg");
        this.map = this.svg.append('g');
        this.selectConstituencyCallback = this.opts.selectCallback;
        this.metric = 'Winning Party';

        this.resetZoom();
        this.renderHex();
        this.renderRegions();
        this.focusHexGroup = this.map.append('g');
        this.arrowGroup = this.map.append('g').attr('class', 'cartogram__arrowgroup');
        this.project();
        this.initOverlay();
        this.initEventHandling();
        this.initDefs();

        var self = this;
        window.foo = (t,s) => self.setTransform(t,s)
        window.bar = () => self.initProjection()
    }

    initOptions(opts) {
        var defaultOpts = {
            mouseBindings: true,
            selectCallback: () => false, // no-op
            tooltipCallback: () => false, // no-op
            partyColors: {
                Con: '#005789',
                Green: '#33A22B',
                Lab: '#E31F26',
                SNP: '#FCDD03',
                LD: '#FFB900',
                UKIP: '#7D0069',
                PC: '#868686'
            }
        }

        this.opts = {}
        Object.keys(defaultOpts).forEach(k => this.opts[k] = opts[k] !== undefined ? opts[k] : defaultOpts[k])
    }

    initDefs() {
        this.defs = this.svg.append("defs");

        var marker = this.defs.append("marker")
          .attr("class","marker")
          .attr("id", "arrowhead")
          .attr("refY", 3)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          // .attr("fill","#a60000")
          .attr("stroke","none")
          .append("path")
          .attr("d", "M 0,0 V 6 L6,3 Z");
    }

    project() { // do projections separately so we can rerender
        var self = this;
        this.initProjection();
        this.map.selectAll("path").attr("d", this.path)
        this.regionGroup.selectAll("circle")
            .attr("cx", d => self.projection(d.geometry.coordinates)[0] )
            .attr("cy", d => self.projection(d.geometry.coordinates)[1] )
        this.regionGroup.selectAll('text')
            .attr("x", d => self.projection(d.geometry.coordinates)[0] )
            .attr("y", d => self.projection(d.geometry.coordinates)[1] )
        this.hexCentroids = {}
        this.hexPaths.each(d => this.hexCentroids[d.properties.constituency] = this.path.centroid(d));
    }

    initProjection() {
        var elDimensions = this.elDimensions;
        var scale = 2000 * (elDimensions.width / 200)
        this.projection = d3.geo.transverseMercator()
            .scale(Math.min(scale, 6500))
            .translate([elDimensions.width / 2, elDimensions.height / 2])
            .center([0, 54.1])
            .rotate([2,0])
            .precision(10.0);
        if (!this.path) this.path = d3.geo.path();
        this.path.projection(this.projection)
    }

    renderTooltip(constituencyId) {
        this.tooltipConstituency = constituencyId;
        if (!this.tooltip) {
            var tooltip = '<div class="cartogram__tooltip"></div>';
            this.el.insertAdjacentHTML('beforeend', tooltip);
            this.tooltip = this.el.querySelector('.cartogram__tooltip');
            this.tooltip.addEventListener('click', (evt) => this.opts.tooltipCallback(this.tooltipConstituency))
        }

        if (!this.constituenciesById) return; // no data yet

        var c = this.constituenciesById[constituencyId];

        var msg;
        if (c['2015'].winningParty) {
            var partyName = (party) =>
                `<strong>${party}</strong>`

            var e = c['2015']
            var how = '';
            var verb = e.winningParty === e.sittingParty ? 'hold' : 'gain';
            var fromParty = verb === 'gain' ? ` from ${partyName(e.sittingParty)}` : '';
            if (e.swing > 30) {
                how = `with a ${e.swing}% swing`
            } else if (e.percentageMajority < 3) {
                how = `with a ${e.percentageMajority}% majority`;
            }

            msg = `<p>${partyName(e.winningParty)} ${verb}${fromParty} ${how}</p>`
        } else {
            msg = '<p>Result pending</p>'
        }

        this.tooltip.innerHTML =
            '<span class="cartogram__tooltip__spout"></span>' +
            `<h4>${c.name}</h4>${msg}` +
            '<span class="cartogram__tooltip__tap2expand"></span>';

        var rect = this.tooltip.getBoundingClientRect();
        var centroid = this.hexCentroids[constituencyId];
        var coords = this.mapCoordsToScreenCoords(centroid);
        this.tooltip.style.visibility = 'visible';

        var elDimensions = this.elDimensions;
        var topSide = coords[1] > (elDimensions.height / 2);
        this.tooltip.style.top = (topSide ? coords[1]-rect.height : coords[1]) + 'px';
        var desiredLeft = (coords[0] - (rect.width / 2));
        var maxLeft = elDimensions.width - rect.width;
        var minLeft = 0;
        var actualLeft = Math.max(minLeft, Math.min(desiredLeft, maxLeft));
        this.tooltip.style.left = actualLeft + 'px';

        var spoutOffset = Math.min(rect.width - 12, coords[0] - actualLeft);
        this.tooltip.querySelector('.cartogram__tooltip__spout').style.left = spoutOffset + 'px';
        this.tooltip.className = 'cartogram__tooltip' + (topSide ? ' cartogram__tooltip--above' : ' cartogram__tooltip--below');
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.style.visibility = '';
    }

    renderHex() {
        this.hexFeatures = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexagons).features
        this.hexGroup = this.map.append('g').attr('class', 'cartogram__hexgroup')
        this.hexPaths = this.hexGroup.selectAll("path")
                                .data(this.hexFeatures)
        this.hexPaths
            .enter().append("path")
            .attr("d", this.path)
            .classed('cartogram__hex', true)
        if (this.lastRenderedData) this.render(this.lastRenderedData);
    }

    renderRegions() {
        var self = this;
        this.regionFeatures = topojson.feature(regionsTopo, regionsTopo.objects.regions).features
        this.regionFeaturesCities = this.regionFeatures.filter(d => d.geometry.type === "Point" && !d.properties.abbr);
        this.regionFeaturesRegions = this.regionFeatures.filter(d => d.geometry.type === "Point" && d.properties.abbr);
        this.regionGroup = this.map.append('g').attr('class', 'cartogram__regiongroup')

        // render region boundaries
        this.regionGroup.selectAll("path")
            .data(this.regionFeatures.filter(d => d.geometry.type !== "Point")).enter()
            .append('path')
                // .attr("d", this.path);

        // render city points
        this.regionGroup.selectAll("circle.city")
            .data(this.regionFeaturesCities).enter()
            .append("circle")
                .attr("class","cartogram__city")
                    // .attr("cx", d => self.projection(d.geometry.coordinates)[0] )
                    // .attr("cy", d => self.projection(d.geometry.coordinates)[1] )
                    .attr("r",2)

        // render region/city labels and dropshadows
        this.renderRegionLabels('text.region', "cartogram__label cartogram__label--below", this.regionFeaturesRegions)
        this.renderRegionLabels('text.region', "cartogram__label", this.regionFeaturesRegions)
        this.renderRegionLabels('text.city', "cartogram__label cartogram__label--city cartogram__label--below", this.regionFeaturesCities)
        this.renderRegionLabels('text.city', "cartogram__label cartogram__label--city", this.regionFeaturesCities)
    }

    renderRegionLabels(type, className, data) {
        this.regionGroup.selectAll(type)
            .data(data).enter()
            .append("text")
                .attr("class",className)
                // .attr("x", d => this.projection(d.geometry.coordinates)[0] )
                // .attr("y", d => this.projection(d.geometry.coordinates)[1] )
                .attr("dy", "-.35em")
                .text(d => d.properties['abbr'] || d.properties.name)
    }

    coordsToClosestConstituency(coords) {
        var mapCoords = this.screenCoordsToMapCoords(coords);
        var sortedByDistance = Object.keys(this.hexCentroids)
            .map( function(cId){
                var centroid = this.hexCentroids[cId];
                return [cId, getDist(centroid[0],centroid[1],mapCoords[0],mapCoords[1])];
            }.bind(this))
            .sort(function(a,b) { return a[1] - b[1]; })
        var closest = sortedByDistance[0];
        return closest[1] < 100 ? closest[0] : null;
    }

    screenCoordsToMapCoords(coords) {
        return [0,1].map(i => (coords[i]- this.translate[i]) / this.scale[i])
    }

    mapCoordsToScreenCoords(coords) {
        return [0,1].map(i => (coords[i] * this.scale[i]) + this.translate[i]);
    }

    initOverlay() {
        var controls = document.createElement('div');
        controls.className = 'cartogram__controls';
        var resetButton = '<div class="cartogram__reset-zoom"></div>';
        var legendContainer = '<div class="cartogram__legend"></div>';
        controls.innerHTML = resetButton + dropdownHTML  + legendContainer;
        this.el.appendChild(controls)

        controls.querySelector('.cartogram__reset-zoom')
            .addEventListener('click', function() { this.resetZoom(); this.selectConstituency(null); }.bind(this) );

        controls.querySelector('.cartogram__dropdown')
            .addEventListener('change', function(evt) { this.setMetric(evt.target.value); }.bind(this));

        this.legendEl = controls.querySelector('.cartogram__legend');
    }

    initEventHandling() {
        var self = this;

        if (this.opts.mouseBindings) {
            this.svg.on('mousemove',function(){
                    var coords = d3.mouse(this);
                    var mouseConstituency = self.coordsToClosestConstituency(coords);
                    self.focusConstituency(mouseConstituency);
            })

            this.svg.on('mouseleave', function() { this.blurConstituency(); this.hideTooltip(); }.bind(this))
        }

        this.svg.on("click",function(){
            var coords = d3.mouse(this);
            var constituency = self.coordsToClosestConstituency(coords);
            self.selectConstituency(constituency);
        })

        var lastWidth = this.elDimensions.width;
        var rerenderTimeout;
        window.addEventListener('resize', function(evt) {
            var thisWidth = this.elDimensions.width;
            if (lastWidth != thisWidth) {
                window.clearTimeout(rerenderTimeout);
                rerenderTimeout = window.setTimeout(this.project.bind(this), 500);
            }
        }.bind(this))
    }

    get elDimensions() { return this.el.getBoundingClientRect() }
    get elCenter() {
        var rect = this.el.getBoundingClientRect();
        return [rect.width/2, rect.height/2];
    }

    focusConstituency(constituencyId) {
        if (this.focusedConstituency === constituencyId) return;

        this.blurConstituency();

        this.focusedConstituency = constituencyId;
        if (!constituencyId) return;

        var focusHexGroupEl = this.focusHexGroup[0][0];
        this.hexPaths
            // .classed('cartogram__hex--focus', false )
            .filter(d => d.properties.constituency === constituencyId)
            // .classed('cartogram__hex--focus', true)
            .each(function() {
                var clone = this.cloneNode();
                clone.setAttribute('class', clone.getAttribute('class') + ' cartogram__hex--focus');
                focusHexGroupEl.appendChild(clone);
            })

        this.renderTooltip(constituencyId);
    }

    blurConstituency() {
        var focusHexGroupEl = this.focusHexGroup[0][0];
        this.focusedConstituency = null;
        this.hexPaths
            .each(function() { focusHexGroupEl.innerHTML = ''; } )
        this.hideTooltip();
    }

    setLatest(constituencyIds) {
        this.selectedLatestIds = constituencyIds;
        this.hexPaths
            .classed('cartogram__hex--latest', false)
            .filter(d => constituencyIds.indexOf(d.properties.constituency) !== -1)
            .classed('cartogram__hex--latest', true);

    }

    selectConstituency(constituencyId) {
        this.selectConstituencyCallback(constituencyId);
    }

    zoomToConstituency(constituencyId) {
        if (!constituencyId) return this.resetZoom();

        this.el.setAttribute('zoomed', '');

        var centroid = this.hexCentroids[constituencyId];
        var [cx, cy] = this.elCenter;
        var offsetX = (cx - centroid[0]) / 2;
        var offsetY = (cy - centroid[1]) / 2;
        var translateX = (-1 * centroid[0]) + offsetX;
        var translateY = (-1 * centroid[1]) + offsetY;
        this.setTransform([translateX, translateY], [2,2])
        if (this.focusedConstituency) {
            var focused = this.focusedConstituency;
            this.focusedConstituency = null;
            this.hideTooltip();
            window.setTimeout(() => this.focusConstituency(focused), 500);
        }

        this.hexPaths
            .classed('cartogram__hex--selected', false )
            .filter(d => d.properties.constituency === constituencyId)
            .classed('cartogram__hex--selected', true)
            .moveToFront()
    }

    resetZoom() {
        this.el.removeAttribute('zoomed');
        this.setTransform([0,0], [1,1])
        this.hexPaths && this.hexPaths.classed('cartogram__hex--selected', false)
    }

    setTransform(translate, scale) {

        if (this.translate && this.scale &&
            this.translate[0] === translate[0] && this.translate[1] === translate[1] &&
            this.scale[0] === scale[0] && this.scale[1] === scale[1]) return;

        this.translate = translate;
        this.scale = scale;

        this.map.transition()
            .ease(d3.ease('out'))
            .duration(200)
            .attr('transform', `translate(${translate}) scale(${scale})`);
    }

    setMetric(metric) {
        if (metric !== this.metric) {
            this.metric = metric;
            if (this.lastRenderedData) this.render(this.lastRenderedData);
        }
    }

    initTextures() {
        if (!this.texture) {
            this.texture = textures.lines()
                .size(4)
                .strokeWidth(1)
                .stroke("#aaa")
                .orientation("6/8")
                .background("#e1e1e1")
            this.texture2 = textures.lines()
                .size(4)
                .strokeWidth(1)
                .stroke("#aaa")
                .background("#e1e1e1");
            this.svg.call(this.texture);
            this.svg.call(this.texture2);
        }
    }

    getConstituencyOffset(constituencyId) {
        var path = this.hexPaths[0].find(p => p.__data__.properties.constituency === constituencyId);
        return path && path.getBoundingClientRect().top;
    }

    highlightParty(party) {
        if (party) this.el.setAttribute('party-highlight', party.toLowerCase());
        else this.el.removeAttribute('party-highlight');
    }

    get metricMeta() {
        var meta = {headline: '', description: ''};
        var wasis = this.lastRenderedData.PASOP.numberOfResults === 650 ? 'was' : 'is';
        if (this.metric.startsWith('voteshare')) {
            var partyName = this.metric.substr('voteshare '.length);
            var party = this.lastRenderedData.PASOP.parties.find(p => p.abbreviation === partyName);
            var perc = party.percentageShare;
            var percChange = party.percentageChange;
            var increasedecrease = percChange < 0 ? 'decrease' : 'increase';
            meta.header = `${party.name} vote share`;
            meta.description = `National vote share ${wasis} ${perc.toFixed(0)}%, a ${Math.abs(percChange.toFixed(1))} percentage point ${increasedecrease}`
        } else if (this.metric === 'Turnout %') {
            var turnout = this.lastRenderedData.overview.turnoutPerc;
            meta.header = "Turnout";
            meta.description = `National turnout ${wasis} ${turnout.toFixed(0)}%`;
        } else if (this.metric.startsWith('arrow-gain')) {
            var partyName = this.metric.substr('arrow-gain '.length);
            meta.header = `Where ${partyName} has gained support`;
            meta.description = 'Length of the arrow indicates the percentage point change from 2010';
        } else if (this.metric.startsWith('arrow-loss')) {
            var partyName = this.metric.substr('arrow-loss '.length);
            meta.header = `Where ${partyName} has lost support`;
            meta.description = 'Length of the arrow indicates the percentage point change from 2010';
        }
        return `<h4>${meta.header}</h4><p>${meta.description}</p>`;
    }

    renderChoropleth(idToValMap, colorRange, defaultFill=null) {
        var roundTo = 5;
        var values = Object.keys(idToValMap).map(k => idToValMap[k]).filter(k => k !== undefined)
        var minVal = Math.round(Math.min.apply(null, values));
        var maxVal = Math.round(Math.max.apply(null, values));
        var minValRounded = minVal - (minVal % roundTo);
        var maxValRounded = maxVal + 5 - (maxVal % roundTo);
        var color = d3.scale.linear()
            .domain([minValRounded, maxValRounded])
            .range(colorRange);

        this.hexPaths
            .each(function(d) {
                var value = idToValMap[d.properties.constituency];
                d3.select(this)
                    .attr('fill', value ? color(value) : '')
                    .classed('cartogram__hex--empty', !value);
                // else d3.select(this).classed('cartogram__hex--')
                // return value !== undefined ?  : defaultFill;
            });
        var gradientSvg = gradientTemplateFn({startColor: colorRange[0], endColor: colorRange[colorRange.length-1]});
        var b64gradient = btoa(gradientSvg);
        var keyHTML =
            `<div class="cartogram__gradient-key" style="background: url(data:image/svg+xml;base64,${b64gradient})">
                <span>${minValRounded}%</span><span>${maxValRounded}%</span>
            </div>`;
        this.renderLegend(keyHTML);
    }

    renderArrows(data) {
        var values = data.map(d => d[1])
        var idToValMap = new Map();
        data.forEach(d => idToValMap.set(d[0], d[1]))
        var maxArrowSize = 100;
        var minArrowSize = 5;
        var arrowSizeRange = maxArrowSize - minArrowSize;

        function generatePath(val, center) {
            var negative = val < 0;
            var arrowMag = minArrowSize + (Math.abs(val / 100) * arrowSizeRange);
            var arrowLength = arrowMag * (negative ? -1 : 1);
            var y = parseInt(center[1]) + 0.5;
            var startx = center[0] - (arrowLength/2);
            var endx = center[0] + (arrowLength/2);
            return `M${startx},${y}L${endx},${y}`;
        }

        this.hexPaths
            .classed('cartogram__hex--has-arrow', d => idToValMap.get(d.properties.constituency) !== undefined)

        this.arrowGroup
            .selectAll('path')
            .data(data).enter()
            .append('path')
            .classed('cartogram__arrow', true)
            .attr('d', d => generatePath(d[1], this.hexCentroids[d[0]]))
            .attr('marker-end', 'url(#arrowhead)')

        var gainloss = this.metric.startsWith('arrow-loss') ? 'loss' : 'gain';
        this.renderLegend(`<div class="cartogram__legend-arrow cartogram__legend-arrow--${gainloss}"></div>`);
    }

    gradientSvg(colorFrom, colorTo) {
        return btoa();
    }

    renderLegend(keyHTML) {
        this.legendEl.innerHTML = keyHTML + this.metricMeta;
    }

    render(data) {
        var self = this;
        this.initTextures();

        // DATA
        this.lastRenderedData = data;
        var constituenciesById = this.constituenciesById = {};
        data.constituencies.forEach(c => constituenciesById[c.ons_id] = c)

        // shared rendering
        var alternate = 0;
        this.hexPaths
            .attr('party', function(d) {
                var constituency = constituenciesById[d.properties.constituency];
                return (constituency['2015'].winningParty || 'pending').toLowerCase();
            })
            .each(function(d) {
                var hasResult = constituenciesById[d.properties.constituency]['2015'].winningParty;
                if (hasResult) d3.select(this).attr('fill', '');
                else d3.select(this).attr('fill', () => (alternate++ % 2) ? self.texture.url() : self.texture2.url());
            })
            .classed('cartogram__hex--empty', false);

        this.arrowGroup.html('');

        var choro = ['Turnout %', 'Majority %']
        var isChoro = (metric) => metric.startsWith('voteshare ') || choro.indexOf(metric) !== -1
        var isArrow = (metric) => metric.startsWith('arrow-');

        if (this.metric === 'Winning Party') {
            this.el.setAttribute('map-mode', 'party');
            var parties = ['Lab', 'Con', 'LD', 'SNP', 'Green', 'Ukip', 'DUP', 'SF', 'SDLP', 'Others'];
            this.legendEl.innerHTML = '';
            var legendContainer = document.createElement('div');
            new Legend(legendContainer, parties);
            this.legendEl.appendChild(legendContainer);

        } else if (isChoro(this.metric)) {

            this.el.setAttribute('map-mode', 'choropleth');

            if(this.metric === 'Turnout %') {
                var mapData = {};
                data.constituencies.forEach(c => mapData[c.ons_id] = c['2015'].percentageTurnout)
                this.renderChoropleth(mapData, ["white", "black"]);

            } else if(this.metric === 'Majority %') {
                var mapData = {};
                data.constituencies.forEach(c => mapData[c.ons_id] = c['2015'].percentageMajority)
                this.renderChoropleth(mapData, ["white", "black"]);

            } else if (this.metric.startsWith('voteshare')) {
                var partyName = this.metric.slice(10);
                var mapData = {};
                var pairs = data.constituencies
                    .map(c => [c.ons_id, c['2015'].candidates.find(cand => cand.party === partyName)])
                    .filter(v => v[1] !== undefined)
                    .map(v => [v[0], v[1].percentage])
                    .forEach(v => mapData[v[0]] = v[1])
                this.renderChoropleth(mapData, ["white", this.opts.partyColors[partyName]]);

            }
        } else if (isArrow(this.metric)) {
            var type = this.metric.substr('arrow-'.length, 4)
            var partyName = this.metric.substr('arrow-gain '.length);
            this.el.setAttribute('map-mode', 'arrow');
            this.el.setAttribute('arrow-party', partyName.toLowerCase())
            var pairs = data.constituencies
                .map(c => [c.ons_id, c['2015'].candidates.find(cand => cand.party === partyName)])
                .filter(v => v[1] && v[1].percentageShareChange !== undefined)
                .filter(v => type === 'loss' ? v[1].percentageShareChange < 0 : v[1].percentageShareChange > 0)
                .map(v => [v[0], v[1].percentageShareChange])
            this.renderArrows(pairs);
        }

        if (this.selectedLatestIds) this.setLatest(this.selectedLatestIds);
    }
}