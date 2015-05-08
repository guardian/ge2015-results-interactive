import reqwest from 'reqwest'
import tmplMain from './text/main.html!text'
import swig from 'swig'
import qwery from 'qwery'
import bean from 'fat/bean'
import bowser from 'ded/bowser'
import { addClass, removeClass, throttle } from './lib/util'
import { Seatstack } from './components/seatstack'
import { Ticker } from './components/ticker'
import { UKCartogram } from './components/cartogram'
import { renderCartogram } from './components/cartogram'
import { Dropdown } from './components/dropdown'
import { Details } from './components/details'
import { Legend } from './components/legend'
import { PartyTable } from './components/partyTable'
import { TimeSlider } from './components/timeslider'
import hotseats from './data/hotseats.json!json'
import { setCurrentTime } from './lib/relativedate'
import twitterPartyNames from './data/twitter-party-names.json!json';
import moment from 'moment'

function isResult(c) { return c['2015'].status === 'result'; }
function isMarginalConstituency(c) {
    return c['2015'].percentageMajority < 3;
}

function isBigSwingWin(c) {
    var e = c['2015'];
    return e.winningParty !== e.sittingParty && e.swing > 20;
}

function isImportantConstituency(c) {
    return isBigSwingWin(c) || isMarginalConstituency(c);
}

function isMobile() { return bowser.mobile; }

function isTablet() { return bowser.tablet; }

function notMobileOrTablet() { return !(isMobile() || isTablet()); }

