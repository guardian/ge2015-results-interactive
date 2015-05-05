import reqwest from 'reqwest'
import tmplMain from './text/main.html!text'
import swig from 'swig'
import qwery from 'qwery'
import bean from 'fat/bean'
import bowser from 'ded/bowser'
import { Seatstack } from './components/seatstack'
import { Ticker } from './components/ticker'
import { UKCartogram } from './components/cartogram'
import { renderCartogram } from './components/cartogram'
import { Dropdown } from './components/dropdown'
import { Details } from './components/details'
import { Legend } from './components/legend'
import { PartyTable } from './components/partyTable'
import hotseats from './data/hotseats.json!json'

function isResult(c) { return c['2015'].status === 'result'; }
function isMarginalConstituency(c) {
    return c['2015'].percentageMajority < 3;
}

function isBigSwingWin(c) {
    var e = c['2015'];
    return e.winningParty !== e.sittingParty && e.swing > 30;
}

function isImportantConstituency(c) {
    return isBigSwingWin(c) || isMarginalConstituency(c);
}

function isMobile() {
    return bowser.mobile;
}

function isCelebritySeat(c) {
    return hotseats.find(s => s.id === c.ons_id);
}

function removeClass(el, className) {
    if (el.classList) el.classList.remove(className);
    else el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
}

function freezeScroll(e) { e.preventDefault(); }

class ElectionResults {
    constructor(el, opts) {
        this.el = el;
        this.dataUrl = opts.dataUrl;
        this.guardianConfig = opts.guardianConfig;
        this.opts = opts;
        this.createComponents();
        this.createLatestFilter();
        this.initEventHandlers();
        // window.setInterval(this.fetchDataAndRender.bind(this), 5000);
        this.fetchDataAndRender();

        removeClass(this.el.querySelector('.veri'), 'veri--loading')
    }

    createComponents() {
        var el = this.el;
        this.cartogramEl = el.querySelector('#ukcartogram')

        var dropdownOpts = {
            onSelect: this.selectConstituency.bind(this),
            onFocus: isMobile() ? () => false : this.focusConstituency.bind(this),
            onKeyDown: evt => evt.keyCode === 27 && this.deselectConstituency()
        }

        var cartogramOpts = {
            selectCallback: this.selectConstituency.bind(this),
            tooltipCallback: this.cartogramTooltipClick.bind(this),
            mouseBindings: !isMobile()
        }

        this.components = {
            details: new Details(el.querySelector('#constituency-details'), {share_url: this.guardianConfig.page.shortUrl }),
            cartogram: new UKCartogram(this.cartogramEl, cartogramOpts),
            dropdown1: new Dropdown(el.querySelector('#dropdown1'), dropdownOpts),
            dropdown2: new Dropdown(el.querySelector('#dropdown2'), dropdownOpts),
            seatstack: new Seatstack(el.querySelector('#seatstack'), this.hoverParty.bind(this)),
            ticker: new Ticker(el.querySelector('#ticker'), this.selectConstituency.bind(this), this.focusEvent.bind(this)),
            partyTable: new PartyTable(el.querySelector('#partytable'))
        };

        this.dataPreprocessing = {
            ticker: data => this.getFilteredTickerData(data)
        }


        var parties = ['Lab', 'SNP', 'Green', 'Others', 'Ukip', 'LD', 'Con', 'DUP', 'SF', 'SDLP'];
        var legend = new Legend(this.el.querySelector('#legend1'), parties);

    }

    renderComponent(componentName, data) {
        var dataFn = this.dataPreprocessing[componentName] || ((d) => d)
        this.components[componentName].render(dataFn(data));
    }

    getLatestFilterValue() {
        return this.el.querySelector('#latest-filter [name="latest-filter"]:checked').getAttribute('value');
    }

    getFilteredTickerData(data, filter) {
        var data = data || this.lastFetchedData;
        var filter = filter || this.getLatestFilterValue();
        var filterFn = this.tickerFilters[filter];
        return filterFn(data);
    }

