(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var numberIsNan = require('number-is-nan');

module.exports = Number.isFinite || function (val) {
	return !(typeof val !== 'number' || numberIsNan(val) || val === Infinity || val === -Infinity);
};

},{"number-is-nan":3}],2:[function(require,module,exports){
'use strict';
var numberIsFinite = require('is-finite');

module.exports = Number.isInteger || function (x) {
	return numberIsFinite(x) && Math.floor(x) === x;
};

},{"is-finite":1}],3:[function(require,module,exports){
'use strict';
module.exports = Number.isNaN || function (x) {
	return x !== x;
};

},{}],4:[function(require,module,exports){
'use strict';
var numberIsInteger = require('number-is-integer');

function round(fn, x, precision) {
	if (typeof x !== 'number') {
		throw new TypeError('Expected value to be a number');
	}

	if (!numberIsInteger(precision)) {
		throw new TypeError('Expected precision to be an integer');
	}

	var exponent = precision > 0 ? 'e' : 'e-';
	var exponentNeg = precision > 0 ? 'e-' : 'e';
	precision = Math.abs(precision);

	return Number(Math[fn](x + exponent + precision) + exponentNeg + precision);
}

var fn = module.exports = round.bind(null, 'round');
fn.up = round.bind(null, 'ceil');
fn.down = round.bind(null, 'floor');

},{"number-is-integer":2}],5:[function(require,module,exports){
module.exports = function wapi () {

  /**
   * API Key 
   * @type {String}
   */
  this.APIkey = '625172310aff38a6';

  /**
   * String indicating which icon set from Weather Underground to use.
   * @type {String}
   */
  this.iconSet = 'i/';

  /**
   * Extensible Map of custom errors. Properties should be Objects or return an Object containing
   * at least a 'description' property.
   * @type {Object}
   */
  this.errorType = {

    /**
     * Provide an error for when the service returns multiple results for the search term.
     * @param  {Object}  exampleObj  One of the multiple results returned from the servie.
     * @return {Object}              An error object with a customized description field.
     */
    multipleResults: function (exampleObj) {
      var descriptionString = '';
      var searchTerm = exampleObj.name || exampleObj.city || '';
      var searchLocale = exampleObj.state || exampleObj.country || '';
      var fillerText = [];
      var verboseSearch;

      if (!searchTerm || !searchLocale) {
        fillerText = ['Portland, OR', 'Portland'];
      } else {
        verboseSearch = searchTerm + ', ' + searchLocale;
        fillerText = [verboseSearch, searchTerm];
      }

      descriptionString = 'Try a more descriptive search term, e.g. "' + verboseSearch + 
        '" instead of "' + searchTerm + '".';

      return {description: descriptionString};
    }
  };

  /**
   * Request data from the service.
   * @param  {Object}  reqObj  Request object received from the App, expects "place" property as the search term.
   * @return {Deferred}        jQuery Deferred() object
   */
  this.request = function (reqObj) {
    var Def = $.Deferred();
    var urlString = this.buildUrl(reqObj.place);
    $.ajax(urlString)
      .done(function (response) {
        Def.resolve(this.conform(response));
      }.bind(this))
      .fail(function () {
        Def.reject({error: {description: 'Sorry, we can\'t seem to download any weather information <br>because the internet won\'t answer its phone.'}});
      });

    return Def;
  };

  /**
   * Translate the response from the service to the object expected by the App.
   * @param  {Object}  responseObj  Data object received from the service.
   * @return {Object}               Object parsed to the format the app expects.
   */
  this.conform = function (responseObj) {
    var ret = {};

    if (responseObj.response.error) {
      ret.error = responseObj.response.error;
    } else {
      if (responseObj.response.results && responseObj.response.results.length > 1) {
        ret.error = this.errorType.multipleResults(responseObj.response.results[0]);
      }
      if (responseObj.current_observation) {
        var obsv = responseObj.current_observation;

        ret.placeName = obsv.display_location.full.toUpperCase();
        ret.specificPlace = obsv.observation_location.full.split(',')[0].toUpperCase().trim() + ', ' + ret.placeName;
        ret.tempString = obsv.temp_f.toString();
        ret.tempVal = obsv.temp_f;
        ret.iconUrl = this.buildIconUrl(obsv.icon, obsv.icon_url);
      }
    }

    return ret;
  };

  /**
   * Construct the url string for the AJAX request.
   * @param  {String}  searchString  The search term passed from the App.
   * @return {String}                The complete url for the AJAX request.
   */
  this.buildUrl = function (searchString) {
    var firstPart = 'http://api.wunderground.com/api/' + this.APIkey + '/conditions/q/';
    var lastPart = '.json';

    return firstPart + searchString + lastPart;
  };

  /**
   * Constructs the url for the weather icon based on the service response.
   * @param  {String}  iconType  String describing the type of icon to use.
   * @param  {String}  iconUrl   The default icon url received from the service.
   * @return {String}            The constructed url for the Weather Underground icon, using the specified icon set.
   */
  this.buildIconUrl = function (iconType, iconUrl) {
    iconType = iconUrl.indexOf('nt') === -1 ? iconType : 'nt_' + iconType;

    return 'http://icons.wxug.com/i/c/' + this.iconSet + iconType + '.gif';
  };
};
},{}],6:[function(require,module,exports){
module.exports = function App () {

  var WUAPI = require('./weather-underground-api.js');
  var roundto = require('round-to');

  return {
    /* These are two containers to store our results in */
    upperData: {},
    lowerData: {},

    /* This is a Class Property that tells the App if it needs to add specificity to PlaceName */
    specificPlaceNameNeeded: false,

    /* Initialize this! */
    init: function () {
      this.initSelectors();
      this.initListeners();
      this.weatherAPI = new WUAPI();
    },

    /* Identify selectors in markup */
    initSelectors: function () {
      this.upperData.$input = $('.input-container').find('input.js-upper');
      this.lowerData.$input = $('.input-container').find('input.js-lower');
      this.allInputs = this.upperData.$input.add(this.lowerData.$input);

      this.upperData.$output = $('.output-container').find('div.js-upper');
      this.lowerData.$output = $('.output-container').find('div.js-lower');

      this.$differenceCont = $('.container').find('.difference-container');
      this.$difference = $('.container').find('.difference-msg');
      this.$clearButton = $('.container').find('.clear-button');

      this.$errorContainer = $('.container').find('.error-container');
      this.$errorArrow = $('.container').find('.error-indicator');
    },

    /* Initialize the listeners on the selectors */
    initListeners: function () {
      this.allInputs.on('change', $.proxy(this.handleInputChange, this));
      this.allInputs.on('keyup', $.proxy(this.manageInputEntry, this));
      this.$clearButton.on('click touch', $.proxy(this.clearData, this));
    },  

    /**
     * Handle information being entered into the inputs
     * @param  {Event}  evt  jQuery event
     */
    handleInputChange: function (evt) {
      var $target = $(evt.target);
      var location = $target.val();
      var updateObject = $target.hasClass('js-upper') ? this.upperData : this.lowerData;

      updateObject.place = location;
      updateObject.error = null;

      if (location) {
        this.retrieveConditionsData(updateObject)
          .done($.proxy(this.populateTemplate, this))
          .fail($.proxy(this.handleError, this));
        }
    },

    /**
     * Listener on both inputs for responding to user interaction.  Clears error, adjusts font size.
     * @param  {jQuery}  evt  jQuery event.
     * @return {jQuery}       target of the jQuery event 
     */
    manageInputEntry: function (evt) {
      var $thisInput = $(evt.target);
      var entry = $thisInput.val();

      if (entry === '') this.handleError(entry);

      if (entry.length > 9) {
        $thisInput.addClass('smaller-input-text');
      } else {
        $thisInput.removeClass('smaller-input-text');
      }

      return $thisInput;
    },

    /**
     * Clears all data from the view.
     * @param  {jQuery}  evt  The jQuery event if needed
     */
    clearData: function (evt) {
      var blankObj = {
        placeName: '',
        tempString: '',
        tempVal: 0,
        iconUrl: '',
        error: {}
      };

      $.extend(this.upperData, blankObj);
      $.extend(this.lowerData, blankObj);

      this.allInputs.val('');

      this.clearTemplate(this.upperData, this.lowerData);
      this.clearComparison();
      this.clearErrors();
    },

    /**
     * Pass the object to be updated to the Weather API to get new data.
     * @param  {Object}  updateObject  The container to be updated with new data
     * @return {Promise}               Returns Promise
     */
    retrieveConditionsData: function (updateObject) {
      var Def = $.Deferred();

      this.weatherAPI.request(updateObject)
        .done(function (responseObj) {
          Def.resolve($.extend(updateObject, responseObj));
        })
        .fail(function (error) {
          Def.reject($.extend(updateObject, error));
        });

      return Def;
    },

    /**
     * Populate the template with the data received from the API
     * @param  {Object}  data  Formatted object received from weather API
     */
    populateTemplate: function (data) {
      if (data.error) {
        this.handleError(data);
      } else {
        this.clearErrors();
        var $outputCont = data.$output;

        // Check to see if this new placeName is the same as the existing placeName
        this.specificPlaceNameNeeded = this.upperData.placeName === this.lowerData.placeName &&
          this.upperData.specificPlace !== this.lowerData.specificPlace;

        $outputCont.find('.city-name').html(data.placeName);
        $outputCont.find('.local-temp').html(this.markupTemperature(data.tempString));
        $outputCont.find('.img-container')
          .empty()
          .append($('<img>', {
            src: data.iconUrl
          }));

        this.updatePlaceNames(this.upperData, this.lowerData);

        if (this.upperData.tempVal && this.lowerData.tempVal) {
          this.compareTwoLocations();
        }
      }
    },

    /**
     * Clears a single template of data.
     * @param  {Arguments}  args  Expects one or more data objects as Arguments
     */
    clearTemplate: function (args) {
      var $outputCont;

      for (var i=0; i < arguments.length; i++) {
        $outputCont = arguments[i].$output;

        $outputCont.find('.city-name').html('');
        $outputCont.find('.local-temp').html('');
        $outputCont.find('.img-container').empty();
      }

    },

    /**
     * Specifically targets the displayed location name, adds more specificity if the two displayed
     * places are identical.
     * @param  {Arguments}  args  Expects one or more data objects as Arguments.
     */
    updatePlaceNames: function (args) {
      var addSpecificity = this.specificPlaceNameNeeded;
      var outputObj;
      var propToAdd = addSpecificity ? 'specificPlace' : 'placeName';

      for (var i=0; i < arguments.length; i++) {
        outputObj = arguments[i];
        outputObj.$output.find('.city-name').html(outputObj[propToAdd]);
        outputObj.isSpecific = addSpecificity;
      }
    },

    /**
     * Builds the mark up for the temperature string; wraps portions of the markup in HTML elements
     * for styling.
     * @param  {String}  temperatureString  A string descriping the temperature in degrees F, e.g. '48.5'.
     * @return {String}                     A string formatted with HTML wrapping.
     */
    markupTemperature: function (temperatureString) {
      var markupFormat = '<span class="narrow-deg">&deg;</span><span class="small-f">F</span>';
      var formattedString = '';

      if (temperatureString) {
        formattedString = temperatureString + markupFormat;
      }

      return formattedString;
    },

    /**
     * Performs mathematical comparison between the two existing data object temperature values.
     * Calls the population method with the difference and a boolean that is true if the upper data
     * is warmer than the lower.
     */
    compareTwoLocations: function () {
      var diff = roundto(this.upperData.tempVal - this.lowerData.tempVal, 1);
      var abs = Math.abs(diff).toString();
      var topIsWarmer = diff > 0;

      this.populateComparison(abs, topIsWarmer);
    },    

    /**
     * Un-displays the error popup and re-sets it.
     */
    clearErrors: function () {
      this.$errorContainer.html('').addClass('hidden');
      this.$errorArrow.removeClass('upper lower').addClass('hidden');
    },

    /**
     * Populates the comparison template of the view.
     * @param  {String}  difference  String describing the difference in temperature between the two 
     *                               entered locations.
     * @param  {boolean} topIsWarmer Boolean describing whether the "upper" data object is warmer than
     *                               the lower.
     */
    populateComparison: function (difference, topIsWarmer) {
      var comparisonString;
      var diffString = 'is <span class="larger-deg">%d&deg;</span>';
      var topWarmer = ' warmer than';
      var topCooler = ' cooler than';
      var sameString = 'is the same temperature as';

      if (difference) {
        comparisonString = topIsWarmer ? topWarmer : topCooler;
        diffString = diffString.replace('%d', difference);

        this.$difference.html(diffString + comparisonString);
      } else {
        this.$difference.html(sameString);
      }

      this.$differenceCont.removeClass('hidden');
    },

    /**
     * Empties the comparison template
     */
    clearComparison: function () {
      this.$difference.html('');
      this.$differenceCont.addClass('hidden');
    },

    /**
     * View method to add or clear errors received from the Service or initiated by the view. 
     * @param  {Object or ''}  error  Either the data object with an 'error' parameter (to add the error)
     *                                or a falsey value to remove the error.
     */
    handleError: function (error) {
      if (error && error.error) {
        var indicatorClass = error.$input.hasClass('js-upper') ? 'upper' : 'lower';
        this.$errorContainer.html(error.error.description).removeClass('hidden');
        this.$errorArrow.removeClass('upper lower').addClass(indicatorClass).removeClass('hidden');
        this.clearTemplate(error);
        this.clearComparison();
      } else {
        this.clearErrors();
      }
    }
  };
}
},{"./weather-underground-api.js":5,"round-to":4}],7:[function(require,module,exports){
module.exports =
{
  "response": {
  "version": "0.1",
  "termsofService": "http://www.wunderground.com/weather/api/d/terms.html",
  "features": {
  "conditions": 1
  }
  },
  "current_observation": {
  "image": {
  "url": "http://icons-ak.wxug.com/graphics/wu2/logo_130x80.png",
  "title": "Weather Underground",
  "link": "http://www.wunderground.com"
  },
  "display_location": {
  "full": "San Francisco, CA",
  "city": "San Francisco",
  "state": "CA",
  "state_name": "California",
  "country": "US",
  "country_iso3166": "US",
  "zip": "94101",
  "latitude": "37.77500916",
  "longitude": "-122.41825867",
  "elevation": "47.00000000"
  },
  "observation_location": {
  "full": "SOMA - Near Van Ness, San Francisco, California",
  "city": "SOMA - Near Van Ness, San Francisco",
  "state": "California",
  "country": "US",
  "country_iso3166": "US",
  "latitude": "37.773285",
  "longitude": "-122.417725",
  "elevation": "49 ft"
  },
  "estimated": {},
  "station_id": "KCASANFR58",
  "observation_time": "Last Updated on June 27, 5:27 PM PDT",
  "observation_time_rfc822": "Wed, 27 Jun 2012 17:27:13 -0700",
  "observation_epoch": "1340843233",
  "local_time_rfc822": "Wed, 27 Jun 2012 17:27:14 -0700",
  "local_epoch": "1340843234",
  "local_tz_short": "PDT",
  "local_tz_long": "America/Los_Angeles",
  "local_tz_offset": "-0700",
  "weather": "Partly Cloudy",
  "temperature_string": "66.3 F (19.1 C)",
  "temp_f": 66.3,
  "temp_c": 19.1,
  "relative_humidity": "65%",
  "wind_string": "From the NNW at 22.0 MPH Gusting to 28.0 MPH",
  "wind_dir": "NNW",
  "wind_degrees": 346,
  "wind_mph": 22.0,
  "wind_gust_mph": "28.0",
  "wind_kph": 35.4,
  "wind_gust_kph": "45.1",
  "pressure_mb": "1013",
  "pressure_in": "29.93",
  "pressure_trend": "+",
  "dewpoint_string": "54 F (12 C)",
  "dewpoint_f": 54,
  "dewpoint_c": 12,
  "heat_index_string": "NA",
  "heat_index_f": "NA",
  "heat_index_c": "NA",
  "windchill_string": "NA",
  "windchill_f": "NA",
  "windchill_c": "NA",
  "feelslike_string": "66.3 F (19.1 C)",
  "feelslike_f": "66.3",
  "feelslike_c": "19.1",
  "visibility_mi": "10.0",
  "visibility_km": "16.1",
  "solarradiation": "",
  "UV": "5",
  "precip_1hr_string": "0.00 in ( 0 mm)",
  "precip_1hr_in": "0.00",
  "precip_1hr_metric": " 0",
  "precip_today_string": "0.00 in (0 mm)",
  "precip_today_in": "0.00",
  "precip_today_metric": "0",
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "forecast_url": "http://www.wunderground.com/US/CA/San_Francisco.html",
  "history_url": "http://www.wunderground.com/history/airport/KCASANFR58/2012/6/27/DailyHistory.html",
  "ob_url": "http://www.wunderground.com/cgi-bin/findweather/getForecast?query=37.773285,-122.417725"
  }
}
},{}],8:[function(require,module,exports){
var Q = QUnit;

var App = require('../scripts/weatherOr.js');
var WUApi = require('../scripts/weather-underground-api.js');
var mockApiResponse = require('./mock-response.js');

var markupFixtures = {
  base: '#qunit-fixture',
  allInputs: '<div class="input-container"><input class="js-upper" /><input class="js-lower" /></div>',
  clearButton: '<div class="container"><div class="clear-button"></div></div>',
  lowerInput: '<input class="js-lower" />',
  lowerOutput: '<div class="output-container"><div class="js-lower"></div></div>',
  errorContainer: '<div class="error-container"></div>',
  errorArrow: '<div class="error-arrow"></div>'
};

var emptyFxt = function () {
  $(markupFixtures.base).empty();
};

var mockDeferred = function () {
  return {
    done: function () {return this;},
    fail: function () {return this;}
  };
}


// Test of weatherOr.js
Q.test( 'Init should invoke initSelectors and initListeners', function(assert) {
  var weatherTest = new App();
  var selectorSpy = this.spy(weatherTest, 'initSelectors');
  var listenerSpy = this.spy(weatherTest, 'initListeners');

  weatherTest.init();

  assert.ok(weatherTest.initSelectors.calledOnce && weatherTest.initListeners.calledOnce, 'passed');
});

Q.test( 'Init should instantiate a new weather API', function (assert) {
  var weatherTest = new App();

  weatherTest.init();

  assert.ok(typeof weatherTest.weatherAPI === 'object', 'passed');
});

Q.test( 'initSelectors should populate the app\'s data objects', function (assert) {
  var upperData, lowerData, allInputs, udInput, udOutput, ldInput, ldOutput, difference, diffMsg, 
    clearBtn, errCont, errArrow;
  var elementsArray;
  var allElementsValid = true;

  var weatherTest = new App();
  weatherTest.initSelectors();

  upperData = weatherTest.upperData;
  lowerData = weatherTest.lowerData;
  allInputs = weatherTest.allInputs;
  udInput = upperData.$input;
  udOutput = upperData.$output;
  ldInput = lowerData.$input;
  ldOutput = lowerData.$output;
  difference = weatherTest.$differenceCont;
  diffMsg = weatherTest.$difference;
  clearBtn = weatherTest.$clearButton;
  errCont = weatherTest.$errorContainer;
  errArrow = weatherTest.$errorArrow;

  elementsArray = [allInputs, udInput, udOutput, ldInput, ldOutput, difference, diffMsg, 
    clearBtn, errCont, errArrow];

  for (var i=0; i < elementsArray.length; i++) {
    if (!(elementsArray[i] instanceof jQuery)) {
      allElementsValid = false;
      break;
    }
  }

  assert.ok(allElementsValid, 'passed');
});

Q.test( 'initListeners should set a change listener on allInputs ', function (assert) {
  var weatherTest = new App();
  var proxySpy = this.spy($, 'proxy');

  $(markupFixtures.base).append($(markupFixtures.allInputs));
  $(markupFixtures.base).append($(markupFixtures.clearButton));
  weatherTest.allInputs = $(markupFixtures.allInputs);
  weatherTest.$clearButton = $(markupFixtures.clearButton);

  weatherTest.initListeners();

  $(markupFixtures.lowerInput).click();
  $(markupFixtures.allInputs).trigger('change');
  $(markupFixtures.clearButton).click();

  assert.ok(proxySpy.calledWith(weatherTest.handleInputChange), 'input change passed');
  assert.ok(proxySpy.calledWith(weatherTest.manageInputEntry), 'input entry passed');
  assert.ok(proxySpy.calledWith(weatherTest.clearData), 'clear button click passed');
  assert.ok(proxySpy.args.length === 3, 'three calls to proxy passed');
  emptyFxt();
});

Q.test( 'handleInputChange should call retrieve conditions with correct data', function (assert) {
  var mockEvent, passedObj;
  var weatherTest = new App();
  var retrieveConditionsSpy = this.stub(weatherTest, 'retrieveConditionsData', mockDeferred);

  var targetEl = $(markupFixtures.base).append($(markupFixtures.lowerInput));
  targetEl.val('hogwarts');

  mockEvent = {
    target: targetEl
  }

  weatherTest.handleInputChange(mockEvent);

  passedObj = retrieveConditionsSpy.args[0][0];

  assert.ok(passedObj.place === 'hogwarts', 'place value passed');
  assert.ok(passedObj.error === null, 'reset error passed');
  emptyFxt();
});

Q.test( 'manageInputEntry should handle error, or add / remove classes based on length', function (assert) {
  var mockEvent, targetEl, addClassSpy, removeClassSpy, zeroLength, overNine, underNine;
  var weatherTest = new App();
  var handleErrorSpy = this.stub(weatherTest, 'handleError');

  $(markupFixtures.base).append($(markupFixtures.lowerInput));
  targetEl = $(markupFixtures.lowerInput);
  
  mockEvent = {
    target: targetEl
  }

  targetEl.val(''); // Zero length entry
  zeroLength = weatherTest.manageInputEntry(mockEvent);
  assert.ok(handleErrorSpy.calledOnce && handleErrorSpy.calledWith(''), 'empty string, handle error passed');

  targetEl.val('nineCharactersOrMore'); // Over nine characters
  overNine = weatherTest.manageInputEntry(mockEvent);
  assert.ok(overNine.hasClass('smaller-input-text'), 'long string, small font class added');

  targetEl.val('short'); // Under nine characters
  underNine = weatherTest.manageInputEntry(mockEvent);
  assert.ok(!underNine.hasClass('smaller-input-text'), 'short string, small font class removed');

  emptyFxt();
});

Q.test('clearData should empty data objects, empty the inputs, and invoke subordinate fnctions', function (assert) {
  var weatherTest = new App();
  var clearTemplateStub = this.stub(weatherTest, 'clearTemplate');
  var clearCompasrisonStub = this.stub(weatherTest, 'clearComparison');
  var clearErrorStub = this.stub(weatherTest, 'clearErrors');
  var blankObjFixture = {
    placeName: '',
    tempString: '',
    tempVal: 0,
    iconUrl: '',
    error: {}
  }

  weatherTest.allInputs = $(markupFixtures.base).append($(markupFixtures.allInputs).val('4 privet drive'))

  weatherTest.upperData = {
    placeName: 'hogwarts',
    tempString: 'chilly',
    tempVal: 7,
    iconUrl: 'mirror_of_erised',
    error: {description: 'What would I get if I added powdered root of asphodel to an infusion of wormwood?'}
  }

  weatherTest.clearData();

  assert.deepEqual(weatherTest.upperData, blankObjFixture, 'blank out data object passed');
  assert.ok(weatherTest.allInputs.val() === '', 'empty inputs passed');
  assert.ok(clearTemplateStub.calledOnce, 'clearTemplate call passed');
  assert.ok(clearCompasrisonStub.calledOnce, 'clearComparison call passed');
  assert.ok(clearErrorStub.calledOnce, 'clearErrors call passed');
});

Q.test('retrieveConditionsData should invoke request from the weatherAPI with the provided data', function (assert) {
  var apiRequestStub;
  var weatherTest = new App();

  weatherTest.weatherAPI = { request: mockDeferred };
  apiRequestStub = this.spy(weatherTest.weatherAPI, 'request');

  var testObj = {
    place: 'mos eisley',
    error: null
  }

  weatherTest.retrieveConditionsData(testObj);

  assert.ok(apiRequestStub.calledWith(testObj), 'correct object passed to request, passed');
});

Q.test('populateTemplate should call handleError if there is an error property', function (assert) {
  var weatherTest = new App();
  var handleErrorSpy = this.stub(weatherTest, 'handleError');
  var errorTestObj = {
    placeName: 'mos eisley',
    error: {description: 'This is a wretched hive of scum and villainy'}
  }

  weatherTest.populateTemplate(errorTestObj);

  assert.ok(handleErrorSpy.calledWith(errorTestObj), 'called handleError when object has error prop, passed');
});

Q.test('populateTemplate should call update the template, and call subordinate methods', function (assert) {
  var testObj, testLwrOutput;
  var weatherTest = new App();
  var clearErrorStub = this.stub(weatherTest, 'clearErrors');
  var markupTemperatureStub = this.stub(weatherTest, 'markupTemperature');
  var updatePlaceNameStub = this.stub(weatherTest, 'updatePlaceNames');
  var compareTwoLocationStub = this.stub(weatherTest, 'compareTwoLocations');

  $(markupFixtures.base).append($(markupFixtures.lowerOutput));

  testLwrOutput = $(markupFixtures.lowerOutput);

  testObj = {
    placeName: 'gondor',
    tempString: 'stormy',
    tempVal: 97,
    iconUrl: '',
    $output: testLwrOutput
  };

  weatherTest.upperData.tempVal = 99;
  weatherTest.lowerData.tempVal = 97;


  weatherTest.populateTemplate(testObj);

  assert.ok(clearErrorStub.calledOnce, 'clear errors call passed');
  assert.ok(markupTemperatureStub.calledWith(testObj.tempString), 'markup temperatures call passed');
  assert.ok(updatePlaceNameStub.calledOnce, 'update place names call passed');
  assert.ok(compareTwoLocationStub.calledOnce, 'compare two locations call passed');
});

Q.test('markupTemperature should return a marked up string', function (assert) {
  var weatherTest = new App();

  var expectedString = {
    formatted: '48.5<span class="narrow-deg">&deg;</span><span class="small-f">F</span>',
    raw: 48.5
  };

  var returnedString = weatherTest.markupTemperature(expectedString.raw);

  assert.deepEqual(returnedString, expectedString.formatted, 'string markup passed');
});

Q.test('handleError should call clearErrors if passed a falsey value or an object with no error prop', function (assert) {
  var weatherTest = new App();
  var clearErrorStub = this.stub(weatherTest, 'clearErrors');
  var testObjNoError = {
    placeName: 'district 13',
    tempString: 'snowy',
    tempVal: 13
  };

  weatherTest.handleError('');
  weatherTest.handleError(testObjNoError);
  weatherTest.handleError(0);

  assert.ok(clearErrorStub.args.length === 3, 'called for three falsey values, passed');
});

Q.test('handleError should call clearTemplate and clearComparison if error object is passed', function (assert) {
  var testObjError, lowerInputEl;
  var weatherTest = new App();
  var clearTemplateStub = this.stub(weatherTest, 'clearTemplate');
  var clearCompasrisonStub = this.stub(weatherTest, 'clearComparison')

  $(markupFixtures.base).append($(markupFixtures.lowerInput));
  lowerInputEl = $(markupFixtures.lowerInput);

  testObjError = {
    placeName: '',
    error: {description: 'no place name, oops'},
    $input: lowerInputEl
  };

  weatherTest.$errorContainer = $(markupFixtures.base).append($(markupFixtures.errorContainer));
  weatherTest.$errorArrow = $(markupFixtures.base).append($(markupFixtures.errorArrow));

  weatherTest.handleError(testObjError);

  assert.ok(clearTemplateStub.calledWith(testObjError), 'clear template called with object, passed');
  assert.ok(clearCompasrisonStub.calledOnce, 'clear comparison called, passed');
});

// Test of weather-underground-api.js
Q.test('request should call weather underground with ajax', function (assert) {
  var apiTest = new WUApi();
  var buildUrlStub = this.stub(apiTest, 'buildUrl', function () {return 'api_test';});
  var ajaxStub = this.stub($, 'ajax', mockDeferred);
  var testReqObj = {
    place: 'mordor'
  }

  apiTest.request(testReqObj);

  assert.ok(buildUrlStub.calledWith(testReqObj.place), 'build url call passed');
  assert.ok(ajaxStub.calledWith('api_test'), 'ajax call passed');
});

Q.test('conform manipulates the object passed, returning an error if present or formatting the object correctly', function (assert) {
  var successTest, errorTest, multipleResultsTest;
  var apiTest = new WUApi();
  
  var iconStubString = function () {return 'icon_url_test';};
  var buildIconUrlStub = this.stub(apiTest, 'buildIconUrl', iconStubString);
  var multipleResultStub = this.stub(apiTest.errorType, 'multipleResults');

  var mockResponse = mockApiResponse;
  var mockErrorResponse = {description: 'cannot see too foggy'};
  var mockResultsResponse = [{name: 'first_object'}, {name: 'second_object'}];
  var successFixtureObj = {
    placeName: 'SAN FRANCISCO, CA',
    specificPlace: 'SOMA - NEAR VAN NESS, SAN FRANCISCO, CA',
    tempString: '66.3',
    tempVal: 66.3,
    iconUrl: iconStubString()
  }

  // Fist call the method with expected behavior
  successTest = apiTest.conform(mockResponse);
  // And declare the assertions for expected behavior
  assert.deepEqual(successTest, successFixtureObj, 'successful call passed');

  // Add multiple results to the response and call the method
  mockResponse.response.results = mockResultsResponse;
  multipleResultsTest = apiTest.conform(mockResponse);
  // Declare the assertions for multiple results
  assert.ok(multipleResultStub.calledWith(mockResultsResponse[0]), 'call with multiple results passed');

  // Add the error object and call the method
  mockResponse.response.error = mockErrorResponse;
  errorTest = apiTest.conform(mockResponse);
  assert.deepEqual(errorTest, {"error": mockErrorResponse}, 'call with error prop passed');
});

Q.test('buildUrl should combine the API Key and the search term to build the url for ajax', function (assert) {
  var testResult;
  var apiTest = new WUApi();
  var urlFixture = 'http://api.wunderground.com/api/12345/conditions/q/mordor.json';
  var searchTerm = 'mordor';

  apiTest.APIkey = '12345';

  testResult = apiTest.buildUrl(searchTerm);

  assert.deepEqual(testResult, urlFixture, 'build url string correctly, passed');
});

Q.test('buildIconUrl checks default icon url for night time designation, then builds correctly', function (assert) {
  var dayTestResult, nightTestResult;
  var apiTest = new WUApi();
  var iconType = 'clear';
  var dayTestString = 'cloudy.gif';
  var nightTestString = 'nt_cloudy.gif';
  var iconUrlDayFixture = 'http://icons.wxug.com/i/c/bilbo/clear.gif';
  var iconUrlNightFixture = 'http://icons.wxug.com/i/c/bilbo/nt_clear.gif';

  apiTest.iconSet = 'bilbo/';

  dayTestResult = apiTest.buildIconUrl(iconType, dayTestString);
  nightTestResult = apiTest.buildIconUrl(iconType, nightTestString);

  assert.deepEqual(dayTestResult, iconUrlDayFixture, 'build icon url for day passed');
  assert.deepEqual(nightTestResult, iconUrlNightFixture, 'build icon url for night passed');
});
},{"../scripts/weather-underground-api.js":5,"../scripts/weatherOr.js":6,"./mock-response.js":7}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaXMtZmluaXRlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL251bWJlci1pcy1pbnRlZ2VyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL251bWJlci1pcy1uYW4vaW5kZXguanMiLCJub2RlX21vZHVsZXMvcm91bmQtdG8vaW5kZXguanMiLCJzY3JpcHRzL3dlYXRoZXItdW5kZXJncm91bmQtYXBpLmpzIiwic2NyaXB0cy93ZWF0aGVyT3IuanMiLCJ0ZXN0L21vY2stcmVzcG9uc2UuanMiLCJ0ZXN0L3Rlc3RzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcbnZhciBudW1iZXJJc05hbiA9IHJlcXVpcmUoJ251bWJlci1pcy1uYW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXIuaXNGaW5pdGUgfHwgZnVuY3Rpb24gKHZhbCkge1xuXHRyZXR1cm4gISh0eXBlb2YgdmFsICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hbih2YWwpIHx8IHZhbCA9PT0gSW5maW5pdHkgfHwgdmFsID09PSAtSW5maW5pdHkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBudW1iZXJJc0Zpbml0ZSA9IHJlcXVpcmUoJ2lzLWZpbml0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlci5pc0ludGVnZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0cmV0dXJuIG51bWJlcklzRmluaXRlKHgpICYmIE1hdGguZmxvb3IoeCkgPT09IHg7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gKHgpIHtcblx0cmV0dXJuIHggIT09IHg7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG51bWJlcklzSW50ZWdlciA9IHJlcXVpcmUoJ251bWJlci1pcy1pbnRlZ2VyJyk7XG5cbmZ1bmN0aW9uIHJvdW5kKGZuLCB4LCBwcmVjaXNpb24pIHtcblx0aWYgKHR5cGVvZiB4ICE9PSAnbnVtYmVyJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIHZhbHVlIHRvIGJlIGEgbnVtYmVyJyk7XG5cdH1cblxuXHRpZiAoIW51bWJlcklzSW50ZWdlcihwcmVjaXNpb24pKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgcHJlY2lzaW9uIHRvIGJlIGFuIGludGVnZXInKTtcblx0fVxuXG5cdHZhciBleHBvbmVudCA9IHByZWNpc2lvbiA+IDAgPyAnZScgOiAnZS0nO1xuXHR2YXIgZXhwb25lbnROZWcgPSBwcmVjaXNpb24gPiAwID8gJ2UtJyA6ICdlJztcblx0cHJlY2lzaW9uID0gTWF0aC5hYnMocHJlY2lzaW9uKTtcblxuXHRyZXR1cm4gTnVtYmVyKE1hdGhbZm5dKHggKyBleHBvbmVudCArIHByZWNpc2lvbikgKyBleHBvbmVudE5lZyArIHByZWNpc2lvbik7XG59XG5cbnZhciBmbiA9IG1vZHVsZS5leHBvcnRzID0gcm91bmQuYmluZChudWxsLCAncm91bmQnKTtcbmZuLnVwID0gcm91bmQuYmluZChudWxsLCAnY2VpbCcpO1xuZm4uZG93biA9IHJvdW5kLmJpbmQobnVsbCwgJ2Zsb29yJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdhcGkgKCkge1xuXG4gIC8qKlxuICAgKiBBUEkgS2V5IFxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdGhpcy5BUElrZXkgPSAnNjI1MTcyMzEwYWZmMzhhNic7XG5cbiAgLyoqXG4gICAqIFN0cmluZyBpbmRpY2F0aW5nIHdoaWNoIGljb24gc2V0IGZyb20gV2VhdGhlciBVbmRlcmdyb3VuZCB0byB1c2UuXG4gICAqIEB0eXBlIHtTdHJpbmd9XG4gICAqL1xuICB0aGlzLmljb25TZXQgPSAnaS8nO1xuXG4gIC8qKlxuICAgKiBFeHRlbnNpYmxlIE1hcCBvZiBjdXN0b20gZXJyb3JzLiBQcm9wZXJ0aWVzIHNob3VsZCBiZSBPYmplY3RzIG9yIHJldHVybiBhbiBPYmplY3QgY29udGFpbmluZ1xuICAgKiBhdCBsZWFzdCBhICdkZXNjcmlwdGlvbicgcHJvcGVydHkuXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICB0aGlzLmVycm9yVHlwZSA9IHtcblxuICAgIC8qKlxuICAgICAqIFByb3ZpZGUgYW4gZXJyb3IgZm9yIHdoZW4gdGhlIHNlcnZpY2UgcmV0dXJucyBtdWx0aXBsZSByZXN1bHRzIGZvciB0aGUgc2VhcmNoIHRlcm0uXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSAgZXhhbXBsZU9iaiAgT25lIG9mIHRoZSBtdWx0aXBsZSByZXN1bHRzIHJldHVybmVkIGZyb20gdGhlIHNlcnZpZS5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgICBBbiBlcnJvciBvYmplY3Qgd2l0aCBhIGN1c3RvbWl6ZWQgZGVzY3JpcHRpb24gZmllbGQuXG4gICAgICovXG4gICAgbXVsdGlwbGVSZXN1bHRzOiBmdW5jdGlvbiAoZXhhbXBsZU9iaikge1xuICAgICAgdmFyIGRlc2NyaXB0aW9uU3RyaW5nID0gJyc7XG4gICAgICB2YXIgc2VhcmNoVGVybSA9IGV4YW1wbGVPYmoubmFtZSB8fCBleGFtcGxlT2JqLmNpdHkgfHwgJyc7XG4gICAgICB2YXIgc2VhcmNoTG9jYWxlID0gZXhhbXBsZU9iai5zdGF0ZSB8fCBleGFtcGxlT2JqLmNvdW50cnkgfHwgJyc7XG4gICAgICB2YXIgZmlsbGVyVGV4dCA9IFtdO1xuICAgICAgdmFyIHZlcmJvc2VTZWFyY2g7XG5cbiAgICAgIGlmICghc2VhcmNoVGVybSB8fCAhc2VhcmNoTG9jYWxlKSB7XG4gICAgICAgIGZpbGxlclRleHQgPSBbJ1BvcnRsYW5kLCBPUicsICdQb3J0bGFuZCddO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmVyYm9zZVNlYXJjaCA9IHNlYXJjaFRlcm0gKyAnLCAnICsgc2VhcmNoTG9jYWxlO1xuICAgICAgICBmaWxsZXJUZXh0ID0gW3ZlcmJvc2VTZWFyY2gsIHNlYXJjaFRlcm1dO1xuICAgICAgfVxuXG4gICAgICBkZXNjcmlwdGlvblN0cmluZyA9ICdUcnkgYSBtb3JlIGRlc2NyaXB0aXZlIHNlYXJjaCB0ZXJtLCBlLmcuIFwiJyArIHZlcmJvc2VTZWFyY2ggKyBcbiAgICAgICAgJ1wiIGluc3RlYWQgb2YgXCInICsgc2VhcmNoVGVybSArICdcIi4nO1xuXG4gICAgICByZXR1cm4ge2Rlc2NyaXB0aW9uOiBkZXNjcmlwdGlvblN0cmluZ307XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXF1ZXN0IGRhdGEgZnJvbSB0aGUgc2VydmljZS5cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgcmVxT2JqICBSZXF1ZXN0IG9iamVjdCByZWNlaXZlZCBmcm9tIHRoZSBBcHAsIGV4cGVjdHMgXCJwbGFjZVwiIHByb3BlcnR5IGFzIHRoZSBzZWFyY2ggdGVybS5cbiAgICogQHJldHVybiB7RGVmZXJyZWR9ICAgICAgICBqUXVlcnkgRGVmZXJyZWQoKSBvYmplY3RcbiAgICovXG4gIHRoaXMucmVxdWVzdCA9IGZ1bmN0aW9uIChyZXFPYmopIHtcbiAgICB2YXIgRGVmID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciB1cmxTdHJpbmcgPSB0aGlzLmJ1aWxkVXJsKHJlcU9iai5wbGFjZSk7XG4gICAgJC5hamF4KHVybFN0cmluZylcbiAgICAgIC5kb25lKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICBEZWYucmVzb2x2ZSh0aGlzLmNvbmZvcm0ocmVzcG9uc2UpKTtcbiAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRGVmLnJlamVjdCh7ZXJyb3I6IHtkZXNjcmlwdGlvbjogJ1NvcnJ5LCB3ZSBjYW5cXCd0IHNlZW0gdG8gZG93bmxvYWQgYW55IHdlYXRoZXIgaW5mb3JtYXRpb24gPGJyPmJlY2F1c2UgdGhlIGludGVybmV0IHdvblxcJ3QgYW5zd2VyIGl0cyBwaG9uZS4nfX0pO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4gRGVmO1xuICB9O1xuXG4gIC8qKlxuICAgKiBUcmFuc2xhdGUgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZpY2UgdG8gdGhlIG9iamVjdCBleHBlY3RlZCBieSB0aGUgQXBwLlxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICByZXNwb25zZU9iaiAgRGF0YSBvYmplY3QgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmljZS5cbiAgICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICAgIE9iamVjdCBwYXJzZWQgdG8gdGhlIGZvcm1hdCB0aGUgYXBwIGV4cGVjdHMuXG4gICAqL1xuICB0aGlzLmNvbmZvcm0gPSBmdW5jdGlvbiAocmVzcG9uc2VPYmopIHtcbiAgICB2YXIgcmV0ID0ge307XG5cbiAgICBpZiAocmVzcG9uc2VPYmoucmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgIHJldC5lcnJvciA9IHJlc3BvbnNlT2JqLnJlc3BvbnNlLmVycm9yO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocmVzcG9uc2VPYmoucmVzcG9uc2UucmVzdWx0cyAmJiByZXNwb25zZU9iai5yZXNwb25zZS5yZXN1bHRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmV0LmVycm9yID0gdGhpcy5lcnJvclR5cGUubXVsdGlwbGVSZXN1bHRzKHJlc3BvbnNlT2JqLnJlc3BvbnNlLnJlc3VsdHNbMF0pO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3BvbnNlT2JqLmN1cnJlbnRfb2JzZXJ2YXRpb24pIHtcbiAgICAgICAgdmFyIG9ic3YgPSByZXNwb25zZU9iai5jdXJyZW50X29ic2VydmF0aW9uO1xuXG4gICAgICAgIHJldC5wbGFjZU5hbWUgPSBvYnN2LmRpc3BsYXlfbG9jYXRpb24uZnVsbC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICByZXQuc3BlY2lmaWNQbGFjZSA9IG9ic3Yub2JzZXJ2YXRpb25fbG9jYXRpb24uZnVsbC5zcGxpdCgnLCcpWzBdLnRvVXBwZXJDYXNlKCkudHJpbSgpICsgJywgJyArIHJldC5wbGFjZU5hbWU7XG4gICAgICAgIHJldC50ZW1wU3RyaW5nID0gb2Jzdi50ZW1wX2YudG9TdHJpbmcoKTtcbiAgICAgICAgcmV0LnRlbXBWYWwgPSBvYnN2LnRlbXBfZjtcbiAgICAgICAgcmV0Lmljb25VcmwgPSB0aGlzLmJ1aWxkSWNvblVybChvYnN2Lmljb24sIG9ic3YuaWNvbl91cmwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCB0aGUgdXJsIHN0cmluZyBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgc2VhcmNoU3RyaW5nICBUaGUgc2VhcmNoIHRlcm0gcGFzc2VkIGZyb20gdGhlIEFwcC5cbiAgICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgICAgICAgICBUaGUgY29tcGxldGUgdXJsIGZvciB0aGUgQUpBWCByZXF1ZXN0LlxuICAgKi9cbiAgdGhpcy5idWlsZFVybCA9IGZ1bmN0aW9uIChzZWFyY2hTdHJpbmcpIHtcbiAgICB2YXIgZmlyc3RQYXJ0ID0gJ2h0dHA6Ly9hcGkud3VuZGVyZ3JvdW5kLmNvbS9hcGkvJyArIHRoaXMuQVBJa2V5ICsgJy9jb25kaXRpb25zL3EvJztcbiAgICB2YXIgbGFzdFBhcnQgPSAnLmpzb24nO1xuXG4gICAgcmV0dXJuIGZpcnN0UGFydCArIHNlYXJjaFN0cmluZyArIGxhc3RQYXJ0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIHRoZSB1cmwgZm9yIHRoZSB3ZWF0aGVyIGljb24gYmFzZWQgb24gdGhlIHNlcnZpY2UgcmVzcG9uc2UuXG4gICAqIEBwYXJhbSAge1N0cmluZ30gIGljb25UeXBlICBTdHJpbmcgZGVzY3JpYmluZyB0aGUgdHlwZSBvZiBpY29uIHRvIHVzZS5cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgaWNvblVybCAgIFRoZSBkZWZhdWx0IGljb24gdXJsIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZpY2UuXG4gICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICBUaGUgY29uc3RydWN0ZWQgdXJsIGZvciB0aGUgV2VhdGhlciBVbmRlcmdyb3VuZCBpY29uLCB1c2luZyB0aGUgc3BlY2lmaWVkIGljb24gc2V0LlxuICAgKi9cbiAgdGhpcy5idWlsZEljb25VcmwgPSBmdW5jdGlvbiAoaWNvblR5cGUsIGljb25VcmwpIHtcbiAgICBpY29uVHlwZSA9IGljb25VcmwuaW5kZXhPZignbnQnKSA9PT0gLTEgPyBpY29uVHlwZSA6ICdudF8nICsgaWNvblR5cGU7XG5cbiAgICByZXR1cm4gJ2h0dHA6Ly9pY29ucy53eHVnLmNvbS9pL2MvJyArIHRoaXMuaWNvblNldCArIGljb25UeXBlICsgJy5naWYnO1xuICB9O1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEFwcCAoKSB7XG5cbiAgdmFyIFdVQVBJID0gcmVxdWlyZSgnLi93ZWF0aGVyLXVuZGVyZ3JvdW5kLWFwaS5qcycpO1xuICB2YXIgcm91bmR0byA9IHJlcXVpcmUoJ3JvdW5kLXRvJyk7XG5cbiAgcmV0dXJuIHtcbiAgICAvKiBUaGVzZSBhcmUgdHdvIGNvbnRhaW5lcnMgdG8gc3RvcmUgb3VyIHJlc3VsdHMgaW4gKi9cbiAgICB1cHBlckRhdGE6IHt9LFxuICAgIGxvd2VyRGF0YToge30sXG5cbiAgICAvKiBUaGlzIGlzIGEgQ2xhc3MgUHJvcGVydHkgdGhhdCB0ZWxscyB0aGUgQXBwIGlmIGl0IG5lZWRzIHRvIGFkZCBzcGVjaWZpY2l0eSB0byBQbGFjZU5hbWUgKi9cbiAgICBzcGVjaWZpY1BsYWNlTmFtZU5lZWRlZDogZmFsc2UsXG5cbiAgICAvKiBJbml0aWFsaXplIHRoaXMhICovXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5pbml0U2VsZWN0b3JzKCk7XG4gICAgICB0aGlzLmluaXRMaXN0ZW5lcnMoKTtcbiAgICAgIHRoaXMud2VhdGhlckFQSSA9IG5ldyBXVUFQSSgpO1xuICAgIH0sXG5cbiAgICAvKiBJZGVudGlmeSBzZWxlY3RvcnMgaW4gbWFya3VwICovXG4gICAgaW5pdFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy51cHBlckRhdGEuJGlucHV0ID0gJCgnLmlucHV0LWNvbnRhaW5lcicpLmZpbmQoJ2lucHV0LmpzLXVwcGVyJyk7XG4gICAgICB0aGlzLmxvd2VyRGF0YS4kaW5wdXQgPSAkKCcuaW5wdXQtY29udGFpbmVyJykuZmluZCgnaW5wdXQuanMtbG93ZXInKTtcbiAgICAgIHRoaXMuYWxsSW5wdXRzID0gdGhpcy51cHBlckRhdGEuJGlucHV0LmFkZCh0aGlzLmxvd2VyRGF0YS4kaW5wdXQpO1xuXG4gICAgICB0aGlzLnVwcGVyRGF0YS4kb3V0cHV0ID0gJCgnLm91dHB1dC1jb250YWluZXInKS5maW5kKCdkaXYuanMtdXBwZXInKTtcbiAgICAgIHRoaXMubG93ZXJEYXRhLiRvdXRwdXQgPSAkKCcub3V0cHV0LWNvbnRhaW5lcicpLmZpbmQoJ2Rpdi5qcy1sb3dlcicpO1xuXG4gICAgICB0aGlzLiRkaWZmZXJlbmNlQ29udCA9ICQoJy5jb250YWluZXInKS5maW5kKCcuZGlmZmVyZW5jZS1jb250YWluZXInKTtcbiAgICAgIHRoaXMuJGRpZmZlcmVuY2UgPSAkKCcuY29udGFpbmVyJykuZmluZCgnLmRpZmZlcmVuY2UtbXNnJyk7XG4gICAgICB0aGlzLiRjbGVhckJ1dHRvbiA9ICQoJy5jb250YWluZXInKS5maW5kKCcuY2xlYXItYnV0dG9uJyk7XG5cbiAgICAgIHRoaXMuJGVycm9yQ29udGFpbmVyID0gJCgnLmNvbnRhaW5lcicpLmZpbmQoJy5lcnJvci1jb250YWluZXInKTtcbiAgICAgIHRoaXMuJGVycm9yQXJyb3cgPSAkKCcuY29udGFpbmVyJykuZmluZCgnLmVycm9yLWluZGljYXRvcicpO1xuICAgIH0sXG5cbiAgICAvKiBJbml0aWFsaXplIHRoZSBsaXN0ZW5lcnMgb24gdGhlIHNlbGVjdG9ycyAqL1xuICAgIGluaXRMaXN0ZW5lcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuYWxsSW5wdXRzLm9uKCdjaGFuZ2UnLCAkLnByb3h5KHRoaXMuaGFuZGxlSW5wdXRDaGFuZ2UsIHRoaXMpKTtcbiAgICAgIHRoaXMuYWxsSW5wdXRzLm9uKCdrZXl1cCcsICQucHJveHkodGhpcy5tYW5hZ2VJbnB1dEVudHJ5LCB0aGlzKSk7XG4gICAgICB0aGlzLiRjbGVhckJ1dHRvbi5vbignY2xpY2sgdG91Y2gnLCAkLnByb3h5KHRoaXMuY2xlYXJEYXRhLCB0aGlzKSk7XG4gICAgfSwgIFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGluZm9ybWF0aW9uIGJlaW5nIGVudGVyZWQgaW50byB0aGUgaW5wdXRzXG4gICAgICogQHBhcmFtICB7RXZlbnR9ICBldnQgIGpRdWVyeSBldmVudFxuICAgICAqL1xuICAgIGhhbmRsZUlucHV0Q2hhbmdlOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICB2YXIgJHRhcmdldCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICB2YXIgbG9jYXRpb24gPSAkdGFyZ2V0LnZhbCgpO1xuICAgICAgdmFyIHVwZGF0ZU9iamVjdCA9ICR0YXJnZXQuaGFzQ2xhc3MoJ2pzLXVwcGVyJykgPyB0aGlzLnVwcGVyRGF0YSA6IHRoaXMubG93ZXJEYXRhO1xuXG4gICAgICB1cGRhdGVPYmplY3QucGxhY2UgPSBsb2NhdGlvbjtcbiAgICAgIHVwZGF0ZU9iamVjdC5lcnJvciA9IG51bGw7XG5cbiAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICB0aGlzLnJldHJpZXZlQ29uZGl0aW9uc0RhdGEodXBkYXRlT2JqZWN0KVxuICAgICAgICAgIC5kb25lKCQucHJveHkodGhpcy5wb3B1bGF0ZVRlbXBsYXRlLCB0aGlzKSlcbiAgICAgICAgICAuZmFpbCgkLnByb3h5KHRoaXMuaGFuZGxlRXJyb3IsIHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMaXN0ZW5lciBvbiBib3RoIGlucHV0cyBmb3IgcmVzcG9uZGluZyB0byB1c2VyIGludGVyYWN0aW9uLiAgQ2xlYXJzIGVycm9yLCBhZGp1c3RzIGZvbnQgc2l6ZS5cbiAgICAgKiBAcGFyYW0gIHtqUXVlcnl9ICBldnQgIGpRdWVyeSBldmVudC5cbiAgICAgKiBAcmV0dXJuIHtqUXVlcnl9ICAgICAgIHRhcmdldCBvZiB0aGUgalF1ZXJ5IGV2ZW50IFxuICAgICAqL1xuICAgIG1hbmFnZUlucHV0RW50cnk6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgIHZhciAkdGhpc0lucHV0ID0gJChldnQudGFyZ2V0KTtcbiAgICAgIHZhciBlbnRyeSA9ICR0aGlzSW5wdXQudmFsKCk7XG5cbiAgICAgIGlmIChlbnRyeSA9PT0gJycpIHRoaXMuaGFuZGxlRXJyb3IoZW50cnkpO1xuXG4gICAgICBpZiAoZW50cnkubGVuZ3RoID4gOSkge1xuICAgICAgICAkdGhpc0lucHV0LmFkZENsYXNzKCdzbWFsbGVyLWlucHV0LXRleHQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICR0aGlzSW5wdXQucmVtb3ZlQ2xhc3MoJ3NtYWxsZXItaW5wdXQtdGV4dCcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJHRoaXNJbnB1dDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIGFsbCBkYXRhIGZyb20gdGhlIHZpZXcuXG4gICAgICogQHBhcmFtICB7alF1ZXJ5fSAgZXZ0ICBUaGUgalF1ZXJ5IGV2ZW50IGlmIG5lZWRlZFxuICAgICAqL1xuICAgIGNsZWFyRGF0YTogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgdmFyIGJsYW5rT2JqID0ge1xuICAgICAgICBwbGFjZU5hbWU6ICcnLFxuICAgICAgICB0ZW1wU3RyaW5nOiAnJyxcbiAgICAgICAgdGVtcFZhbDogMCxcbiAgICAgICAgaWNvblVybDogJycsXG4gICAgICAgIGVycm9yOiB7fVxuICAgICAgfTtcblxuICAgICAgJC5leHRlbmQodGhpcy51cHBlckRhdGEsIGJsYW5rT2JqKTtcbiAgICAgICQuZXh0ZW5kKHRoaXMubG93ZXJEYXRhLCBibGFua09iaik7XG5cbiAgICAgIHRoaXMuYWxsSW5wdXRzLnZhbCgnJyk7XG5cbiAgICAgIHRoaXMuY2xlYXJUZW1wbGF0ZSh0aGlzLnVwcGVyRGF0YSwgdGhpcy5sb3dlckRhdGEpO1xuICAgICAgdGhpcy5jbGVhckNvbXBhcmlzb24oKTtcbiAgICAgIHRoaXMuY2xlYXJFcnJvcnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGFzcyB0aGUgb2JqZWN0IHRvIGJlIHVwZGF0ZWQgdG8gdGhlIFdlYXRoZXIgQVBJIHRvIGdldCBuZXcgZGF0YS5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICB1cGRhdGVPYmplY3QgIFRoZSBjb250YWluZXIgdG8gYmUgdXBkYXRlZCB3aXRoIG5ldyBkYXRhXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgICAgICAgICBSZXR1cm5zIFByb21pc2VcbiAgICAgKi9cbiAgICByZXRyaWV2ZUNvbmRpdGlvbnNEYXRhOiBmdW5jdGlvbiAodXBkYXRlT2JqZWN0KSB7XG4gICAgICB2YXIgRGVmID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICB0aGlzLndlYXRoZXJBUEkucmVxdWVzdCh1cGRhdGVPYmplY3QpXG4gICAgICAgIC5kb25lKGZ1bmN0aW9uIChyZXNwb25zZU9iaikge1xuICAgICAgICAgIERlZi5yZXNvbHZlKCQuZXh0ZW5kKHVwZGF0ZU9iamVjdCwgcmVzcG9uc2VPYmopKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgRGVmLnJlamVjdCgkLmV4dGVuZCh1cGRhdGVPYmplY3QsIGVycm9yKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gRGVmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSB0aGUgdGVtcGxhdGUgd2l0aCB0aGUgZGF0YSByZWNlaXZlZCBmcm9tIHRoZSBBUElcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICBkYXRhICBGb3JtYXR0ZWQgb2JqZWN0IHJlY2VpdmVkIGZyb20gd2VhdGhlciBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVRlbXBsYXRlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihkYXRhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2xlYXJFcnJvcnMoKTtcbiAgICAgICAgdmFyICRvdXRwdXRDb250ID0gZGF0YS4kb3V0cHV0O1xuXG4gICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGlzIG5ldyBwbGFjZU5hbWUgaXMgdGhlIHNhbWUgYXMgdGhlIGV4aXN0aW5nIHBsYWNlTmFtZVxuICAgICAgICB0aGlzLnNwZWNpZmljUGxhY2VOYW1lTmVlZGVkID0gdGhpcy51cHBlckRhdGEucGxhY2VOYW1lID09PSB0aGlzLmxvd2VyRGF0YS5wbGFjZU5hbWUgJiZcbiAgICAgICAgICB0aGlzLnVwcGVyRGF0YS5zcGVjaWZpY1BsYWNlICE9PSB0aGlzLmxvd2VyRGF0YS5zcGVjaWZpY1BsYWNlO1xuXG4gICAgICAgICRvdXRwdXRDb250LmZpbmQoJy5jaXR5LW5hbWUnKS5odG1sKGRhdGEucGxhY2VOYW1lKTtcbiAgICAgICAgJG91dHB1dENvbnQuZmluZCgnLmxvY2FsLXRlbXAnKS5odG1sKHRoaXMubWFya3VwVGVtcGVyYXR1cmUoZGF0YS50ZW1wU3RyaW5nKSk7XG4gICAgICAgICRvdXRwdXRDb250LmZpbmQoJy5pbWctY29udGFpbmVyJylcbiAgICAgICAgICAuZW1wdHkoKVxuICAgICAgICAgIC5hcHBlbmQoJCgnPGltZz4nLCB7XG4gICAgICAgICAgICBzcmM6IGRhdGEuaWNvblVybFxuICAgICAgICAgIH0pKTtcblxuICAgICAgICB0aGlzLnVwZGF0ZVBsYWNlTmFtZXModGhpcy51cHBlckRhdGEsIHRoaXMubG93ZXJEYXRhKTtcblxuICAgICAgICBpZiAodGhpcy51cHBlckRhdGEudGVtcFZhbCAmJiB0aGlzLmxvd2VyRGF0YS50ZW1wVmFsKSB7XG4gICAgICAgICAgdGhpcy5jb21wYXJlVHdvTG9jYXRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIGEgc2luZ2xlIHRlbXBsYXRlIG9mIGRhdGEuXG4gICAgICogQHBhcmFtICB7QXJndW1lbnRzfSAgYXJncyAgRXhwZWN0cyBvbmUgb3IgbW9yZSBkYXRhIG9iamVjdHMgYXMgQXJndW1lbnRzXG4gICAgICovXG4gICAgY2xlYXJUZW1wbGF0ZTogZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgIHZhciAkb3V0cHV0Q29udDtcblxuICAgICAgZm9yICh2YXIgaT0wOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICRvdXRwdXRDb250ID0gYXJndW1lbnRzW2ldLiRvdXRwdXQ7XG5cbiAgICAgICAgJG91dHB1dENvbnQuZmluZCgnLmNpdHktbmFtZScpLmh0bWwoJycpO1xuICAgICAgICAkb3V0cHV0Q29udC5maW5kKCcubG9jYWwtdGVtcCcpLmh0bWwoJycpO1xuICAgICAgICAkb3V0cHV0Q29udC5maW5kKCcuaW1nLWNvbnRhaW5lcicpLmVtcHR5KCk7XG4gICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3BlY2lmaWNhbGx5IHRhcmdldHMgdGhlIGRpc3BsYXllZCBsb2NhdGlvbiBuYW1lLCBhZGRzIG1vcmUgc3BlY2lmaWNpdHkgaWYgdGhlIHR3byBkaXNwbGF5ZWRcbiAgICAgKiBwbGFjZXMgYXJlIGlkZW50aWNhbC5cbiAgICAgKiBAcGFyYW0gIHtBcmd1bWVudHN9ICBhcmdzICBFeHBlY3RzIG9uZSBvciBtb3JlIGRhdGEgb2JqZWN0cyBhcyBBcmd1bWVudHMuXG4gICAgICovXG4gICAgdXBkYXRlUGxhY2VOYW1lczogZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgIHZhciBhZGRTcGVjaWZpY2l0eSA9IHRoaXMuc3BlY2lmaWNQbGFjZU5hbWVOZWVkZWQ7XG4gICAgICB2YXIgb3V0cHV0T2JqO1xuICAgICAgdmFyIHByb3BUb0FkZCA9IGFkZFNwZWNpZmljaXR5ID8gJ3NwZWNpZmljUGxhY2UnIDogJ3BsYWNlTmFtZSc7XG5cbiAgICAgIGZvciAodmFyIGk9MDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRwdXRPYmogPSBhcmd1bWVudHNbaV07XG4gICAgICAgIG91dHB1dE9iai4kb3V0cHV0LmZpbmQoJy5jaXR5LW5hbWUnKS5odG1sKG91dHB1dE9ialtwcm9wVG9BZGRdKTtcbiAgICAgICAgb3V0cHV0T2JqLmlzU3BlY2lmaWMgPSBhZGRTcGVjaWZpY2l0eTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIHRoZSBtYXJrIHVwIGZvciB0aGUgdGVtcGVyYXR1cmUgc3RyaW5nOyB3cmFwcyBwb3J0aW9ucyBvZiB0aGUgbWFya3VwIGluIEhUTUwgZWxlbWVudHNcbiAgICAgKiBmb3Igc3R5bGluZy5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICB0ZW1wZXJhdHVyZVN0cmluZyAgQSBzdHJpbmcgZGVzY3JpcGluZyB0aGUgdGVtcGVyYXR1cmUgaW4gZGVncmVlcyBGLCBlLmcuICc0OC41Jy5cbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgICAgICAgICAgICAgQSBzdHJpbmcgZm9ybWF0dGVkIHdpdGggSFRNTCB3cmFwcGluZy5cbiAgICAgKi9cbiAgICBtYXJrdXBUZW1wZXJhdHVyZTogZnVuY3Rpb24gKHRlbXBlcmF0dXJlU3RyaW5nKSB7XG4gICAgICB2YXIgbWFya3VwRm9ybWF0ID0gJzxzcGFuIGNsYXNzPVwibmFycm93LWRlZ1wiPiZkZWc7PC9zcGFuPjxzcGFuIGNsYXNzPVwic21hbGwtZlwiPkY8L3NwYW4+JztcbiAgICAgIHZhciBmb3JtYXR0ZWRTdHJpbmcgPSAnJztcblxuICAgICAgaWYgKHRlbXBlcmF0dXJlU3RyaW5nKSB7XG4gICAgICAgIGZvcm1hdHRlZFN0cmluZyA9IHRlbXBlcmF0dXJlU3RyaW5nICsgbWFya3VwRm9ybWF0O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm9ybWF0dGVkU3RyaW5nO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBtYXRoZW1hdGljYWwgY29tcGFyaXNvbiBiZXR3ZWVuIHRoZSB0d28gZXhpc3RpbmcgZGF0YSBvYmplY3QgdGVtcGVyYXR1cmUgdmFsdWVzLlxuICAgICAqIENhbGxzIHRoZSBwb3B1bGF0aW9uIG1ldGhvZCB3aXRoIHRoZSBkaWZmZXJlbmNlIGFuZCBhIGJvb2xlYW4gdGhhdCBpcyB0cnVlIGlmIHRoZSB1cHBlciBkYXRhXG4gICAgICogaXMgd2FybWVyIHRoYW4gdGhlIGxvd2VyLlxuICAgICAqL1xuICAgIGNvbXBhcmVUd29Mb2NhdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkaWZmID0gcm91bmR0byh0aGlzLnVwcGVyRGF0YS50ZW1wVmFsIC0gdGhpcy5sb3dlckRhdGEudGVtcFZhbCwgMSk7XG4gICAgICB2YXIgYWJzID0gTWF0aC5hYnMoZGlmZikudG9TdHJpbmcoKTtcbiAgICAgIHZhciB0b3BJc1dhcm1lciA9IGRpZmYgPiAwO1xuXG4gICAgICB0aGlzLnBvcHVsYXRlQ29tcGFyaXNvbihhYnMsIHRvcElzV2FybWVyKTtcbiAgICB9LCAgICBcblxuICAgIC8qKlxuICAgICAqIFVuLWRpc3BsYXlzIHRoZSBlcnJvciBwb3B1cCBhbmQgcmUtc2V0cyBpdC5cbiAgICAgKi9cbiAgICBjbGVhckVycm9yczogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy4kZXJyb3JDb250YWluZXIuaHRtbCgnJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgdGhpcy4kZXJyb3JBcnJvdy5yZW1vdmVDbGFzcygndXBwZXIgbG93ZXInKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlcyB0aGUgY29tcGFyaXNvbiB0ZW1wbGF0ZSBvZiB0aGUgdmlldy5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICBkaWZmZXJlbmNlICBTdHJpbmcgZGVzY3JpYmluZyB0aGUgZGlmZmVyZW5jZSBpbiB0ZW1wZXJhdHVyZSBiZXR3ZWVuIHRoZSB0d28gXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50ZXJlZCBsb2NhdGlvbnMuXG4gICAgICogQHBhcmFtICB7Ym9vbGVhbn0gdG9wSXNXYXJtZXIgQm9vbGVhbiBkZXNjcmliaW5nIHdoZXRoZXIgdGhlIFwidXBwZXJcIiBkYXRhIG9iamVjdCBpcyB3YXJtZXIgdGhhblxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBsb3dlci5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUNvbXBhcmlzb246IGZ1bmN0aW9uIChkaWZmZXJlbmNlLCB0b3BJc1dhcm1lcikge1xuICAgICAgdmFyIGNvbXBhcmlzb25TdHJpbmc7XG4gICAgICB2YXIgZGlmZlN0cmluZyA9ICdpcyA8c3BhbiBjbGFzcz1cImxhcmdlci1kZWdcIj4lZCZkZWc7PC9zcGFuPic7XG4gICAgICB2YXIgdG9wV2FybWVyID0gJyB3YXJtZXIgdGhhbic7XG4gICAgICB2YXIgdG9wQ29vbGVyID0gJyBjb29sZXIgdGhhbic7XG4gICAgICB2YXIgc2FtZVN0cmluZyA9ICdpcyB0aGUgc2FtZSB0ZW1wZXJhdHVyZSBhcyc7XG5cbiAgICAgIGlmIChkaWZmZXJlbmNlKSB7XG4gICAgICAgIGNvbXBhcmlzb25TdHJpbmcgPSB0b3BJc1dhcm1lciA/IHRvcFdhcm1lciA6IHRvcENvb2xlcjtcbiAgICAgICAgZGlmZlN0cmluZyA9IGRpZmZTdHJpbmcucmVwbGFjZSgnJWQnLCBkaWZmZXJlbmNlKTtcblxuICAgICAgICB0aGlzLiRkaWZmZXJlbmNlLmh0bWwoZGlmZlN0cmluZyArIGNvbXBhcmlzb25TdHJpbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy4kZGlmZmVyZW5jZS5odG1sKHNhbWVTdHJpbmcpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLiRkaWZmZXJlbmNlQ29udC5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVtcHRpZXMgdGhlIGNvbXBhcmlzb24gdGVtcGxhdGVcbiAgICAgKi9cbiAgICBjbGVhckNvbXBhcmlzb246IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuJGRpZmZlcmVuY2UuaHRtbCgnJyk7XG4gICAgICB0aGlzLiRkaWZmZXJlbmNlQ29udC5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFZpZXcgbWV0aG9kIHRvIGFkZCBvciBjbGVhciBlcnJvcnMgcmVjZWl2ZWQgZnJvbSB0aGUgU2VydmljZSBvciBpbml0aWF0ZWQgYnkgdGhlIHZpZXcuIFxuICAgICAqIEBwYXJhbSAge09iamVjdCBvciAnJ30gIGVycm9yICBFaXRoZXIgdGhlIGRhdGEgb2JqZWN0IHdpdGggYW4gJ2Vycm9yJyBwYXJhbWV0ZXIgKHRvIGFkZCB0aGUgZXJyb3IpXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yIGEgZmFsc2V5IHZhbHVlIHRvIHJlbW92ZSB0aGUgZXJyb3IuXG4gICAgICovXG4gICAgaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yICYmIGVycm9yLmVycm9yKSB7XG4gICAgICAgIHZhciBpbmRpY2F0b3JDbGFzcyA9IGVycm9yLiRpbnB1dC5oYXNDbGFzcygnanMtdXBwZXInKSA/ICd1cHBlcicgOiAnbG93ZXInO1xuICAgICAgICB0aGlzLiRlcnJvckNvbnRhaW5lci5odG1sKGVycm9yLmVycm9yLmRlc2NyaXB0aW9uKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIHRoaXMuJGVycm9yQXJyb3cucmVtb3ZlQ2xhc3MoJ3VwcGVyIGxvd2VyJykuYWRkQ2xhc3MoaW5kaWNhdG9yQ2xhc3MpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgdGhpcy5jbGVhclRlbXBsYXRlKGVycm9yKTtcbiAgICAgICAgdGhpcy5jbGVhckNvbXBhcmlzb24oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2xlYXJFcnJvcnMoKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59IiwibW9kdWxlLmV4cG9ydHMgPVxue1xuICBcInJlc3BvbnNlXCI6IHtcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4xXCIsXG4gIFwidGVybXNvZlNlcnZpY2VcIjogXCJodHRwOi8vd3d3Lnd1bmRlcmdyb3VuZC5jb20vd2VhdGhlci9hcGkvZC90ZXJtcy5odG1sXCIsXG4gIFwiZmVhdHVyZXNcIjoge1xuICBcImNvbmRpdGlvbnNcIjogMVxuICB9XG4gIH0sXG4gIFwiY3VycmVudF9vYnNlcnZhdGlvblwiOiB7XG4gIFwiaW1hZ2VcIjoge1xuICBcInVybFwiOiBcImh0dHA6Ly9pY29ucy1hay53eHVnLmNvbS9ncmFwaGljcy93dTIvbG9nb18xMzB4ODAucG5nXCIsXG4gIFwidGl0bGVcIjogXCJXZWF0aGVyIFVuZGVyZ3JvdW5kXCIsXG4gIFwibGlua1wiOiBcImh0dHA6Ly93d3cud3VuZGVyZ3JvdW5kLmNvbVwiXG4gIH0sXG4gIFwiZGlzcGxheV9sb2NhdGlvblwiOiB7XG4gIFwiZnVsbFwiOiBcIlNhbiBGcmFuY2lzY28sIENBXCIsXG4gIFwiY2l0eVwiOiBcIlNhbiBGcmFuY2lzY29cIixcbiAgXCJzdGF0ZVwiOiBcIkNBXCIsXG4gIFwic3RhdGVfbmFtZVwiOiBcIkNhbGlmb3JuaWFcIixcbiAgXCJjb3VudHJ5XCI6IFwiVVNcIixcbiAgXCJjb3VudHJ5X2lzbzMxNjZcIjogXCJVU1wiLFxuICBcInppcFwiOiBcIjk0MTAxXCIsXG4gIFwibGF0aXR1ZGVcIjogXCIzNy43NzUwMDkxNlwiLFxuICBcImxvbmdpdHVkZVwiOiBcIi0xMjIuNDE4MjU4NjdcIixcbiAgXCJlbGV2YXRpb25cIjogXCI0Ny4wMDAwMDAwMFwiXG4gIH0sXG4gIFwib2JzZXJ2YXRpb25fbG9jYXRpb25cIjoge1xuICBcImZ1bGxcIjogXCJTT01BIC0gTmVhciBWYW4gTmVzcywgU2FuIEZyYW5jaXNjbywgQ2FsaWZvcm5pYVwiLFxuICBcImNpdHlcIjogXCJTT01BIC0gTmVhciBWYW4gTmVzcywgU2FuIEZyYW5jaXNjb1wiLFxuICBcInN0YXRlXCI6IFwiQ2FsaWZvcm5pYVwiLFxuICBcImNvdW50cnlcIjogXCJVU1wiLFxuICBcImNvdW50cnlfaXNvMzE2NlwiOiBcIlVTXCIsXG4gIFwibGF0aXR1ZGVcIjogXCIzNy43NzMyODVcIixcbiAgXCJsb25naXR1ZGVcIjogXCItMTIyLjQxNzcyNVwiLFxuICBcImVsZXZhdGlvblwiOiBcIjQ5IGZ0XCJcbiAgfSxcbiAgXCJlc3RpbWF0ZWRcIjoge30sXG4gIFwic3RhdGlvbl9pZFwiOiBcIktDQVNBTkZSNThcIixcbiAgXCJvYnNlcnZhdGlvbl90aW1lXCI6IFwiTGFzdCBVcGRhdGVkIG9uIEp1bmUgMjcsIDU6MjcgUE0gUERUXCIsXG4gIFwib2JzZXJ2YXRpb25fdGltZV9yZmM4MjJcIjogXCJXZWQsIDI3IEp1biAyMDEyIDE3OjI3OjEzIC0wNzAwXCIsXG4gIFwib2JzZXJ2YXRpb25fZXBvY2hcIjogXCIxMzQwODQzMjMzXCIsXG4gIFwibG9jYWxfdGltZV9yZmM4MjJcIjogXCJXZWQsIDI3IEp1biAyMDEyIDE3OjI3OjE0IC0wNzAwXCIsXG4gIFwibG9jYWxfZXBvY2hcIjogXCIxMzQwODQzMjM0XCIsXG4gIFwibG9jYWxfdHpfc2hvcnRcIjogXCJQRFRcIixcbiAgXCJsb2NhbF90el9sb25nXCI6IFwiQW1lcmljYS9Mb3NfQW5nZWxlc1wiLFxuICBcImxvY2FsX3R6X29mZnNldFwiOiBcIi0wNzAwXCIsXG4gIFwid2VhdGhlclwiOiBcIlBhcnRseSBDbG91ZHlcIixcbiAgXCJ0ZW1wZXJhdHVyZV9zdHJpbmdcIjogXCI2Ni4zIEYgKDE5LjEgQylcIixcbiAgXCJ0ZW1wX2ZcIjogNjYuMyxcbiAgXCJ0ZW1wX2NcIjogMTkuMSxcbiAgXCJyZWxhdGl2ZV9odW1pZGl0eVwiOiBcIjY1JVwiLFxuICBcIndpbmRfc3RyaW5nXCI6IFwiRnJvbSB0aGUgTk5XIGF0IDIyLjAgTVBIIEd1c3RpbmcgdG8gMjguMCBNUEhcIixcbiAgXCJ3aW5kX2RpclwiOiBcIk5OV1wiLFxuICBcIndpbmRfZGVncmVlc1wiOiAzNDYsXG4gIFwid2luZF9tcGhcIjogMjIuMCxcbiAgXCJ3aW5kX2d1c3RfbXBoXCI6IFwiMjguMFwiLFxuICBcIndpbmRfa3BoXCI6IDM1LjQsXG4gIFwid2luZF9ndXN0X2twaFwiOiBcIjQ1LjFcIixcbiAgXCJwcmVzc3VyZV9tYlwiOiBcIjEwMTNcIixcbiAgXCJwcmVzc3VyZV9pblwiOiBcIjI5LjkzXCIsXG4gIFwicHJlc3N1cmVfdHJlbmRcIjogXCIrXCIsXG4gIFwiZGV3cG9pbnRfc3RyaW5nXCI6IFwiNTQgRiAoMTIgQylcIixcbiAgXCJkZXdwb2ludF9mXCI6IDU0LFxuICBcImRld3BvaW50X2NcIjogMTIsXG4gIFwiaGVhdF9pbmRleF9zdHJpbmdcIjogXCJOQVwiLFxuICBcImhlYXRfaW5kZXhfZlwiOiBcIk5BXCIsXG4gIFwiaGVhdF9pbmRleF9jXCI6IFwiTkFcIixcbiAgXCJ3aW5kY2hpbGxfc3RyaW5nXCI6IFwiTkFcIixcbiAgXCJ3aW5kY2hpbGxfZlwiOiBcIk5BXCIsXG4gIFwid2luZGNoaWxsX2NcIjogXCJOQVwiLFxuICBcImZlZWxzbGlrZV9zdHJpbmdcIjogXCI2Ni4zIEYgKDE5LjEgQylcIixcbiAgXCJmZWVsc2xpa2VfZlwiOiBcIjY2LjNcIixcbiAgXCJmZWVsc2xpa2VfY1wiOiBcIjE5LjFcIixcbiAgXCJ2aXNpYmlsaXR5X21pXCI6IFwiMTAuMFwiLFxuICBcInZpc2liaWxpdHlfa21cIjogXCIxNi4xXCIsXG4gIFwic29sYXJyYWRpYXRpb25cIjogXCJcIixcbiAgXCJVVlwiOiBcIjVcIixcbiAgXCJwcmVjaXBfMWhyX3N0cmluZ1wiOiBcIjAuMDAgaW4gKCAwIG1tKVwiLFxuICBcInByZWNpcF8xaHJfaW5cIjogXCIwLjAwXCIsXG4gIFwicHJlY2lwXzFocl9tZXRyaWNcIjogXCIgMFwiLFxuICBcInByZWNpcF90b2RheV9zdHJpbmdcIjogXCIwLjAwIGluICgwIG1tKVwiLFxuICBcInByZWNpcF90b2RheV9pblwiOiBcIjAuMDBcIixcbiAgXCJwcmVjaXBfdG9kYXlfbWV0cmljXCI6IFwiMFwiLFxuICBcImljb25cIjogXCJwYXJ0bHljbG91ZHlcIixcbiAgXCJpY29uX3VybFwiOiBcImh0dHA6Ly9pY29ucy1hay53eHVnLmNvbS9pL2Mvay9wYXJ0bHljbG91ZHkuZ2lmXCIsXG4gIFwiZm9yZWNhc3RfdXJsXCI6IFwiaHR0cDovL3d3dy53dW5kZXJncm91bmQuY29tL1VTL0NBL1Nhbl9GcmFuY2lzY28uaHRtbFwiLFxuICBcImhpc3RvcnlfdXJsXCI6IFwiaHR0cDovL3d3dy53dW5kZXJncm91bmQuY29tL2hpc3RvcnkvYWlycG9ydC9LQ0FTQU5GUjU4LzIwMTIvNi8yNy9EYWlseUhpc3RvcnkuaHRtbFwiLFxuICBcIm9iX3VybFwiOiBcImh0dHA6Ly93d3cud3VuZGVyZ3JvdW5kLmNvbS9jZ2ktYmluL2ZpbmR3ZWF0aGVyL2dldEZvcmVjYXN0P3F1ZXJ5PTM3Ljc3MzI4NSwtMTIyLjQxNzcyNVwiXG4gIH1cbn0iLCJ2YXIgUSA9IFFVbml0O1xuXG52YXIgQXBwID0gcmVxdWlyZSgnLi4vc2NyaXB0cy93ZWF0aGVyT3IuanMnKTtcbnZhciBXVUFwaSA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvd2VhdGhlci11bmRlcmdyb3VuZC1hcGkuanMnKTtcbnZhciBtb2NrQXBpUmVzcG9uc2UgPSByZXF1aXJlKCcuL21vY2stcmVzcG9uc2UuanMnKTtcblxudmFyIG1hcmt1cEZpeHR1cmVzID0ge1xuICBiYXNlOiAnI3F1bml0LWZpeHR1cmUnLFxuICBhbGxJbnB1dHM6ICc8ZGl2IGNsYXNzPVwiaW5wdXQtY29udGFpbmVyXCI+PGlucHV0IGNsYXNzPVwianMtdXBwZXJcIiAvPjxpbnB1dCBjbGFzcz1cImpzLWxvd2VyXCIgLz48L2Rpdj4nLFxuICBjbGVhckJ1dHRvbjogJzxkaXYgY2xhc3M9XCJjb250YWluZXJcIj48ZGl2IGNsYXNzPVwiY2xlYXItYnV0dG9uXCI+PC9kaXY+PC9kaXY+JyxcbiAgbG93ZXJJbnB1dDogJzxpbnB1dCBjbGFzcz1cImpzLWxvd2VyXCIgLz4nLFxuICBsb3dlck91dHB1dDogJzxkaXYgY2xhc3M9XCJvdXRwdXQtY29udGFpbmVyXCI+PGRpdiBjbGFzcz1cImpzLWxvd2VyXCI+PC9kaXY+PC9kaXY+JyxcbiAgZXJyb3JDb250YWluZXI6ICc8ZGl2IGNsYXNzPVwiZXJyb3ItY29udGFpbmVyXCI+PC9kaXY+JyxcbiAgZXJyb3JBcnJvdzogJzxkaXYgY2xhc3M9XCJlcnJvci1hcnJvd1wiPjwvZGl2Pidcbn07XG5cbnZhciBlbXB0eUZ4dCA9IGZ1bmN0aW9uICgpIHtcbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5lbXB0eSgpO1xufTtcblxudmFyIG1vY2tEZWZlcnJlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBkb25lOiBmdW5jdGlvbiAoKSB7cmV0dXJuIHRoaXM7fSxcbiAgICBmYWlsOiBmdW5jdGlvbiAoKSB7cmV0dXJuIHRoaXM7fVxuICB9O1xufVxuXG5cbi8vIFRlc3Qgb2Ygd2VhdGhlck9yLmpzXG5RLnRlc3QoICdJbml0IHNob3VsZCBpbnZva2UgaW5pdFNlbGVjdG9ycyBhbmQgaW5pdExpc3RlbmVycycsIGZ1bmN0aW9uKGFzc2VydCkge1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBzZWxlY3RvclNweSA9IHRoaXMuc3B5KHdlYXRoZXJUZXN0LCAnaW5pdFNlbGVjdG9ycycpO1xuICB2YXIgbGlzdGVuZXJTcHkgPSB0aGlzLnNweSh3ZWF0aGVyVGVzdCwgJ2luaXRMaXN0ZW5lcnMnKTtcblxuICB3ZWF0aGVyVGVzdC5pbml0KCk7XG5cbiAgYXNzZXJ0Lm9rKHdlYXRoZXJUZXN0LmluaXRTZWxlY3RvcnMuY2FsbGVkT25jZSAmJiB3ZWF0aGVyVGVzdC5pbml0TGlzdGVuZXJzLmNhbGxlZE9uY2UsICdwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoICdJbml0IHNob3VsZCBpbnN0YW50aWF0ZSBhIG5ldyB3ZWF0aGVyIEFQSScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuXG4gIHdlYXRoZXJUZXN0LmluaXQoKTtcblxuICBhc3NlcnQub2sodHlwZW9mIHdlYXRoZXJUZXN0LndlYXRoZXJBUEkgPT09ICdvYmplY3QnLCAncGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCAnaW5pdFNlbGVjdG9ycyBzaG91bGQgcG9wdWxhdGUgdGhlIGFwcFxcJ3MgZGF0YSBvYmplY3RzJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgdXBwZXJEYXRhLCBsb3dlckRhdGEsIGFsbElucHV0cywgdWRJbnB1dCwgdWRPdXRwdXQsIGxkSW5wdXQsIGxkT3V0cHV0LCBkaWZmZXJlbmNlLCBkaWZmTXNnLCBcbiAgICBjbGVhckJ0biwgZXJyQ29udCwgZXJyQXJyb3c7XG4gIHZhciBlbGVtZW50c0FycmF5O1xuICB2YXIgYWxsRWxlbWVudHNWYWxpZCA9IHRydWU7XG5cbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB3ZWF0aGVyVGVzdC5pbml0U2VsZWN0b3JzKCk7XG5cbiAgdXBwZXJEYXRhID0gd2VhdGhlclRlc3QudXBwZXJEYXRhO1xuICBsb3dlckRhdGEgPSB3ZWF0aGVyVGVzdC5sb3dlckRhdGE7XG4gIGFsbElucHV0cyA9IHdlYXRoZXJUZXN0LmFsbElucHV0cztcbiAgdWRJbnB1dCA9IHVwcGVyRGF0YS4kaW5wdXQ7XG4gIHVkT3V0cHV0ID0gdXBwZXJEYXRhLiRvdXRwdXQ7XG4gIGxkSW5wdXQgPSBsb3dlckRhdGEuJGlucHV0O1xuICBsZE91dHB1dCA9IGxvd2VyRGF0YS4kb3V0cHV0O1xuICBkaWZmZXJlbmNlID0gd2VhdGhlclRlc3QuJGRpZmZlcmVuY2VDb250O1xuICBkaWZmTXNnID0gd2VhdGhlclRlc3QuJGRpZmZlcmVuY2U7XG4gIGNsZWFyQnRuID0gd2VhdGhlclRlc3QuJGNsZWFyQnV0dG9uO1xuICBlcnJDb250ID0gd2VhdGhlclRlc3QuJGVycm9yQ29udGFpbmVyO1xuICBlcnJBcnJvdyA9IHdlYXRoZXJUZXN0LiRlcnJvckFycm93O1xuXG4gIGVsZW1lbnRzQXJyYXkgPSBbYWxsSW5wdXRzLCB1ZElucHV0LCB1ZE91dHB1dCwgbGRJbnB1dCwgbGRPdXRwdXQsIGRpZmZlcmVuY2UsIGRpZmZNc2csIFxuICAgIGNsZWFyQnRuLCBlcnJDb250LCBlcnJBcnJvd107XG5cbiAgZm9yICh2YXIgaT0wOyBpIDwgZWxlbWVudHNBcnJheS5sZW5ndGg7IGkrKykge1xuICAgIGlmICghKGVsZW1lbnRzQXJyYXlbaV0gaW5zdGFuY2VvZiBqUXVlcnkpKSB7XG4gICAgICBhbGxFbGVtZW50c1ZhbGlkID0gZmFsc2U7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBhc3NlcnQub2soYWxsRWxlbWVudHNWYWxpZCwgJ3Bhc3NlZCcpO1xufSk7XG5cblEudGVzdCggJ2luaXRMaXN0ZW5lcnMgc2hvdWxkIHNldCBhIGNoYW5nZSBsaXN0ZW5lciBvbiBhbGxJbnB1dHMgJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBwcm94eVNweSA9IHRoaXMuc3B5KCQsICdwcm94eScpO1xuXG4gICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMuYWxsSW5wdXRzKSk7XG4gICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMuY2xlYXJCdXR0b24pKTtcbiAgd2VhdGhlclRlc3QuYWxsSW5wdXRzID0gJChtYXJrdXBGaXh0dXJlcy5hbGxJbnB1dHMpO1xuICB3ZWF0aGVyVGVzdC4kY2xlYXJCdXR0b24gPSAkKG1hcmt1cEZpeHR1cmVzLmNsZWFyQnV0dG9uKTtcblxuICB3ZWF0aGVyVGVzdC5pbml0TGlzdGVuZXJzKCk7XG5cbiAgJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KS5jbGljaygpO1xuICAkKG1hcmt1cEZpeHR1cmVzLmFsbElucHV0cykudHJpZ2dlcignY2hhbmdlJyk7XG4gICQobWFya3VwRml4dHVyZXMuY2xlYXJCdXR0b24pLmNsaWNrKCk7XG5cbiAgYXNzZXJ0Lm9rKHByb3h5U3B5LmNhbGxlZFdpdGgod2VhdGhlclRlc3QuaGFuZGxlSW5wdXRDaGFuZ2UpLCAnaW5wdXQgY2hhbmdlIHBhc3NlZCcpO1xuICBhc3NlcnQub2socHJveHlTcHkuY2FsbGVkV2l0aCh3ZWF0aGVyVGVzdC5tYW5hZ2VJbnB1dEVudHJ5KSwgJ2lucHV0IGVudHJ5IHBhc3NlZCcpO1xuICBhc3NlcnQub2socHJveHlTcHkuY2FsbGVkV2l0aCh3ZWF0aGVyVGVzdC5jbGVhckRhdGEpLCAnY2xlYXIgYnV0dG9uIGNsaWNrIHBhc3NlZCcpO1xuICBhc3NlcnQub2socHJveHlTcHkuYXJncy5sZW5ndGggPT09IDMsICd0aHJlZSBjYWxscyB0byBwcm94eSBwYXNzZWQnKTtcbiAgZW1wdHlGeHQoKTtcbn0pO1xuXG5RLnRlc3QoICdoYW5kbGVJbnB1dENoYW5nZSBzaG91bGQgY2FsbCByZXRyaWV2ZSBjb25kaXRpb25zIHdpdGggY29ycmVjdCBkYXRhJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgbW9ja0V2ZW50LCBwYXNzZWRPYmo7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIHJldHJpZXZlQ29uZGl0aW9uc1NweSA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ3JldHJpZXZlQ29uZGl0aW9uc0RhdGEnLCBtb2NrRGVmZXJyZWQpO1xuXG4gIHZhciB0YXJnZXRFbCA9ICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMubG93ZXJJbnB1dCkpO1xuICB0YXJnZXRFbC52YWwoJ2hvZ3dhcnRzJyk7XG5cbiAgbW9ja0V2ZW50ID0ge1xuICAgIHRhcmdldDogdGFyZ2V0RWxcbiAgfVxuXG4gIHdlYXRoZXJUZXN0LmhhbmRsZUlucHV0Q2hhbmdlKG1vY2tFdmVudCk7XG5cbiAgcGFzc2VkT2JqID0gcmV0cmlldmVDb25kaXRpb25zU3B5LmFyZ3NbMF1bMF07XG5cbiAgYXNzZXJ0Lm9rKHBhc3NlZE9iai5wbGFjZSA9PT0gJ2hvZ3dhcnRzJywgJ3BsYWNlIHZhbHVlIHBhc3NlZCcpO1xuICBhc3NlcnQub2socGFzc2VkT2JqLmVycm9yID09PSBudWxsLCAncmVzZXQgZXJyb3IgcGFzc2VkJyk7XG4gIGVtcHR5Rnh0KCk7XG59KTtcblxuUS50ZXN0KCAnbWFuYWdlSW5wdXRFbnRyeSBzaG91bGQgaGFuZGxlIGVycm9yLCBvciBhZGQgLyByZW1vdmUgY2xhc3NlcyBiYXNlZCBvbiBsZW5ndGgnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciBtb2NrRXZlbnQsIHRhcmdldEVsLCBhZGRDbGFzc1NweSwgcmVtb3ZlQ2xhc3NTcHksIHplcm9MZW5ndGgsIG92ZXJOaW5lLCB1bmRlck5pbmU7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGhhbmRsZUVycm9yU3B5ID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnaGFuZGxlRXJyb3InKTtcblxuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpKTtcbiAgdGFyZ2V0RWwgPSAkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpO1xuICBcbiAgbW9ja0V2ZW50ID0ge1xuICAgIHRhcmdldDogdGFyZ2V0RWxcbiAgfVxuXG4gIHRhcmdldEVsLnZhbCgnJyk7IC8vIFplcm8gbGVuZ3RoIGVudHJ5XG4gIHplcm9MZW5ndGggPSB3ZWF0aGVyVGVzdC5tYW5hZ2VJbnB1dEVudHJ5KG1vY2tFdmVudCk7XG4gIGFzc2VydC5vayhoYW5kbGVFcnJvclNweS5jYWxsZWRPbmNlICYmIGhhbmRsZUVycm9yU3B5LmNhbGxlZFdpdGgoJycpLCAnZW1wdHkgc3RyaW5nLCBoYW5kbGUgZXJyb3IgcGFzc2VkJyk7XG5cbiAgdGFyZ2V0RWwudmFsKCduaW5lQ2hhcmFjdGVyc09yTW9yZScpOyAvLyBPdmVyIG5pbmUgY2hhcmFjdGVyc1xuICBvdmVyTmluZSA9IHdlYXRoZXJUZXN0Lm1hbmFnZUlucHV0RW50cnkobW9ja0V2ZW50KTtcbiAgYXNzZXJ0Lm9rKG92ZXJOaW5lLmhhc0NsYXNzKCdzbWFsbGVyLWlucHV0LXRleHQnKSwgJ2xvbmcgc3RyaW5nLCBzbWFsbCBmb250IGNsYXNzIGFkZGVkJyk7XG5cbiAgdGFyZ2V0RWwudmFsKCdzaG9ydCcpOyAvLyBVbmRlciBuaW5lIGNoYXJhY3RlcnNcbiAgdW5kZXJOaW5lID0gd2VhdGhlclRlc3QubWFuYWdlSW5wdXRFbnRyeShtb2NrRXZlbnQpO1xuICBhc3NlcnQub2soIXVuZGVyTmluZS5oYXNDbGFzcygnc21hbGxlci1pbnB1dC10ZXh0JyksICdzaG9ydCBzdHJpbmcsIHNtYWxsIGZvbnQgY2xhc3MgcmVtb3ZlZCcpO1xuXG4gIGVtcHR5Rnh0KCk7XG59KTtcblxuUS50ZXN0KCdjbGVhckRhdGEgc2hvdWxkIGVtcHR5IGRhdGEgb2JqZWN0cywgZW1wdHkgdGhlIGlucHV0cywgYW5kIGludm9rZSBzdWJvcmRpbmF0ZSBmbmN0aW9ucycsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB2YXIgY2xlYXJUZW1wbGF0ZVN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjbGVhclRlbXBsYXRlJyk7XG4gIHZhciBjbGVhckNvbXBhc3Jpc29uU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2NsZWFyQ29tcGFyaXNvbicpO1xuICB2YXIgY2xlYXJFcnJvclN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjbGVhckVycm9ycycpO1xuICB2YXIgYmxhbmtPYmpGaXh0dXJlID0ge1xuICAgIHBsYWNlTmFtZTogJycsXG4gICAgdGVtcFN0cmluZzogJycsXG4gICAgdGVtcFZhbDogMCxcbiAgICBpY29uVXJsOiAnJyxcbiAgICBlcnJvcjoge31cbiAgfVxuXG4gIHdlYXRoZXJUZXN0LmFsbElucHV0cyA9ICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMuYWxsSW5wdXRzKS52YWwoJzQgcHJpdmV0IGRyaXZlJykpXG5cbiAgd2VhdGhlclRlc3QudXBwZXJEYXRhID0ge1xuICAgIHBsYWNlTmFtZTogJ2hvZ3dhcnRzJyxcbiAgICB0ZW1wU3RyaW5nOiAnY2hpbGx5JyxcbiAgICB0ZW1wVmFsOiA3LFxuICAgIGljb25Vcmw6ICdtaXJyb3Jfb2ZfZXJpc2VkJyxcbiAgICBlcnJvcjoge2Rlc2NyaXB0aW9uOiAnV2hhdCB3b3VsZCBJIGdldCBpZiBJIGFkZGVkIHBvd2RlcmVkIHJvb3Qgb2YgYXNwaG9kZWwgdG8gYW4gaW5mdXNpb24gb2Ygd29ybXdvb2Q/J31cbiAgfVxuXG4gIHdlYXRoZXJUZXN0LmNsZWFyRGF0YSgpO1xuXG4gIGFzc2VydC5kZWVwRXF1YWwod2VhdGhlclRlc3QudXBwZXJEYXRhLCBibGFua09iakZpeHR1cmUsICdibGFuayBvdXQgZGF0YSBvYmplY3QgcGFzc2VkJyk7XG4gIGFzc2VydC5vayh3ZWF0aGVyVGVzdC5hbGxJbnB1dHMudmFsKCkgPT09ICcnLCAnZW1wdHkgaW5wdXRzIHBhc3NlZCcpO1xuICBhc3NlcnQub2soY2xlYXJUZW1wbGF0ZVN0dWIuY2FsbGVkT25jZSwgJ2NsZWFyVGVtcGxhdGUgY2FsbCBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKGNsZWFyQ29tcGFzcmlzb25TdHViLmNhbGxlZE9uY2UsICdjbGVhckNvbXBhcmlzb24gY2FsbCBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKGNsZWFyRXJyb3JTdHViLmNhbGxlZE9uY2UsICdjbGVhckVycm9ycyBjYWxsIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgncmV0cmlldmVDb25kaXRpb25zRGF0YSBzaG91bGQgaW52b2tlIHJlcXVlc3QgZnJvbSB0aGUgd2VhdGhlckFQSSB3aXRoIHRoZSBwcm92aWRlZCBkYXRhJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgYXBpUmVxdWVzdFN0dWI7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcblxuICB3ZWF0aGVyVGVzdC53ZWF0aGVyQVBJID0geyByZXF1ZXN0OiBtb2NrRGVmZXJyZWQgfTtcbiAgYXBpUmVxdWVzdFN0dWIgPSB0aGlzLnNweSh3ZWF0aGVyVGVzdC53ZWF0aGVyQVBJLCAncmVxdWVzdCcpO1xuXG4gIHZhciB0ZXN0T2JqID0ge1xuICAgIHBsYWNlOiAnbW9zIGVpc2xleScsXG4gICAgZXJyb3I6IG51bGxcbiAgfVxuXG4gIHdlYXRoZXJUZXN0LnJldHJpZXZlQ29uZGl0aW9uc0RhdGEodGVzdE9iaik7XG5cbiAgYXNzZXJ0Lm9rKGFwaVJlcXVlc3RTdHViLmNhbGxlZFdpdGgodGVzdE9iaiksICdjb3JyZWN0IG9iamVjdCBwYXNzZWQgdG8gcmVxdWVzdCwgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdwb3B1bGF0ZVRlbXBsYXRlIHNob3VsZCBjYWxsIGhhbmRsZUVycm9yIGlmIHRoZXJlIGlzIGFuIGVycm9yIHByb3BlcnR5JywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBoYW5kbGVFcnJvclNweSA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2hhbmRsZUVycm9yJyk7XG4gIHZhciBlcnJvclRlc3RPYmogPSB7XG4gICAgcGxhY2VOYW1lOiAnbW9zIGVpc2xleScsXG4gICAgZXJyb3I6IHtkZXNjcmlwdGlvbjogJ1RoaXMgaXMgYSB3cmV0Y2hlZCBoaXZlIG9mIHNjdW0gYW5kIHZpbGxhaW55J31cbiAgfVxuXG4gIHdlYXRoZXJUZXN0LnBvcHVsYXRlVGVtcGxhdGUoZXJyb3JUZXN0T2JqKTtcblxuICBhc3NlcnQub2soaGFuZGxlRXJyb3JTcHkuY2FsbGVkV2l0aChlcnJvclRlc3RPYmopLCAnY2FsbGVkIGhhbmRsZUVycm9yIHdoZW4gb2JqZWN0IGhhcyBlcnJvciBwcm9wLCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ3BvcHVsYXRlVGVtcGxhdGUgc2hvdWxkIGNhbGwgdXBkYXRlIHRoZSB0ZW1wbGF0ZSwgYW5kIGNhbGwgc3Vib3JkaW5hdGUgbWV0aG9kcycsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHRlc3RPYmosIHRlc3RMd3JPdXRwdXQ7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGNsZWFyRXJyb3JTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJFcnJvcnMnKTtcbiAgdmFyIG1hcmt1cFRlbXBlcmF0dXJlU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ21hcmt1cFRlbXBlcmF0dXJlJyk7XG4gIHZhciB1cGRhdGVQbGFjZU5hbWVTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAndXBkYXRlUGxhY2VOYW1lcycpO1xuICB2YXIgY29tcGFyZVR3b0xvY2F0aW9uU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2NvbXBhcmVUd29Mb2NhdGlvbnMnKTtcblxuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmxvd2VyT3V0cHV0KSk7XG5cbiAgdGVzdEx3ck91dHB1dCA9ICQobWFya3VwRml4dHVyZXMubG93ZXJPdXRwdXQpO1xuXG4gIHRlc3RPYmogPSB7XG4gICAgcGxhY2VOYW1lOiAnZ29uZG9yJyxcbiAgICB0ZW1wU3RyaW5nOiAnc3Rvcm15JyxcbiAgICB0ZW1wVmFsOiA5NyxcbiAgICBpY29uVXJsOiAnJyxcbiAgICAkb3V0cHV0OiB0ZXN0THdyT3V0cHV0XG4gIH07XG5cbiAgd2VhdGhlclRlc3QudXBwZXJEYXRhLnRlbXBWYWwgPSA5OTtcbiAgd2VhdGhlclRlc3QubG93ZXJEYXRhLnRlbXBWYWwgPSA5NztcblxuXG4gIHdlYXRoZXJUZXN0LnBvcHVsYXRlVGVtcGxhdGUodGVzdE9iaik7XG5cbiAgYXNzZXJ0Lm9rKGNsZWFyRXJyb3JTdHViLmNhbGxlZE9uY2UsICdjbGVhciBlcnJvcnMgY2FsbCBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKG1hcmt1cFRlbXBlcmF0dXJlU3R1Yi5jYWxsZWRXaXRoKHRlc3RPYmoudGVtcFN0cmluZyksICdtYXJrdXAgdGVtcGVyYXR1cmVzIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayh1cGRhdGVQbGFjZU5hbWVTdHViLmNhbGxlZE9uY2UsICd1cGRhdGUgcGxhY2UgbmFtZXMgY2FsbCBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKGNvbXBhcmVUd29Mb2NhdGlvblN0dWIuY2FsbGVkT25jZSwgJ2NvbXBhcmUgdHdvIGxvY2F0aW9ucyBjYWxsIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgnbWFya3VwVGVtcGVyYXR1cmUgc2hvdWxkIHJldHVybiBhIG1hcmtlZCB1cCBzdHJpbmcnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcblxuICB2YXIgZXhwZWN0ZWRTdHJpbmcgPSB7XG4gICAgZm9ybWF0dGVkOiAnNDguNTxzcGFuIGNsYXNzPVwibmFycm93LWRlZ1wiPiZkZWc7PC9zcGFuPjxzcGFuIGNsYXNzPVwic21hbGwtZlwiPkY8L3NwYW4+JyxcbiAgICByYXc6IDQ4LjVcbiAgfTtcblxuICB2YXIgcmV0dXJuZWRTdHJpbmcgPSB3ZWF0aGVyVGVzdC5tYXJrdXBUZW1wZXJhdHVyZShleHBlY3RlZFN0cmluZy5yYXcpO1xuXG4gIGFzc2VydC5kZWVwRXF1YWwocmV0dXJuZWRTdHJpbmcsIGV4cGVjdGVkU3RyaW5nLmZvcm1hdHRlZCwgJ3N0cmluZyBtYXJrdXAgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdoYW5kbGVFcnJvciBzaG91bGQgY2FsbCBjbGVhckVycm9ycyBpZiBwYXNzZWQgYSBmYWxzZXkgdmFsdWUgb3IgYW4gb2JqZWN0IHdpdGggbm8gZXJyb3IgcHJvcCcsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB2YXIgY2xlYXJFcnJvclN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjbGVhckVycm9ycycpO1xuICB2YXIgdGVzdE9iak5vRXJyb3IgPSB7XG4gICAgcGxhY2VOYW1lOiAnZGlzdHJpY3QgMTMnLFxuICAgIHRlbXBTdHJpbmc6ICdzbm93eScsXG4gICAgdGVtcFZhbDogMTNcbiAgfTtcblxuICB3ZWF0aGVyVGVzdC5oYW5kbGVFcnJvcignJyk7XG4gIHdlYXRoZXJUZXN0LmhhbmRsZUVycm9yKHRlc3RPYmpOb0Vycm9yKTtcbiAgd2VhdGhlclRlc3QuaGFuZGxlRXJyb3IoMCk7XG5cbiAgYXNzZXJ0Lm9rKGNsZWFyRXJyb3JTdHViLmFyZ3MubGVuZ3RoID09PSAzLCAnY2FsbGVkIGZvciB0aHJlZSBmYWxzZXkgdmFsdWVzLCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ2hhbmRsZUVycm9yIHNob3VsZCBjYWxsIGNsZWFyVGVtcGxhdGUgYW5kIGNsZWFyQ29tcGFyaXNvbiBpZiBlcnJvciBvYmplY3QgaXMgcGFzc2VkJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgdGVzdE9iakVycm9yLCBsb3dlcklucHV0RWw7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGNsZWFyVGVtcGxhdGVTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJUZW1wbGF0ZScpO1xuICB2YXIgY2xlYXJDb21wYXNyaXNvblN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjbGVhckNvbXBhcmlzb24nKVxuXG4gICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMubG93ZXJJbnB1dCkpO1xuICBsb3dlcklucHV0RWwgPSAkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpO1xuXG4gIHRlc3RPYmpFcnJvciA9IHtcbiAgICBwbGFjZU5hbWU6ICcnLFxuICAgIGVycm9yOiB7ZGVzY3JpcHRpb246ICdubyBwbGFjZSBuYW1lLCBvb3BzJ30sXG4gICAgJGlucHV0OiBsb3dlcklucHV0RWxcbiAgfTtcblxuICB3ZWF0aGVyVGVzdC4kZXJyb3JDb250YWluZXIgPSAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmVycm9yQ29udGFpbmVyKSk7XG4gIHdlYXRoZXJUZXN0LiRlcnJvckFycm93ID0gJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5lcnJvckFycm93KSk7XG5cbiAgd2VhdGhlclRlc3QuaGFuZGxlRXJyb3IodGVzdE9iakVycm9yKTtcblxuICBhc3NlcnQub2soY2xlYXJUZW1wbGF0ZVN0dWIuY2FsbGVkV2l0aCh0ZXN0T2JqRXJyb3IpLCAnY2xlYXIgdGVtcGxhdGUgY2FsbGVkIHdpdGggb2JqZWN0LCBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKGNsZWFyQ29tcGFzcmlzb25TdHViLmNhbGxlZE9uY2UsICdjbGVhciBjb21wYXJpc29uIGNhbGxlZCwgcGFzc2VkJyk7XG59KTtcblxuLy8gVGVzdCBvZiB3ZWF0aGVyLXVuZGVyZ3JvdW5kLWFwaS5qc1xuUS50ZXN0KCdyZXF1ZXN0IHNob3VsZCBjYWxsIHdlYXRoZXIgdW5kZXJncm91bmQgd2l0aCBhamF4JywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgYXBpVGVzdCA9IG5ldyBXVUFwaSgpO1xuICB2YXIgYnVpbGRVcmxTdHViID0gdGhpcy5zdHViKGFwaVRlc3QsICdidWlsZFVybCcsIGZ1bmN0aW9uICgpIHtyZXR1cm4gJ2FwaV90ZXN0Jzt9KTtcbiAgdmFyIGFqYXhTdHViID0gdGhpcy5zdHViKCQsICdhamF4JywgbW9ja0RlZmVycmVkKTtcbiAgdmFyIHRlc3RSZXFPYmogPSB7XG4gICAgcGxhY2U6ICdtb3Jkb3InXG4gIH1cblxuICBhcGlUZXN0LnJlcXVlc3QodGVzdFJlcU9iaik7XG5cbiAgYXNzZXJ0Lm9rKGJ1aWxkVXJsU3R1Yi5jYWxsZWRXaXRoKHRlc3RSZXFPYmoucGxhY2UpLCAnYnVpbGQgdXJsIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhhamF4U3R1Yi5jYWxsZWRXaXRoKCdhcGlfdGVzdCcpLCAnYWpheCBjYWxsIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgnY29uZm9ybSBtYW5pcHVsYXRlcyB0aGUgb2JqZWN0IHBhc3NlZCwgcmV0dXJuaW5nIGFuIGVycm9yIGlmIHByZXNlbnQgb3IgZm9ybWF0dGluZyB0aGUgb2JqZWN0IGNvcnJlY3RseScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHN1Y2Nlc3NUZXN0LCBlcnJvclRlc3QsIG11bHRpcGxlUmVzdWx0c1Rlc3Q7XG4gIHZhciBhcGlUZXN0ID0gbmV3IFdVQXBpKCk7XG4gIFxuICB2YXIgaWNvblN0dWJTdHJpbmcgPSBmdW5jdGlvbiAoKSB7cmV0dXJuICdpY29uX3VybF90ZXN0Jzt9O1xuICB2YXIgYnVpbGRJY29uVXJsU3R1YiA9IHRoaXMuc3R1YihhcGlUZXN0LCAnYnVpbGRJY29uVXJsJywgaWNvblN0dWJTdHJpbmcpO1xuICB2YXIgbXVsdGlwbGVSZXN1bHRTdHViID0gdGhpcy5zdHViKGFwaVRlc3QuZXJyb3JUeXBlLCAnbXVsdGlwbGVSZXN1bHRzJyk7XG5cbiAgdmFyIG1vY2tSZXNwb25zZSA9IG1vY2tBcGlSZXNwb25zZTtcbiAgdmFyIG1vY2tFcnJvclJlc3BvbnNlID0ge2Rlc2NyaXB0aW9uOiAnY2Fubm90IHNlZSB0b28gZm9nZ3knfTtcbiAgdmFyIG1vY2tSZXN1bHRzUmVzcG9uc2UgPSBbe25hbWU6ICdmaXJzdF9vYmplY3QnfSwge25hbWU6ICdzZWNvbmRfb2JqZWN0J31dO1xuICB2YXIgc3VjY2Vzc0ZpeHR1cmVPYmogPSB7XG4gICAgcGxhY2VOYW1lOiAnU0FOIEZSQU5DSVNDTywgQ0EnLFxuICAgIHNwZWNpZmljUGxhY2U6ICdTT01BIC0gTkVBUiBWQU4gTkVTUywgU0FOIEZSQU5DSVNDTywgQ0EnLFxuICAgIHRlbXBTdHJpbmc6ICc2Ni4zJyxcbiAgICB0ZW1wVmFsOiA2Ni4zLFxuICAgIGljb25Vcmw6IGljb25TdHViU3RyaW5nKClcbiAgfVxuXG4gIC8vIEZpc3QgY2FsbCB0aGUgbWV0aG9kIHdpdGggZXhwZWN0ZWQgYmVoYXZpb3JcbiAgc3VjY2Vzc1Rlc3QgPSBhcGlUZXN0LmNvbmZvcm0obW9ja1Jlc3BvbnNlKTtcbiAgLy8gQW5kIGRlY2xhcmUgdGhlIGFzc2VydGlvbnMgZm9yIGV4cGVjdGVkIGJlaGF2aW9yXG4gIGFzc2VydC5kZWVwRXF1YWwoc3VjY2Vzc1Rlc3QsIHN1Y2Nlc3NGaXh0dXJlT2JqLCAnc3VjY2Vzc2Z1bCBjYWxsIHBhc3NlZCcpO1xuXG4gIC8vIEFkZCBtdWx0aXBsZSByZXN1bHRzIHRvIHRoZSByZXNwb25zZSBhbmQgY2FsbCB0aGUgbWV0aG9kXG4gIG1vY2tSZXNwb25zZS5yZXNwb25zZS5yZXN1bHRzID0gbW9ja1Jlc3VsdHNSZXNwb25zZTtcbiAgbXVsdGlwbGVSZXN1bHRzVGVzdCA9IGFwaVRlc3QuY29uZm9ybShtb2NrUmVzcG9uc2UpO1xuICAvLyBEZWNsYXJlIHRoZSBhc3NlcnRpb25zIGZvciBtdWx0aXBsZSByZXN1bHRzXG4gIGFzc2VydC5vayhtdWx0aXBsZVJlc3VsdFN0dWIuY2FsbGVkV2l0aChtb2NrUmVzdWx0c1Jlc3BvbnNlWzBdKSwgJ2NhbGwgd2l0aCBtdWx0aXBsZSByZXN1bHRzIHBhc3NlZCcpO1xuXG4gIC8vIEFkZCB0aGUgZXJyb3Igb2JqZWN0IGFuZCBjYWxsIHRoZSBtZXRob2RcbiAgbW9ja1Jlc3BvbnNlLnJlc3BvbnNlLmVycm9yID0gbW9ja0Vycm9yUmVzcG9uc2U7XG4gIGVycm9yVGVzdCA9IGFwaVRlc3QuY29uZm9ybShtb2NrUmVzcG9uc2UpO1xuICBhc3NlcnQuZGVlcEVxdWFsKGVycm9yVGVzdCwge1wiZXJyb3JcIjogbW9ja0Vycm9yUmVzcG9uc2V9LCAnY2FsbCB3aXRoIGVycm9yIHByb3AgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdidWlsZFVybCBzaG91bGQgY29tYmluZSB0aGUgQVBJIEtleSBhbmQgdGhlIHNlYXJjaCB0ZXJtIHRvIGJ1aWxkIHRoZSB1cmwgZm9yIGFqYXgnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB0ZXN0UmVzdWx0O1xuICB2YXIgYXBpVGVzdCA9IG5ldyBXVUFwaSgpO1xuICB2YXIgdXJsRml4dHVyZSA9ICdodHRwOi8vYXBpLnd1bmRlcmdyb3VuZC5jb20vYXBpLzEyMzQ1L2NvbmRpdGlvbnMvcS9tb3Jkb3IuanNvbic7XG4gIHZhciBzZWFyY2hUZXJtID0gJ21vcmRvcic7XG5cbiAgYXBpVGVzdC5BUElrZXkgPSAnMTIzNDUnO1xuXG4gIHRlc3RSZXN1bHQgPSBhcGlUZXN0LmJ1aWxkVXJsKHNlYXJjaFRlcm0pO1xuXG4gIGFzc2VydC5kZWVwRXF1YWwodGVzdFJlc3VsdCwgdXJsRml4dHVyZSwgJ2J1aWxkIHVybCBzdHJpbmcgY29ycmVjdGx5LCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ2J1aWxkSWNvblVybCBjaGVja3MgZGVmYXVsdCBpY29uIHVybCBmb3IgbmlnaHQgdGltZSBkZXNpZ25hdGlvbiwgdGhlbiBidWlsZHMgY29ycmVjdGx5JywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgZGF5VGVzdFJlc3VsdCwgbmlnaHRUZXN0UmVzdWx0O1xuICB2YXIgYXBpVGVzdCA9IG5ldyBXVUFwaSgpO1xuICB2YXIgaWNvblR5cGUgPSAnY2xlYXInO1xuICB2YXIgZGF5VGVzdFN0cmluZyA9ICdjbG91ZHkuZ2lmJztcbiAgdmFyIG5pZ2h0VGVzdFN0cmluZyA9ICdudF9jbG91ZHkuZ2lmJztcbiAgdmFyIGljb25VcmxEYXlGaXh0dXJlID0gJ2h0dHA6Ly9pY29ucy53eHVnLmNvbS9pL2MvYmlsYm8vY2xlYXIuZ2lmJztcbiAgdmFyIGljb25VcmxOaWdodEZpeHR1cmUgPSAnaHR0cDovL2ljb25zLnd4dWcuY29tL2kvYy9iaWxiby9udF9jbGVhci5naWYnO1xuXG4gIGFwaVRlc3QuaWNvblNldCA9ICdiaWxiby8nO1xuXG4gIGRheVRlc3RSZXN1bHQgPSBhcGlUZXN0LmJ1aWxkSWNvblVybChpY29uVHlwZSwgZGF5VGVzdFN0cmluZyk7XG4gIG5pZ2h0VGVzdFJlc3VsdCA9IGFwaVRlc3QuYnVpbGRJY29uVXJsKGljb25UeXBlLCBuaWdodFRlc3RTdHJpbmcpO1xuXG4gIGFzc2VydC5kZWVwRXF1YWwoZGF5VGVzdFJlc3VsdCwgaWNvblVybERheUZpeHR1cmUsICdidWlsZCBpY29uIHVybCBmb3IgZGF5IHBhc3NlZCcpO1xuICBhc3NlcnQuZGVlcEVxdWFsKG5pZ2h0VGVzdFJlc3VsdCwgaWNvblVybE5pZ2h0Rml4dHVyZSwgJ2J1aWxkIGljb24gdXJsIGZvciBuaWdodCBwYXNzZWQnKTtcbn0pOyJdfQ==