function isCelebritySeat(c) {
    return hotseats.find(s => s.id === c.ons_id);
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
        this.mainEl = this.el.querySelector('.veri')
        removeClass(this.mainEl, 'veri--loading')
        addClass(this.mainEl, 'veri--fetching-data')
        this.fetchAndRenderContentMeta();
        this.startData();

    }

    startData() {
        if (notMobileOrTablet()) this.dataInterval = window.setInterval(this.fetchDataAndRender.bind(this), 20000);
        this.fetchDataAndRender();
    }

    createComponents() {
        var el = this.el;
        this.cartogramEl = el.querySelector('#ukcartogram');
        var dropdownOpts = {
            onSelect: this.selectConstituency.bind(this),
            onFocus: isMobile() ? () => false : this.focusConstituency.bind(this),
            onKeyDown: evt => evt.keyCode === 27 && this.deselectConstituency(),
            hoverEvents: !(isMobile() || isTablet()),
            disableBlur: false, //bowser.ios
        }

        var cartogramOpts = {
            selectCallback: this.selectConstituency.bind(this),
            tooltipCallback: this.cartogramTooltipClick.bind(this),
            mouseBindings: !(isMobile() || isTablet())
        }

        var tickerOpts = {
            onClick: this.selectConstituency.bind(this),
            onHover: (!isMobile() && !isTablet()) && this.focusEvent.bind(this),
        }

        this.components = {
            details: new Details(el.querySelector('#constituency-details'), {share_url: this.opts.shareUrl }),
            cartogram: new UKCartogram(this.cartogramEl, cartogramOpts),
            dropdown1: new Dropdown(el.querySelector('#dropdown1'), dropdownOpts),
            dropdown2: new Dropdown(el.querySelector('#dropdown2'), dropdownOpts),
            seatstack: new Seatstack(el.querySelector('#seatstack'), this.hoverParty.bind(this)),
            ticker: new Ticker(el.querySelector('#ticker'), tickerOpts),
            partyTable: new PartyTable(el.querySelector('#partytable'))
        };

        if (!bowser.msie && !bowser.firefox) {
            var slider = el.querySelector('.timeslider');
            var sliderTime = el.querySelector('#timeslider-time');
            var sliderButton = el.querySelector('#timeslider-play');

            slider.className = 'timeslider has-slider';

            var timeSlider = new TimeSlider(el.querySelector('#timeslider'), function (time, value) {
                var partyNames = ['Lab', 'SNP', 'Others', 'Pending', 'UKIP', 'LD', 'Con'];
                var parties = {};
                var totalSeats = 0;
                partyNames.forEach(function (partyName) {
                    parties[partyName] = {'name': partyName, 'seats': 0, 'gains': 0, 'losses': 0, 'net': 0};
                });

                var constituencies = this.lastFetchedData.constituencies.map(function (c) {
                    var e = c['2015'];
                    var declared = moment(e.updated);
                    if (declared > time) {
                        return {
                            '2015': {
                                candidates: e.candidates,
                                electorate: e.electorate,
                                sittingParty: e.sittingParty,
                                status: 'pending',
                                updated: e.updated
                            },
                            'name': c.name,
                            'ons_id': c.ons_id
                        };
                    } else {
                        if (e.winningParty) {
                            var winningName = partyNames.indexOf(e.winningParty) === -1 ? 'Others' : e.winningParty;
                            var sittingName = partyNames.indexOf(e.sittingParty) === -1 ? 'Others' : e.sittingParty;
                            var changed = e.winningParty !== e.sittingParty;
                            parties[winningName].seats++;
                            parties[winningName].gains += changed;
                            parties[winningName].net += changed;
                            parties[sittingName].losses -= changed;
                            parties[sittingName].net -= changed;
                            totalSeats++;
                        }
                        return c;
                    }
                });

                parties['Pending'] = {'name': 'Pending', 'seats': 650 - totalSeats};

                var seatstack =  {
                    'parties': partyNames.map(function (partyName) { return parties[partyName]; }),
                    'resultCount': totalSeats
                };

                this.renderDataComponents({
                    constituencies: constituencies,
                    seatstack: seatstack,
                    PASOP: this.lastFetchedData.PASOP,
                    overview: this.lastFetchedData.overview
                });

                if (value === 1000) {
                    slider.className = 'timeslider has-slider';
                    sliderTime.textContent = 'Showing live results';
                    this.startData();
                } else {
                    slider.className = 'timeslider has-slider not-live';
                    sliderTime.textContent = moment(time).format('HH.mm');
                    if (this.dataInterval) {
                        clearInterval(this.dataInterval);
                        this.dataInterval = undefined;
                    }
                }
            }.bind(this));

            el.querySelector('#timeslider-return').addEventListener('click', function (evt) {
                timeSlider.setValue(1000);
                evt.preventDefault();
            });

            sliderButton.addEventListener('click', function (evt) {
                if (this.playInterval) {
                    clearInterval(this.playInterval);
                    this.playInterval = undefined;
                    removeClass(sliderButton, 'is-pause');
                    removeClass(sliderTime, 'is-pause');
                } else {
                    var value = parseInt(timeSlider.getValue());
                    if (value > 950) {
                        value = 0;
                    }

                    addClass(sliderButton, 'is-pause');
                    addClass(sliderTime, 'is-pause');
                    this.components.cartogram.setDropdown(0);

                    this.playInterval = setInterval(function () {
                        timeSlider.setValue(value);
                        value += 10;

                        if (value > 1000) {
                            clearInterval(this.playInterval);
                            removeClass(sliderButton, 'is-pause');
                            this.playInterval = undefined;
                        }
                    }.bind(this), 5);
                }
            }.bind(this));

            this.components.timeSlider = timeSlider;
        }

        this.dataPreprocessing = {
            ticker: data => this.getFilteredTickerData(data)
        }


        var parties = ['Lab', 'SNP', 'Green', 'Others', 'Ukip', 'LD', 'Con', 'DUP', 'SF', 'SDLP'];
        var legend = new Legend(this.el.querySelector('#legend1'), parties);
    }

    fetchAndRenderContentMeta() {
        reqwest({
            url: 'http://visuals.guim.co.uk/spreadsheetdata/1XzJvaVsh8ofUm89cVIYc5G5pyuARIVdg71ISP9L2ma4.json',
            type: 'json',
            crossOrigin: true,
            success: function(resp) {
                try {
                    var headline = resp.sheets.Sheet1[0].headline;
                    var standfirst = resp.sheets.Sheet1[0].standfirst;
                    this.el.querySelector('#mobile-headline').innerHTML = `<h1>${headline}</h2>`
                    this.el.querySelector('#content-meta').innerHTML = `<h1>${headline}</h1><p>${standfirst}</p>`
                } catch (err) {
                    console.error(err);
                }
            }.bind(this)
        });
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
            if (!isMobile() && !isTablet()) {
                labelEl.addEventListener('mouseover', function(evt) {
                    var filter = evt.target.textContent;
                    var latestIds = self.getFilteredTickerData(self.lastFetchedData, filter).map(e => e.ons_id)
                    self.components.cartogram.setLatest(latestIds);
                    self.cartogramEl.setAttribute('latest-results', '');
                })
                labelEl.addEventListener('mouseout', () => self.cartogramEl.removeAttribute('latest-results'));
            }
        });
    }

    get twitterShareText() {
        if (this.lastFetchedData.PASOP.numberOfResults === 0) {
            return "Live UK election results. First result expected at 11pm: http://gu.com/p/487e9"
        } else {
            var resultCount = this.lastFetchedData.PASOP.numberOfResults;
            var partiesByID = {}; this.lastFetchedData.PASOP.parties.map(p => partiesByID[p.abbreviation] = p);
            var parties = ['Lab','Con','LD','SNP','UKIP'];
            var partyCountText = parties
                .map(p => { return { name: p, seats: partiesByID[p] ? partiesByID[p].seats : 0 } })
                .sort((a,b) => b.seats - a.seats )
                .map(p => `${twitterPartyNames[p.name]} ${p.seats}`)
                .join(', ')
            return `${resultCount} of 650 results: ${partyCountText} http://gu.com/p/487e9 #GE2015`;
        }
    }

    get twitterShareUrl() {
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.twitterShareText)}`;
    }

    get facebookShareUrl() {
        var facebookParams = [
            ['display', 'popup'],
            ['app_id', '741666719251986'],
            ['link', encodeURIComponent(this.opts.shareUrl)],
            ['redirect_uri', 'http://www.facebook.com']
        ];
        var queryString = facebookParams.map(pair => pair.join('=')).join('&');
        return 'https://www.facebook.com/dialog/feed?' + queryString;
    }

    deselectConstituency() {
        this.components.cartogram.resetZoom();
        this.components.details.hide();
    }

    selectConstituency(constituencyId) {
        if (isMobile()) {
            this.scrollAndFocus(constituencyId)
        } else if (isTablet()) {
            this.components.details.selectConstituency(constituencyId);
            this.focusConstituency(constituencyId);
        } else {
            this.components.cartogram.zoomToConstituency(constituencyId);
            this.components.details.selectConstituency(constituencyId);
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
        var offset = this.components.cartogram.getConstituencyOffset(constituencyId);
        var windowCenter = window.innerHeight / 2;
        window.scrollTo(null, (window.pageYOffset + offset) - windowCenter);
        this.focusConstituency(constituencyId);
    }

    focusConstituency(constituencyId) {
        if (!constituencyId) return this.blurConstituency();
        if (!isTablet()) this.cartogramEl.setAttribute('focus-constituency', '');
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

        bean.on(window, 'scroll', throttle(this.updateLegendVisibility.bind(this), 100));

        this.el.querySelector('.veri__share-btns--main').addEventListener('click', function(evt) {
            if (/button/i.test(evt.target.nodeName)) {
                if (evt.target.getAttribute('data-source') === 'facebook') {
                    window.open(this.facebookShareUrl, 'share', 'width=600,height=200');
                } else if (evt.target.getAttribute('data-source') === 'twitter') {
                    window.open(this.twitterShareUrl, 'share', 'width=600,height=200');
                }
            }
        }.bind(this))
    }

    updateLegendVisibility() {
        var shouldBeVisible = window.pageYOffset > 250;
        if (shouldBeVisible && !this.isVisible) this.mainEl.className += ' veri--show-overlay';
        else if (!shouldBeVisible && this.isVisible) removeClass(this.mainEl, 'veri--show-overlay');
        this.isVisible = shouldBeVisible;
    }

    handleData(date, data) {
        this.lastFetchedData = data;
        try {
            if (date) {
                this.lastDataResponseDate = date;
                setCurrentTime(new Date(Date.parse(date)));
            }
        } catch (err) {
            console.error('Error parsing date');
        }
        this.renderDataComponents(data);
        removeClass(this.mainEl, 'veri--fetching-data');
        this.handleHashLink();
    }

    fetchDataAndRender() {
        var req;
        var opts = {
            url: this.dataUrl,
            type: 'json',
            crossOrigin: true,
            // use response's date header to use for relative dates (we trust CDN date more than local)
            success: resp => this.handleData(req.request.getResponseHeader('Date'), resp)
        };
        if (this.lastDataResponseDate) {
            opts.headers = {
                'If-Modified-Since': this.lastDataResponseDate
            };
        }
        req = reqwest(opts);
        return req;
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

    var shareUrl = 'http://gu.com/p/487e9';
    var dataUrl = 'http://visuals.guim.co.uk/2015/05/election/data/liveresults.json';

    el.innerHTML = swig.render(tmplMain);

    window.setTimeout(() => new ElectionResults(el, { shareUrl: shareUrl, dataUrl: dataUrl}), 1);
}

define(function() { return {init: init}; });