    createLatestFilter() {
        var self = this;
        var sortConstituency = (c1,c2) => c1['2015'].updated > c2['2015'].updated ? -1 : 1;
        var numberOfResults = isMobile() ? 10 : 5;

        this.tickerFilters = {
            latest: data => data.constituencies
                                .filter(isResult)
                                .sort(sortConstituency).slice(0,numberOfResults),
            marginals: data => data.constituencies
                                .filter(isResult)
                                .filter(isMarginalConstituency)
                                .sort(sortConstituency)
                                .slice(0, numberOfResults),
            swings: data => data.constituencies
                                .filter(isResult)
                                .filter(isBigSwingWin)
                                .sort(sortConstituency)
                                .slice(0, numberOfResults),
            'hot seats': data => data.constituencies
                                .filter(isResult)
                                .filter(isCelebritySeat)
                                .sort(sortConstituency)
                                .slice(0, numberOfResults)
        }

        var listEl = this.el.querySelector('#latest-filter');
        Object.keys(this.tickerFilters).forEach(function(val) {
            var elementId = 'latest-filter--' + val;
            var li = document.createElement('li');
            var checked = val === 'latest' ? 'checked' : '';
            li.innerHTML = `<input id="${elementId}" type="radio" ${checked} name="latest-filter" value="${val}">` +
                     `<label for="${elementId}">${val}</label>`;
            listEl.appendChild(li);

            li.querySelector('[name="latest-filter"]').addEventListener('change', function(val) {
                self.renderComponent('ticker', self.lastFetchedData);
            })
            var labelEl = li.querySelector('label')
            labelEl.addEventListener('mouseover', function(evt) {
                var filter = evt.target.textContent;
                var latestIds = self.getFilteredTickerData(self.lastFetchedData, filter).map(e => e.ons_id)
                self.components.cartogram.setLatest(latestIds);
                self.cartogramEl.setAttribute('latest-results', '');
            })
            labelEl.addEventListener('mouseout', () => self.cartogramEl.removeAttribute('latest-results'));
        });
    }

    timeFilterAndRender(time) {
    }

    deselectConstituency() {
        this.components.cartogram.resetZoom();
        this.components.details.hide();
    }

    selectConstituency(constituencyId) {
        if (!isMobile()) {
            this.components.cartogram.zoomToConstituency(constituencyId);
            this.components.details.selectConstituency(constituencyId);
        } else {
            this.scrollAndFocus(constituencyId)
            // this.focusConstituency(constituencyId);
        }
    }

    freezeScrolling() {
        window.addEventListener('touchmove', freezeScroll);
    }

    resumeScrolling() {
        window.removeEventListener('touchmove', freezeScroll);
    }

    cartogramTooltipClick(constituencyId) {
        this.components.details.selectConstituency(constituencyId);
        this.freezeScrolling();
    }

    hoverParty(party) {
        if (!isMobile() && party) this.components.cartogram.highlightParty(party);
        else this.components.cartogram.highlightParty();
    }

    scrollAndFocus(constituencyId) {
        var cartEl = this.components.cartogram.el;
        var mapCenter = cartEl.offsetTop + (cartEl.offsetHeight / 2);
        var windowCenter = window.innerHeight / 2;
        window.scrollTo(null, mapCenter - windowCenter - 50);
        this.focusConstituency(constituencyId);
    }

    focusConstituency(constituencyId) {
        if (!constituencyId) return this.blurConstituency();
        this.cartogramEl.setAttribute('focus-constituency', '')
        this.components.cartogram.focusConstituency(constituencyId);
    }

    blurConstituency() {
        this.cartogramEl.removeAttribute('focus-constituency')
        if (this.components) this.components.cartogram.blurConstituency();
    }

    focusEvent(event) {
        if (event) this.focusConstituency(event.id);
        else this.blurConstituency()
    }

    initEventHandlers() {
        bean.on(this.components.details.el, 'click', '.veri__close-details', function() {
            this.resumeScrolling();
            this.components.details.hide();
            if (!isMobile()) {
                this.components.cartogram.resetZoom();
                this.blurConstituency();
            }
        }.bind(this));

    }

    fetchDataAndRender() {
        reqwest({
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            success: function(resp) {
                this.lastFetchedData = resp;
                this.renderDataComponents(resp);
                this.handleHashLink();
            }.bind(this)
        });
    }

    handleHashLink() {
        if (window.location.hash) {
            var match = /^#c=(.*)$/.exec(window.location.hash);
            var cid = match.length === 2 && match[1];
            if (cid) {
                this.selectConstituency(cid)
            }
        }
    }

    renderDataComponents(data) {
        Object.keys(this.components)
            .forEach(key => this.renderComponent(key, data))
    }
}

function init(el, context, config, mediator) {

    var dataUrl = 'mega.json';
    // var dataUrl = 'http://s3.amazonaws.com/gdn-cdn/2015/05/election/datatest/liveresults.json';

    el.innerHTML = swig.render(tmplMain);

    var standfirst = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vestibulum ante suscipit finibus volutpat. Vivamus magna odio, aliquet mollis posuere in, eleifend eu felis. Curabitur pellentesque lacus sit amet lorem gravida, id aliquet lorem ultricies. Aliquam rhoncus vestibulum sapien in iaculis."
    el.querySelector('#content-meta').innerHTML = `<h1>Live election results</h1><p>${standfirst}</p>`

    window.setTimeout(() => new ElectionResults(el, { guardianConfig: config, dataUrl: dataUrl}), 1);
}

define(function() { return {init: init}; });
