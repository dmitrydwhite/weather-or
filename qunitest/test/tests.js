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
  this.APIkey = '8c4c6c8bebd341a5';

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

// TODO: Unit Tests!
// TODO: Make a Grunt Build task ?

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaXMtZmluaXRlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL251bWJlci1pcy1pbnRlZ2VyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL251bWJlci1pcy1uYW4vaW5kZXguanMiLCJub2RlX21vZHVsZXMvcm91bmQtdG8vaW5kZXguanMiLCJzY3JpcHRzL3dlYXRoZXItdW5kZXJncm91bmQtYXBpLmpzIiwic2NyaXB0cy93ZWF0aGVyT3IuanMiLCJ0ZXN0L21vY2stcmVzcG9uc2UuanMiLCJ0ZXN0L3Rlc3RzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG51bWJlcklzTmFuID0gcmVxdWlyZSgnbnVtYmVyLWlzLW5hbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlci5pc0Zpbml0ZSB8fCBmdW5jdGlvbiAodmFsKSB7XG5cdHJldHVybiAhKHR5cGVvZiB2YWwgIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFuKHZhbCkgfHwgdmFsID09PSBJbmZpbml0eSB8fCB2YWwgPT09IC1JbmZpbml0eSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG51bWJlcklzRmluaXRlID0gcmVxdWlyZSgnaXMtZmluaXRlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyLmlzSW50ZWdlciB8fCBmdW5jdGlvbiAoeCkge1xuXHRyZXR1cm4gbnVtYmVySXNGaW5pdGUoeCkgJiYgTWF0aC5mbG9vcih4KSA9PT0geDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlci5pc05hTiB8fCBmdW5jdGlvbiAoeCkge1xuXHRyZXR1cm4geCAhPT0geDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgbnVtYmVySXNJbnRlZ2VyID0gcmVxdWlyZSgnbnVtYmVyLWlzLWludGVnZXInKTtcblxuZnVuY3Rpb24gcm91bmQoZm4sIHgsIHByZWNpc2lvbikge1xuXHRpZiAodHlwZW9mIHggIT09ICdudW1iZXInKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgdmFsdWUgdG8gYmUgYSBudW1iZXInKTtcblx0fVxuXG5cdGlmICghbnVtYmVySXNJbnRlZ2VyKHByZWNpc2lvbikpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBwcmVjaXNpb24gdG8gYmUgYW4gaW50ZWdlcicpO1xuXHR9XG5cblx0dmFyIGV4cG9uZW50ID0gcHJlY2lzaW9uID4gMCA/ICdlJyA6ICdlLSc7XG5cdHZhciBleHBvbmVudE5lZyA9IHByZWNpc2lvbiA+IDAgPyAnZS0nIDogJ2UnO1xuXHRwcmVjaXNpb24gPSBNYXRoLmFicyhwcmVjaXNpb24pO1xuXG5cdHJldHVybiBOdW1iZXIoTWF0aFtmbl0oeCArIGV4cG9uZW50ICsgcHJlY2lzaW9uKSArIGV4cG9uZW50TmVnICsgcHJlY2lzaW9uKTtcbn1cblxudmFyIGZuID0gbW9kdWxlLmV4cG9ydHMgPSByb3VuZC5iaW5kKG51bGwsICdyb3VuZCcpO1xuZm4udXAgPSByb3VuZC5iaW5kKG51bGwsICdjZWlsJyk7XG5mbi5kb3duID0gcm91bmQuYmluZChudWxsLCAnZmxvb3InKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2FwaSAoKSB7XG5cbiAgLyoqXG4gICAqIEFQSSBLZXkgXG4gICAqIEB0eXBlIHtTdHJpbmd9XG4gICAqL1xuICB0aGlzLkFQSWtleSA9ICc4YzRjNmM4YmViZDM0MWE1JztcblxuICAvKipcbiAgICogU3RyaW5nIGluZGljYXRpbmcgd2hpY2ggaWNvbiBzZXQgZnJvbSBXZWF0aGVyIFVuZGVyZ3JvdW5kIHRvIHVzZS5cbiAgICogQHR5cGUge1N0cmluZ31cbiAgICovXG4gIHRoaXMuaWNvblNldCA9ICdpLyc7XG5cbiAgLyoqXG4gICAqIEV4dGVuc2libGUgTWFwIG9mIGN1c3RvbSBlcnJvcnMuIFByb3BlcnRpZXMgc2hvdWxkIGJlIE9iamVjdHMgb3IgcmV0dXJuIGFuIE9iamVjdCBjb250YWluaW5nXG4gICAqIGF0IGxlYXN0IGEgJ2Rlc2NyaXB0aW9uJyBwcm9wZXJ0eS5cbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHRoaXMuZXJyb3JUeXBlID0ge1xuXG4gICAgLyoqXG4gICAgICogUHJvdmlkZSBhbiBlcnJvciBmb3Igd2hlbiB0aGUgc2VydmljZSByZXR1cm5zIG11bHRpcGxlIHJlc3VsdHMgZm9yIHRoZSBzZWFyY2ggdGVybS5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICBleGFtcGxlT2JqICBPbmUgb2YgdGhlIG11bHRpcGxlIHJlc3VsdHMgcmV0dXJuZWQgZnJvbSB0aGUgc2VydmllLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgIEFuIGVycm9yIG9iamVjdCB3aXRoIGEgY3VzdG9taXplZCBkZXNjcmlwdGlvbiBmaWVsZC5cbiAgICAgKi9cbiAgICBtdWx0aXBsZVJlc3VsdHM6IGZ1bmN0aW9uIChleGFtcGxlT2JqKSB7XG4gICAgICB2YXIgZGVzY3JpcHRpb25TdHJpbmcgPSAnJztcbiAgICAgIHZhciBzZWFyY2hUZXJtID0gZXhhbXBsZU9iai5uYW1lIHx8IGV4YW1wbGVPYmouY2l0eSB8fCAnJztcbiAgICAgIHZhciBzZWFyY2hMb2NhbGUgPSBleGFtcGxlT2JqLnN0YXRlIHx8IGV4YW1wbGVPYmouY291bnRyeSB8fCAnJztcbiAgICAgIHZhciBmaWxsZXJUZXh0ID0gW107XG4gICAgICB2YXIgdmVyYm9zZVNlYXJjaDtcblxuICAgICAgaWYgKCFzZWFyY2hUZXJtIHx8ICFzZWFyY2hMb2NhbGUpIHtcbiAgICAgICAgZmlsbGVyVGV4dCA9IFsnUG9ydGxhbmQsIE9SJywgJ1BvcnRsYW5kJ107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2ZXJib3NlU2VhcmNoID0gc2VhcmNoVGVybSArICcsICcgKyBzZWFyY2hMb2NhbGU7XG4gICAgICAgIGZpbGxlclRleHQgPSBbdmVyYm9zZVNlYXJjaCwgc2VhcmNoVGVybV07XG4gICAgICB9XG5cbiAgICAgIGRlc2NyaXB0aW9uU3RyaW5nID0gJ1RyeSBhIG1vcmUgZGVzY3JpcHRpdmUgc2VhcmNoIHRlcm0sIGUuZy4gXCInICsgdmVyYm9zZVNlYXJjaCArIFxuICAgICAgICAnXCIgaW5zdGVhZCBvZiBcIicgKyBzZWFyY2hUZXJtICsgJ1wiLic7XG5cbiAgICAgIHJldHVybiB7ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uU3RyaW5nfTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcXVlc3QgZGF0YSBmcm9tIHRoZSBzZXJ2aWNlLlxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICByZXFPYmogIFJlcXVlc3Qgb2JqZWN0IHJlY2VpdmVkIGZyb20gdGhlIEFwcCwgZXhwZWN0cyBcInBsYWNlXCIgcHJvcGVydHkgYXMgdGhlIHNlYXJjaCB0ZXJtLlxuICAgKiBAcmV0dXJuIHtEZWZlcnJlZH0gICAgICAgIGpRdWVyeSBEZWZlcnJlZCgpIG9iamVjdFxuICAgKi9cbiAgdGhpcy5yZXF1ZXN0ID0gZnVuY3Rpb24gKHJlcU9iaikge1xuICAgIHZhciBEZWYgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHVybFN0cmluZyA9IHRoaXMuYnVpbGRVcmwocmVxT2JqLnBsYWNlKTtcbiAgICAkLmFqYXgodXJsU3RyaW5nKVxuICAgICAgLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIERlZi5yZXNvbHZlKHRoaXMuY29uZm9ybShyZXNwb25zZSkpO1xuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgLmZhaWwoZnVuY3Rpb24gKCkge1xuICAgICAgICBEZWYucmVqZWN0KHtlcnJvcjoge2Rlc2NyaXB0aW9uOiAnU29ycnksIHdlIGNhblxcJ3Qgc2VlbSB0byBkb3dubG9hZCBhbnkgd2VhdGhlciBpbmZvcm1hdGlvbiA8YnI+YmVjYXVzZSB0aGUgaW50ZXJuZXQgd29uXFwndCBhbnN3ZXIgaXRzIHBob25lLid9fSk7XG4gICAgICB9KTtcblxuICAgIHJldHVybiBEZWY7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRyYW5zbGF0ZSB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmljZSB0byB0aGUgb2JqZWN0IGV4cGVjdGVkIGJ5IHRoZSBBcHAuXG4gICAqIEBwYXJhbSAge09iamVjdH0gIHJlc3BvbnNlT2JqICBEYXRhIG9iamVjdCByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2aWNlLlxuICAgKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgICAgT2JqZWN0IHBhcnNlZCB0byB0aGUgZm9ybWF0IHRoZSBhcHAgZXhwZWN0cy5cbiAgICovXG4gIHRoaXMuY29uZm9ybSA9IGZ1bmN0aW9uIChyZXNwb25zZU9iaikge1xuICAgIHZhciByZXQgPSB7fTtcblxuICAgIGlmIChyZXNwb25zZU9iai5yZXNwb25zZS5lcnJvcikge1xuICAgICAgcmV0LmVycm9yID0gcmVzcG9uc2VPYmoucmVzcG9uc2UuZXJyb3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChyZXNwb25zZU9iai5yZXNwb25zZS5yZXN1bHRzICYmIHJlc3BvbnNlT2JqLnJlc3BvbnNlLnJlc3VsdHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXQuZXJyb3IgPSB0aGlzLmVycm9yVHlwZS5tdWx0aXBsZVJlc3VsdHMocmVzcG9uc2VPYmoucmVzcG9uc2UucmVzdWx0c1swXSk7XG4gICAgICB9XG4gICAgICBpZiAocmVzcG9uc2VPYmouY3VycmVudF9vYnNlcnZhdGlvbikge1xuICAgICAgICB2YXIgb2JzdiA9IHJlc3BvbnNlT2JqLmN1cnJlbnRfb2JzZXJ2YXRpb247XG5cbiAgICAgICAgcmV0LnBsYWNlTmFtZSA9IG9ic3YuZGlzcGxheV9sb2NhdGlvbi5mdWxsLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHJldC5zcGVjaWZpY1BsYWNlID0gb2Jzdi5vYnNlcnZhdGlvbl9sb2NhdGlvbi5mdWxsLnNwbGl0KCcsJylbMF0udG9VcHBlckNhc2UoKS50cmltKCkgKyAnLCAnICsgcmV0LnBsYWNlTmFtZTtcbiAgICAgICAgcmV0LnRlbXBTdHJpbmcgPSBvYnN2LnRlbXBfZi50b1N0cmluZygpO1xuICAgICAgICByZXQudGVtcFZhbCA9IG9ic3YudGVtcF9mO1xuICAgICAgICByZXQuaWNvblVybCA9IHRoaXMuYnVpbGRJY29uVXJsKG9ic3YuaWNvbiwgb2Jzdi5pY29uX3VybCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0IHRoZSB1cmwgc3RyaW5nIGZvciB0aGUgQUpBWCByZXF1ZXN0LlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICBzZWFyY2hTdHJpbmcgIFRoZSBzZWFyY2ggdGVybSBwYXNzZWQgZnJvbSB0aGUgQXBwLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgICAgICAgIFRoZSBjb21wbGV0ZSB1cmwgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAqL1xuICB0aGlzLmJ1aWxkVXJsID0gZnVuY3Rpb24gKHNlYXJjaFN0cmluZykge1xuICAgIHZhciBmaXJzdFBhcnQgPSAnaHR0cDovL2FwaS53dW5kZXJncm91bmQuY29tL2FwaS8nICsgdGhpcy5BUElrZXkgKyAnL2NvbmRpdGlvbnMvcS8nO1xuICAgIHZhciBsYXN0UGFydCA9ICcuanNvbic7XG5cbiAgICByZXR1cm4gZmlyc3RQYXJ0ICsgc2VhcmNoU3RyaW5nICsgbGFzdFBhcnQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgdGhlIHVybCBmb3IgdGhlIHdlYXRoZXIgaWNvbiBiYXNlZCBvbiB0aGUgc2VydmljZSByZXNwb25zZS5cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgaWNvblR5cGUgIFN0cmluZyBkZXNjcmliaW5nIHRoZSB0eXBlIG9mIGljb24gdG8gdXNlLlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICBpY29uVXJsICAgVGhlIGRlZmF1bHQgaWNvbiB1cmwgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmljZS5cbiAgICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgICAgIFRoZSBjb25zdHJ1Y3RlZCB1cmwgZm9yIHRoZSBXZWF0aGVyIFVuZGVyZ3JvdW5kIGljb24sIHVzaW5nIHRoZSBzcGVjaWZpZWQgaWNvbiBzZXQuXG4gICAqL1xuICB0aGlzLmJ1aWxkSWNvblVybCA9IGZ1bmN0aW9uIChpY29uVHlwZSwgaWNvblVybCkge1xuICAgIGljb25UeXBlID0gaWNvblVybC5pbmRleE9mKCdudCcpID09PSAtMSA/IGljb25UeXBlIDogJ250XycgKyBpY29uVHlwZTtcblxuICAgIHJldHVybiAnaHR0cDovL2ljb25zLnd4dWcuY29tL2kvYy8nICsgdGhpcy5pY29uU2V0ICsgaWNvblR5cGUgKyAnLmdpZic7XG4gIH07XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gQXBwICgpIHtcblxuICB2YXIgV1VBUEkgPSByZXF1aXJlKCcuL3dlYXRoZXItdW5kZXJncm91bmQtYXBpLmpzJyk7XG4gIHZhciByb3VuZHRvID0gcmVxdWlyZSgncm91bmQtdG8nKTtcblxuICByZXR1cm4ge1xuICAgIC8qIFRoZXNlIGFyZSB0d28gY29udGFpbmVycyB0byBzdG9yZSBvdXIgcmVzdWx0cyBpbiAqL1xuICAgIHVwcGVyRGF0YToge30sXG4gICAgbG93ZXJEYXRhOiB7fSxcblxuICAgIC8qIFRoaXMgaXMgYSBDbGFzcyBQcm9wZXJ0eSB0aGF0IHRlbGxzIHRoZSBBcHAgaWYgaXQgbmVlZHMgdG8gYWRkIHNwZWNpZmljaXR5IHRvIFBsYWNlTmFtZSAqL1xuICAgIHNwZWNpZmljUGxhY2VOYW1lTmVlZGVkOiBmYWxzZSxcblxuICAgIC8qIEluaXRpYWxpemUgdGhpcyEgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmluaXRTZWxlY3RvcnMoKTtcbiAgICAgIHRoaXMuaW5pdExpc3RlbmVycygpO1xuICAgICAgdGhpcy53ZWF0aGVyQVBJID0gbmV3IFdVQVBJKCk7XG4gICAgfSxcblxuICAgIC8qIElkZW50aWZ5IHNlbGVjdG9ycyBpbiBtYXJrdXAgKi9cbiAgICBpbml0U2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnVwcGVyRGF0YS4kaW5wdXQgPSAkKCcuaW5wdXQtY29udGFpbmVyJykuZmluZCgnaW5wdXQuanMtdXBwZXInKTtcbiAgICAgIHRoaXMubG93ZXJEYXRhLiRpbnB1dCA9ICQoJy5pbnB1dC1jb250YWluZXInKS5maW5kKCdpbnB1dC5qcy1sb3dlcicpO1xuICAgICAgdGhpcy5hbGxJbnB1dHMgPSB0aGlzLnVwcGVyRGF0YS4kaW5wdXQuYWRkKHRoaXMubG93ZXJEYXRhLiRpbnB1dCk7XG5cbiAgICAgIHRoaXMudXBwZXJEYXRhLiRvdXRwdXQgPSAkKCcub3V0cHV0LWNvbnRhaW5lcicpLmZpbmQoJ2Rpdi5qcy11cHBlcicpO1xuICAgICAgdGhpcy5sb3dlckRhdGEuJG91dHB1dCA9ICQoJy5vdXRwdXQtY29udGFpbmVyJykuZmluZCgnZGl2LmpzLWxvd2VyJyk7XG5cbiAgICAgIHRoaXMuJGRpZmZlcmVuY2VDb250ID0gJCgnLmNvbnRhaW5lcicpLmZpbmQoJy5kaWZmZXJlbmNlLWNvbnRhaW5lcicpO1xuICAgICAgdGhpcy4kZGlmZmVyZW5jZSA9ICQoJy5jb250YWluZXInKS5maW5kKCcuZGlmZmVyZW5jZS1tc2cnKTtcbiAgICAgIHRoaXMuJGNsZWFyQnV0dG9uID0gJCgnLmNvbnRhaW5lcicpLmZpbmQoJy5jbGVhci1idXR0b24nKTtcblxuICAgICAgdGhpcy4kZXJyb3JDb250YWluZXIgPSAkKCcuY29udGFpbmVyJykuZmluZCgnLmVycm9yLWNvbnRhaW5lcicpO1xuICAgICAgdGhpcy4kZXJyb3JBcnJvdyA9ICQoJy5jb250YWluZXInKS5maW5kKCcuZXJyb3ItaW5kaWNhdG9yJyk7XG4gICAgfSxcblxuICAgIC8qIEluaXRpYWxpemUgdGhlIGxpc3RlbmVycyBvbiB0aGUgc2VsZWN0b3JzICovXG4gICAgaW5pdExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5hbGxJbnB1dHMub24oJ2NoYW5nZScsICQucHJveHkodGhpcy5oYW5kbGVJbnB1dENoYW5nZSwgdGhpcykpO1xuICAgICAgdGhpcy5hbGxJbnB1dHMub24oJ2tleXVwJywgJC5wcm94eSh0aGlzLm1hbmFnZUlucHV0RW50cnksIHRoaXMpKTtcbiAgICAgIHRoaXMuJGNsZWFyQnV0dG9uLm9uKCdjbGljayB0b3VjaCcsICQucHJveHkodGhpcy5jbGVhckRhdGEsIHRoaXMpKTtcbiAgICB9LCAgXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5mb3JtYXRpb24gYmVpbmcgZW50ZXJlZCBpbnRvIHRoZSBpbnB1dHNcbiAgICAgKiBAcGFyYW0gIHtFdmVudH0gIGV2dCAgalF1ZXJ5IGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlSW5wdXRDaGFuZ2U6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgIHZhciAkdGFyZ2V0ID0gJChldnQudGFyZ2V0KTtcbiAgICAgIHZhciBsb2NhdGlvbiA9ICR0YXJnZXQudmFsKCk7XG4gICAgICB2YXIgdXBkYXRlT2JqZWN0ID0gJHRhcmdldC5oYXNDbGFzcygnanMtdXBwZXInKSA/IHRoaXMudXBwZXJEYXRhIDogdGhpcy5sb3dlckRhdGE7XG5cbiAgICAgIHVwZGF0ZU9iamVjdC5wbGFjZSA9IGxvY2F0aW9uO1xuICAgICAgdXBkYXRlT2JqZWN0LmVycm9yID0gbnVsbDtcblxuICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgIHRoaXMucmV0cmlldmVDb25kaXRpb25zRGF0YSh1cGRhdGVPYmplY3QpXG4gICAgICAgICAgLmRvbmUoJC5wcm94eSh0aGlzLnBvcHVsYXRlVGVtcGxhdGUsIHRoaXMpKVxuICAgICAgICAgIC5mYWlsKCQucHJveHkodGhpcy5oYW5kbGVFcnJvciwgdGhpcykpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExpc3RlbmVyIG9uIGJvdGggaW5wdXRzIGZvciByZXNwb25kaW5nIHRvIHVzZXIgaW50ZXJhY3Rpb24uICBDbGVhcnMgZXJyb3IsIGFkanVzdHMgZm9udCBzaXplLlxuICAgICAqIEBwYXJhbSAge2pRdWVyeX0gIGV2dCAgalF1ZXJ5IGV2ZW50LlxuICAgICAqIEByZXR1cm4ge2pRdWVyeX0gICAgICAgdGFyZ2V0IG9mIHRoZSBqUXVlcnkgZXZlbnQgXG4gICAgICovXG4gICAgbWFuYWdlSW5wdXRFbnRyeTogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgdmFyICR0aGlzSW5wdXQgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgdmFyIGVudHJ5ID0gJHRoaXNJbnB1dC52YWwoKTtcblxuICAgICAgaWYgKGVudHJ5ID09PSAnJykgdGhpcy5oYW5kbGVFcnJvcihlbnRyeSk7XG5cbiAgICAgIGlmIChlbnRyeS5sZW5ndGggPiA5KSB7XG4gICAgICAgICR0aGlzSW5wdXQuYWRkQ2xhc3MoJ3NtYWxsZXItaW5wdXQtdGV4dCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHRoaXNJbnB1dC5yZW1vdmVDbGFzcygnc21hbGxlci1pbnB1dC10ZXh0Jyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAkdGhpc0lucHV0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgYWxsIGRhdGEgZnJvbSB0aGUgdmlldy5cbiAgICAgKiBAcGFyYW0gIHtqUXVlcnl9ICBldnQgIFRoZSBqUXVlcnkgZXZlbnQgaWYgbmVlZGVkXG4gICAgICovXG4gICAgY2xlYXJEYXRhOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICB2YXIgYmxhbmtPYmogPSB7XG4gICAgICAgIHBsYWNlTmFtZTogJycsXG4gICAgICAgIHRlbXBTdHJpbmc6ICcnLFxuICAgICAgICB0ZW1wVmFsOiAwLFxuICAgICAgICBpY29uVXJsOiAnJyxcbiAgICAgICAgZXJyb3I6IHt9XG4gICAgICB9O1xuXG4gICAgICAkLmV4dGVuZCh0aGlzLnVwcGVyRGF0YSwgYmxhbmtPYmopO1xuICAgICAgJC5leHRlbmQodGhpcy5sb3dlckRhdGEsIGJsYW5rT2JqKTtcblxuICAgICAgdGhpcy5hbGxJbnB1dHMudmFsKCcnKTtcblxuICAgICAgdGhpcy5jbGVhclRlbXBsYXRlKHRoaXMudXBwZXJEYXRhLCB0aGlzLmxvd2VyRGF0YSk7XG4gICAgICB0aGlzLmNsZWFyQ29tcGFyaXNvbigpO1xuICAgICAgdGhpcy5jbGVhckVycm9ycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQYXNzIHRoZSBvYmplY3QgdG8gYmUgdXBkYXRlZCB0byB0aGUgV2VhdGhlciBBUEkgdG8gZ2V0IG5ldyBkYXRhLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gIHVwZGF0ZU9iamVjdCAgVGhlIGNvbnRhaW5lciB0byBiZSB1cGRhdGVkIHdpdGggbmV3IGRhdGFcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgICAgICAgIFJldHVybnMgUHJvbWlzZVxuICAgICAqL1xuICAgIHJldHJpZXZlQ29uZGl0aW9uc0RhdGE6IGZ1bmN0aW9uICh1cGRhdGVPYmplY3QpIHtcbiAgICAgIHZhciBEZWYgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgIHRoaXMud2VhdGhlckFQSS5yZXF1ZXN0KHVwZGF0ZU9iamVjdClcbiAgICAgICAgLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlT2JqKSB7XG4gICAgICAgICAgRGVmLnJlc29sdmUoJC5leHRlbmQodXBkYXRlT2JqZWN0LCByZXNwb25zZU9iaikpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICBEZWYucmVqZWN0KCQuZXh0ZW5kKHVwZGF0ZU9iamVjdCwgZXJyb3IpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBEZWY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHRoZSB0ZW1wbGF0ZSB3aXRoIHRoZSBkYXRhIHJlY2VpdmVkIGZyb20gdGhlIEFQSVxuICAgICAqIEBwYXJhbSAge09iamVjdH0gIGRhdGEgIEZvcm1hdHRlZCBvYmplY3QgcmVjZWl2ZWQgZnJvbSB3ZWF0aGVyIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlVGVtcGxhdGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKGRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jbGVhckVycm9ycygpO1xuICAgICAgICB2YXIgJG91dHB1dENvbnQgPSBkYXRhLiRvdXRwdXQ7XG5cbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoaXMgbmV3IHBsYWNlTmFtZSBpcyB0aGUgc2FtZSBhcyB0aGUgZXhpc3RpbmcgcGxhY2VOYW1lXG4gICAgICAgIHRoaXMuc3BlY2lmaWNQbGFjZU5hbWVOZWVkZWQgPSB0aGlzLnVwcGVyRGF0YS5wbGFjZU5hbWUgPT09IHRoaXMubG93ZXJEYXRhLnBsYWNlTmFtZSAmJlxuICAgICAgICAgIHRoaXMudXBwZXJEYXRhLnNwZWNpZmljUGxhY2UgIT09IHRoaXMubG93ZXJEYXRhLnNwZWNpZmljUGxhY2U7XG5cbiAgICAgICAgJG91dHB1dENvbnQuZmluZCgnLmNpdHktbmFtZScpLmh0bWwoZGF0YS5wbGFjZU5hbWUpO1xuICAgICAgICAkb3V0cHV0Q29udC5maW5kKCcubG9jYWwtdGVtcCcpLmh0bWwodGhpcy5tYXJrdXBUZW1wZXJhdHVyZShkYXRhLnRlbXBTdHJpbmcpKTtcbiAgICAgICAgJG91dHB1dENvbnQuZmluZCgnLmltZy1jb250YWluZXInKVxuICAgICAgICAgIC5lbXB0eSgpXG4gICAgICAgICAgLmFwcGVuZCgkKCc8aW1nPicsIHtcbiAgICAgICAgICAgIHNyYzogZGF0YS5pY29uVXJsXG4gICAgICAgICAgfSkpO1xuXG4gICAgICAgIHRoaXMudXBkYXRlUGxhY2VOYW1lcyh0aGlzLnVwcGVyRGF0YSwgdGhpcy5sb3dlckRhdGEpO1xuXG4gICAgICAgIGlmICh0aGlzLnVwcGVyRGF0YS50ZW1wVmFsICYmIHRoaXMubG93ZXJEYXRhLnRlbXBWYWwpIHtcbiAgICAgICAgICB0aGlzLmNvbXBhcmVUd29Mb2NhdGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgYSBzaW5nbGUgdGVtcGxhdGUgb2YgZGF0YS5cbiAgICAgKiBAcGFyYW0gIHtBcmd1bWVudHN9ICBhcmdzICBFeHBlY3RzIG9uZSBvciBtb3JlIGRhdGEgb2JqZWN0cyBhcyBBcmd1bWVudHNcbiAgICAgKi9cbiAgICBjbGVhclRlbXBsYXRlOiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgdmFyICRvdXRwdXRDb250O1xuXG4gICAgICBmb3IgKHZhciBpPTA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJG91dHB1dENvbnQgPSBhcmd1bWVudHNbaV0uJG91dHB1dDtcblxuICAgICAgICAkb3V0cHV0Q29udC5maW5kKCcuY2l0eS1uYW1lJykuaHRtbCgnJyk7XG4gICAgICAgICRvdXRwdXRDb250LmZpbmQoJy5sb2NhbC10ZW1wJykuaHRtbCgnJyk7XG4gICAgICAgICRvdXRwdXRDb250LmZpbmQoJy5pbWctY29udGFpbmVyJykuZW1wdHkoKTtcbiAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTcGVjaWZpY2FsbHkgdGFyZ2V0cyB0aGUgZGlzcGxheWVkIGxvY2F0aW9uIG5hbWUsIGFkZHMgbW9yZSBzcGVjaWZpY2l0eSBpZiB0aGUgdHdvIGRpc3BsYXllZFxuICAgICAqIHBsYWNlcyBhcmUgaWRlbnRpY2FsLlxuICAgICAqIEBwYXJhbSAge0FyZ3VtZW50c30gIGFyZ3MgIEV4cGVjdHMgb25lIG9yIG1vcmUgZGF0YSBvYmplY3RzIGFzIEFyZ3VtZW50cy5cbiAgICAgKi9cbiAgICB1cGRhdGVQbGFjZU5hbWVzOiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgdmFyIGFkZFNwZWNpZmljaXR5ID0gdGhpcy5zcGVjaWZpY1BsYWNlTmFtZU5lZWRlZDtcbiAgICAgIHZhciBvdXRwdXRPYmo7XG4gICAgICB2YXIgcHJvcFRvQWRkID0gYWRkU3BlY2lmaWNpdHkgPyAnc3BlY2lmaWNQbGFjZScgOiAncGxhY2VOYW1lJztcblxuICAgICAgZm9yICh2YXIgaT0wOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dHB1dE9iaiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgb3V0cHV0T2JqLiRvdXRwdXQuZmluZCgnLmNpdHktbmFtZScpLmh0bWwob3V0cHV0T2JqW3Byb3BUb0FkZF0pO1xuICAgICAgICBvdXRwdXRPYmouaXNTcGVjaWZpYyA9IGFkZFNwZWNpZmljaXR5O1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIG1hcmsgdXAgZm9yIHRoZSB0ZW1wZXJhdHVyZSBzdHJpbmc7IHdyYXBzIHBvcnRpb25zIG9mIHRoZSBtYXJrdXAgaW4gSFRNTCBlbGVtZW50c1xuICAgICAqIGZvciBzdHlsaW5nLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gIHRlbXBlcmF0dXJlU3RyaW5nICBBIHN0cmluZyBkZXNjcmlwaW5nIHRoZSB0ZW1wZXJhdHVyZSBpbiBkZWdyZWVzIEYsIGUuZy4gJzQ4LjUnLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICBBIHN0cmluZyBmb3JtYXR0ZWQgd2l0aCBIVE1MIHdyYXBwaW5nLlxuICAgICAqL1xuICAgIG1hcmt1cFRlbXBlcmF0dXJlOiBmdW5jdGlvbiAodGVtcGVyYXR1cmVTdHJpbmcpIHtcbiAgICAgIHZhciBtYXJrdXBGb3JtYXQgPSAnPHNwYW4gY2xhc3M9XCJuYXJyb3ctZGVnXCI+JmRlZzs8L3NwYW4+PHNwYW4gY2xhc3M9XCJzbWFsbC1mXCI+Rjwvc3Bhbj4nO1xuICAgICAgdmFyIGZvcm1hdHRlZFN0cmluZyA9ICcnO1xuXG4gICAgICBpZiAodGVtcGVyYXR1cmVTdHJpbmcpIHtcbiAgICAgICAgZm9ybWF0dGVkU3RyaW5nID0gdGVtcGVyYXR1cmVTdHJpbmcgKyBtYXJrdXBGb3JtYXQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmb3JtYXR0ZWRTdHJpbmc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIG1hdGhlbWF0aWNhbCBjb21wYXJpc29uIGJldHdlZW4gdGhlIHR3byBleGlzdGluZyBkYXRhIG9iamVjdCB0ZW1wZXJhdHVyZSB2YWx1ZXMuXG4gICAgICogQ2FsbHMgdGhlIHBvcHVsYXRpb24gbWV0aG9kIHdpdGggdGhlIGRpZmZlcmVuY2UgYW5kIGEgYm9vbGVhbiB0aGF0IGlzIHRydWUgaWYgdGhlIHVwcGVyIGRhdGFcbiAgICAgKiBpcyB3YXJtZXIgdGhhbiB0aGUgbG93ZXIuXG4gICAgICovXG4gICAgY29tcGFyZVR3b0xvY2F0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRpZmYgPSByb3VuZHRvKHRoaXMudXBwZXJEYXRhLnRlbXBWYWwgLSB0aGlzLmxvd2VyRGF0YS50ZW1wVmFsLCAxKTtcbiAgICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaWZmKS50b1N0cmluZygpO1xuICAgICAgdmFyIHRvcElzV2FybWVyID0gZGlmZiA+IDA7XG5cbiAgICAgIHRoaXMucG9wdWxhdGVDb21wYXJpc29uKGFicywgdG9wSXNXYXJtZXIpO1xuICAgIH0sICAgIFxuXG4gICAgLyoqXG4gICAgICogVW4tZGlzcGxheXMgdGhlIGVycm9yIHBvcHVwIGFuZCByZS1zZXRzIGl0LlxuICAgICAqL1xuICAgIGNsZWFyRXJyb3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLiRlcnJvckNvbnRhaW5lci5odG1sKCcnKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICB0aGlzLiRlcnJvckFycm93LnJlbW92ZUNsYXNzKCd1cHBlciBsb3dlcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGVzIHRoZSBjb21wYXJpc29uIHRlbXBsYXRlIG9mIHRoZSB2aWV3LlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gIGRpZmZlcmVuY2UgIFN0cmluZyBkZXNjcmliaW5nIHRoZSBkaWZmZXJlbmNlIGluIHRlbXBlcmF0dXJlIGJldHdlZW4gdGhlIHR3byBcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRlcmVkIGxvY2F0aW9ucy5cbiAgICAgKiBAcGFyYW0gIHtib29sZWFufSB0b3BJc1dhcm1lciBCb29sZWFuIGRlc2NyaWJpbmcgd2hldGhlciB0aGUgXCJ1cHBlclwiIGRhdGEgb2JqZWN0IGlzIHdhcm1lciB0aGFuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGxvd2VyLlxuICAgICAqL1xuICAgIHBvcHVsYXRlQ29tcGFyaXNvbjogZnVuY3Rpb24gKGRpZmZlcmVuY2UsIHRvcElzV2FybWVyKSB7XG4gICAgICB2YXIgY29tcGFyaXNvblN0cmluZztcbiAgICAgIHZhciBkaWZmU3RyaW5nID0gJ2lzIDxzcGFuIGNsYXNzPVwibGFyZ2VyLWRlZ1wiPiVkJmRlZzs8L3NwYW4+JztcbiAgICAgIHZhciB0b3BXYXJtZXIgPSAnIHdhcm1lciB0aGFuJztcbiAgICAgIHZhciB0b3BDb29sZXIgPSAnIGNvb2xlciB0aGFuJztcbiAgICAgIHZhciBzYW1lU3RyaW5nID0gJ2lzIHRoZSBzYW1lIHRlbXBlcmF0dXJlIGFzJztcblxuICAgICAgaWYgKGRpZmZlcmVuY2UpIHtcbiAgICAgICAgY29tcGFyaXNvblN0cmluZyA9IHRvcElzV2FybWVyID8gdG9wV2FybWVyIDogdG9wQ29vbGVyO1xuICAgICAgICBkaWZmU3RyaW5nID0gZGlmZlN0cmluZy5yZXBsYWNlKCclZCcsIGRpZmZlcmVuY2UpO1xuXG4gICAgICAgIHRoaXMuJGRpZmZlcmVuY2UuaHRtbChkaWZmU3RyaW5nICsgY29tcGFyaXNvblN0cmluZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLiRkaWZmZXJlbmNlLmh0bWwoc2FtZVN0cmluZyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGRpZmZlcmVuY2VDb250LnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW1wdGllcyB0aGUgY29tcGFyaXNvbiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNsZWFyQ29tcGFyaXNvbjogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy4kZGlmZmVyZW5jZS5odG1sKCcnKTtcbiAgICAgIHRoaXMuJGRpZmZlcmVuY2VDb250LmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmlldyBtZXRob2QgdG8gYWRkIG9yIGNsZWFyIGVycm9ycyByZWNlaXZlZCBmcm9tIHRoZSBTZXJ2aWNlIG9yIGluaXRpYXRlZCBieSB0aGUgdmlldy4gXG4gICAgICogQHBhcmFtICB7T2JqZWN0IG9yICcnfSAgZXJyb3IgIEVpdGhlciB0aGUgZGF0YSBvYmplY3Qgd2l0aCBhbiAnZXJyb3InIHBhcmFtZXRlciAodG8gYWRkIHRoZSBlcnJvcilcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgYSBmYWxzZXkgdmFsdWUgdG8gcmVtb3ZlIHRoZSBlcnJvci5cbiAgICAgKi9cbiAgICBoYW5kbGVFcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICBpZiAoZXJyb3IgJiYgZXJyb3IuZXJyb3IpIHtcbiAgICAgICAgdmFyIGluZGljYXRvckNsYXNzID0gZXJyb3IuJGlucHV0Lmhhc0NsYXNzKCdqcy11cHBlcicpID8gJ3VwcGVyJyA6ICdsb3dlcic7XG4gICAgICAgIHRoaXMuJGVycm9yQ29udGFpbmVyLmh0bWwoZXJyb3IuZXJyb3IuZGVzY3JpcHRpb24pLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgdGhpcy4kZXJyb3JBcnJvdy5yZW1vdmVDbGFzcygndXBwZXIgbG93ZXInKS5hZGRDbGFzcyhpbmRpY2F0b3JDbGFzcykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB0aGlzLmNsZWFyVGVtcGxhdGUoZXJyb3IpO1xuICAgICAgICB0aGlzLmNsZWFyQ29tcGFyaXNvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jbGVhckVycm9ycygpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLy8gVE9ETzogVW5pdCBUZXN0cyFcbi8vIFRPRE86IE1ha2UgYSBHcnVudCBCdWlsZCB0YXNrID9cbiIsIm1vZHVsZS5leHBvcnRzID1cbntcbiAgXCJyZXNwb25zZVwiOiB7XG4gIFwidmVyc2lvblwiOiBcIjAuMVwiLFxuICBcInRlcm1zb2ZTZXJ2aWNlXCI6IFwiaHR0cDovL3d3dy53dW5kZXJncm91bmQuY29tL3dlYXRoZXIvYXBpL2QvdGVybXMuaHRtbFwiLFxuICBcImZlYXR1cmVzXCI6IHtcbiAgXCJjb25kaXRpb25zXCI6IDFcbiAgfVxuICB9LFxuICBcImN1cnJlbnRfb2JzZXJ2YXRpb25cIjoge1xuICBcImltYWdlXCI6IHtcbiAgXCJ1cmxcIjogXCJodHRwOi8vaWNvbnMtYWsud3h1Zy5jb20vZ3JhcGhpY3Mvd3UyL2xvZ29fMTMweDgwLnBuZ1wiLFxuICBcInRpdGxlXCI6IFwiV2VhdGhlciBVbmRlcmdyb3VuZFwiLFxuICBcImxpbmtcIjogXCJodHRwOi8vd3d3Lnd1bmRlcmdyb3VuZC5jb21cIlxuICB9LFxuICBcImRpc3BsYXlfbG9jYXRpb25cIjoge1xuICBcImZ1bGxcIjogXCJTYW4gRnJhbmNpc2NvLCBDQVwiLFxuICBcImNpdHlcIjogXCJTYW4gRnJhbmNpc2NvXCIsXG4gIFwic3RhdGVcIjogXCJDQVwiLFxuICBcInN0YXRlX25hbWVcIjogXCJDYWxpZm9ybmlhXCIsXG4gIFwiY291bnRyeVwiOiBcIlVTXCIsXG4gIFwiY291bnRyeV9pc28zMTY2XCI6IFwiVVNcIixcbiAgXCJ6aXBcIjogXCI5NDEwMVwiLFxuICBcImxhdGl0dWRlXCI6IFwiMzcuNzc1MDA5MTZcIixcbiAgXCJsb25naXR1ZGVcIjogXCItMTIyLjQxODI1ODY3XCIsXG4gIFwiZWxldmF0aW9uXCI6IFwiNDcuMDAwMDAwMDBcIlxuICB9LFxuICBcIm9ic2VydmF0aW9uX2xvY2F0aW9uXCI6IHtcbiAgXCJmdWxsXCI6IFwiU09NQSAtIE5lYXIgVmFuIE5lc3MsIFNhbiBGcmFuY2lzY28sIENhbGlmb3JuaWFcIixcbiAgXCJjaXR5XCI6IFwiU09NQSAtIE5lYXIgVmFuIE5lc3MsIFNhbiBGcmFuY2lzY29cIixcbiAgXCJzdGF0ZVwiOiBcIkNhbGlmb3JuaWFcIixcbiAgXCJjb3VudHJ5XCI6IFwiVVNcIixcbiAgXCJjb3VudHJ5X2lzbzMxNjZcIjogXCJVU1wiLFxuICBcImxhdGl0dWRlXCI6IFwiMzcuNzczMjg1XCIsXG4gIFwibG9uZ2l0dWRlXCI6IFwiLTEyMi40MTc3MjVcIixcbiAgXCJlbGV2YXRpb25cIjogXCI0OSBmdFwiXG4gIH0sXG4gIFwiZXN0aW1hdGVkXCI6IHt9LFxuICBcInN0YXRpb25faWRcIjogXCJLQ0FTQU5GUjU4XCIsXG4gIFwib2JzZXJ2YXRpb25fdGltZVwiOiBcIkxhc3QgVXBkYXRlZCBvbiBKdW5lIDI3LCA1OjI3IFBNIFBEVFwiLFxuICBcIm9ic2VydmF0aW9uX3RpbWVfcmZjODIyXCI6IFwiV2VkLCAyNyBKdW4gMjAxMiAxNzoyNzoxMyAtMDcwMFwiLFxuICBcIm9ic2VydmF0aW9uX2Vwb2NoXCI6IFwiMTM0MDg0MzIzM1wiLFxuICBcImxvY2FsX3RpbWVfcmZjODIyXCI6IFwiV2VkLCAyNyBKdW4gMjAxMiAxNzoyNzoxNCAtMDcwMFwiLFxuICBcImxvY2FsX2Vwb2NoXCI6IFwiMTM0MDg0MzIzNFwiLFxuICBcImxvY2FsX3R6X3Nob3J0XCI6IFwiUERUXCIsXG4gIFwibG9jYWxfdHpfbG9uZ1wiOiBcIkFtZXJpY2EvTG9zX0FuZ2VsZXNcIixcbiAgXCJsb2NhbF90el9vZmZzZXRcIjogXCItMDcwMFwiLFxuICBcIndlYXRoZXJcIjogXCJQYXJ0bHkgQ2xvdWR5XCIsXG4gIFwidGVtcGVyYXR1cmVfc3RyaW5nXCI6IFwiNjYuMyBGICgxOS4xIEMpXCIsXG4gIFwidGVtcF9mXCI6IDY2LjMsXG4gIFwidGVtcF9jXCI6IDE5LjEsXG4gIFwicmVsYXRpdmVfaHVtaWRpdHlcIjogXCI2NSVcIixcbiAgXCJ3aW5kX3N0cmluZ1wiOiBcIkZyb20gdGhlIE5OVyBhdCAyMi4wIE1QSCBHdXN0aW5nIHRvIDI4LjAgTVBIXCIsXG4gIFwid2luZF9kaXJcIjogXCJOTldcIixcbiAgXCJ3aW5kX2RlZ3JlZXNcIjogMzQ2LFxuICBcIndpbmRfbXBoXCI6IDIyLjAsXG4gIFwid2luZF9ndXN0X21waFwiOiBcIjI4LjBcIixcbiAgXCJ3aW5kX2twaFwiOiAzNS40LFxuICBcIndpbmRfZ3VzdF9rcGhcIjogXCI0NS4xXCIsXG4gIFwicHJlc3N1cmVfbWJcIjogXCIxMDEzXCIsXG4gIFwicHJlc3N1cmVfaW5cIjogXCIyOS45M1wiLFxuICBcInByZXNzdXJlX3RyZW5kXCI6IFwiK1wiLFxuICBcImRld3BvaW50X3N0cmluZ1wiOiBcIjU0IEYgKDEyIEMpXCIsXG4gIFwiZGV3cG9pbnRfZlwiOiA1NCxcbiAgXCJkZXdwb2ludF9jXCI6IDEyLFxuICBcImhlYXRfaW5kZXhfc3RyaW5nXCI6IFwiTkFcIixcbiAgXCJoZWF0X2luZGV4X2ZcIjogXCJOQVwiLFxuICBcImhlYXRfaW5kZXhfY1wiOiBcIk5BXCIsXG4gIFwid2luZGNoaWxsX3N0cmluZ1wiOiBcIk5BXCIsXG4gIFwid2luZGNoaWxsX2ZcIjogXCJOQVwiLFxuICBcIndpbmRjaGlsbF9jXCI6IFwiTkFcIixcbiAgXCJmZWVsc2xpa2Vfc3RyaW5nXCI6IFwiNjYuMyBGICgxOS4xIEMpXCIsXG4gIFwiZmVlbHNsaWtlX2ZcIjogXCI2Ni4zXCIsXG4gIFwiZmVlbHNsaWtlX2NcIjogXCIxOS4xXCIsXG4gIFwidmlzaWJpbGl0eV9taVwiOiBcIjEwLjBcIixcbiAgXCJ2aXNpYmlsaXR5X2ttXCI6IFwiMTYuMVwiLFxuICBcInNvbGFycmFkaWF0aW9uXCI6IFwiXCIsXG4gIFwiVVZcIjogXCI1XCIsXG4gIFwicHJlY2lwXzFocl9zdHJpbmdcIjogXCIwLjAwIGluICggMCBtbSlcIixcbiAgXCJwcmVjaXBfMWhyX2luXCI6IFwiMC4wMFwiLFxuICBcInByZWNpcF8xaHJfbWV0cmljXCI6IFwiIDBcIixcbiAgXCJwcmVjaXBfdG9kYXlfc3RyaW5nXCI6IFwiMC4wMCBpbiAoMCBtbSlcIixcbiAgXCJwcmVjaXBfdG9kYXlfaW5cIjogXCIwLjAwXCIsXG4gIFwicHJlY2lwX3RvZGF5X21ldHJpY1wiOiBcIjBcIixcbiAgXCJpY29uXCI6IFwicGFydGx5Y2xvdWR5XCIsXG4gIFwiaWNvbl91cmxcIjogXCJodHRwOi8vaWNvbnMtYWsud3h1Zy5jb20vaS9jL2svcGFydGx5Y2xvdWR5LmdpZlwiLFxuICBcImZvcmVjYXN0X3VybFwiOiBcImh0dHA6Ly93d3cud3VuZGVyZ3JvdW5kLmNvbS9VUy9DQS9TYW5fRnJhbmNpc2NvLmh0bWxcIixcbiAgXCJoaXN0b3J5X3VybFwiOiBcImh0dHA6Ly93d3cud3VuZGVyZ3JvdW5kLmNvbS9oaXN0b3J5L2FpcnBvcnQvS0NBU0FORlI1OC8yMDEyLzYvMjcvRGFpbHlIaXN0b3J5Lmh0bWxcIixcbiAgXCJvYl91cmxcIjogXCJodHRwOi8vd3d3Lnd1bmRlcmdyb3VuZC5jb20vY2dpLWJpbi9maW5kd2VhdGhlci9nZXRGb3JlY2FzdD9xdWVyeT0zNy43NzMyODUsLTEyMi40MTc3MjVcIlxuICB9XG59IiwidmFyIFEgPSBRVW5pdDtcblxudmFyIEFwcCA9IHJlcXVpcmUoJy4uL3NjcmlwdHMvd2VhdGhlck9yLmpzJyk7XG52YXIgV1VBcGkgPSByZXF1aXJlKCcuLi9zY3JpcHRzL3dlYXRoZXItdW5kZXJncm91bmQtYXBpLmpzJyk7XG52YXIgbW9ja0FwaVJlc3BvbnNlID0gcmVxdWlyZSgnLi9tb2NrLXJlc3BvbnNlLmpzJyk7XG5cbnZhciBtYXJrdXBGaXh0dXJlcyA9IHtcbiAgYmFzZTogJyNxdW5pdC1maXh0dXJlJyxcbiAgYWxsSW5wdXRzOiAnPGRpdiBjbGFzcz1cImlucHV0LWNvbnRhaW5lclwiPjxpbnB1dCBjbGFzcz1cImpzLXVwcGVyXCIgLz48aW5wdXQgY2xhc3M9XCJqcy1sb3dlclwiIC8+PC9kaXY+JyxcbiAgY2xlYXJCdXR0b246ICc8ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+PGRpdiBjbGFzcz1cImNsZWFyLWJ1dHRvblwiPjwvZGl2PjwvZGl2PicsXG4gIGxvd2VySW5wdXQ6ICc8aW5wdXQgY2xhc3M9XCJqcy1sb3dlclwiIC8+JyxcbiAgbG93ZXJPdXRwdXQ6ICc8ZGl2IGNsYXNzPVwib3V0cHV0LWNvbnRhaW5lclwiPjxkaXYgY2xhc3M9XCJqcy1sb3dlclwiPjwvZGl2PjwvZGl2PicsXG4gIGVycm9yQ29udGFpbmVyOiAnPGRpdiBjbGFzcz1cImVycm9yLWNvbnRhaW5lclwiPjwvZGl2PicsXG4gIGVycm9yQXJyb3c6ICc8ZGl2IGNsYXNzPVwiZXJyb3ItYXJyb3dcIj48L2Rpdj4nXG59O1xuXG52YXIgZW1wdHlGeHQgPSBmdW5jdGlvbiAoKSB7XG4gICQobWFya3VwRml4dHVyZXMuYmFzZSkuZW1wdHkoKTtcbn07XG5cbnZhciBtb2NrRGVmZXJyZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgZG9uZTogZnVuY3Rpb24gKCkge3JldHVybiB0aGlzO30sXG4gICAgZmFpbDogZnVuY3Rpb24gKCkge3JldHVybiB0aGlzO31cbiAgfTtcbn1cblxuXG4vLyBUZXN0IG9mIHdlYXRoZXJPci5qc1xuUS50ZXN0KCAnSW5pdCBzaG91bGQgaW52b2tlIGluaXRTZWxlY3RvcnMgYW5kIGluaXRMaXN0ZW5lcnMnLCBmdW5jdGlvbihhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB2YXIgc2VsZWN0b3JTcHkgPSB0aGlzLnNweSh3ZWF0aGVyVGVzdCwgJ2luaXRTZWxlY3RvcnMnKTtcbiAgdmFyIGxpc3RlbmVyU3B5ID0gdGhpcy5zcHkod2VhdGhlclRlc3QsICdpbml0TGlzdGVuZXJzJyk7XG5cbiAgd2VhdGhlclRlc3QuaW5pdCgpO1xuXG4gIGFzc2VydC5vayh3ZWF0aGVyVGVzdC5pbml0U2VsZWN0b3JzLmNhbGxlZE9uY2UgJiYgd2VhdGhlclRlc3QuaW5pdExpc3RlbmVycy5jYWxsZWRPbmNlLCAncGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCAnSW5pdCBzaG91bGQgaW5zdGFudGlhdGUgYSBuZXcgd2VhdGhlciBBUEknLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcblxuICB3ZWF0aGVyVGVzdC5pbml0KCk7XG5cbiAgYXNzZXJ0Lm9rKHR5cGVvZiB3ZWF0aGVyVGVzdC53ZWF0aGVyQVBJID09PSAnb2JqZWN0JywgJ3Bhc3NlZCcpO1xufSk7XG5cblEudGVzdCggJ2luaXRTZWxlY3RvcnMgc2hvdWxkIHBvcHVsYXRlIHRoZSBhcHBcXCdzIGRhdGEgb2JqZWN0cycsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHVwcGVyRGF0YSwgbG93ZXJEYXRhLCBhbGxJbnB1dHMsIHVkSW5wdXQsIHVkT3V0cHV0LCBsZElucHV0LCBsZE91dHB1dCwgZGlmZmVyZW5jZSwgZGlmZk1zZywgXG4gICAgY2xlYXJCdG4sIGVyckNvbnQsIGVyckFycm93O1xuICB2YXIgZWxlbWVudHNBcnJheTtcbiAgdmFyIGFsbEVsZW1lbnRzVmFsaWQgPSB0cnVlO1xuXG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgd2VhdGhlclRlc3QuaW5pdFNlbGVjdG9ycygpO1xuXG4gIHVwcGVyRGF0YSA9IHdlYXRoZXJUZXN0LnVwcGVyRGF0YTtcbiAgbG93ZXJEYXRhID0gd2VhdGhlclRlc3QubG93ZXJEYXRhO1xuICBhbGxJbnB1dHMgPSB3ZWF0aGVyVGVzdC5hbGxJbnB1dHM7XG4gIHVkSW5wdXQgPSB1cHBlckRhdGEuJGlucHV0O1xuICB1ZE91dHB1dCA9IHVwcGVyRGF0YS4kb3V0cHV0O1xuICBsZElucHV0ID0gbG93ZXJEYXRhLiRpbnB1dDtcbiAgbGRPdXRwdXQgPSBsb3dlckRhdGEuJG91dHB1dDtcbiAgZGlmZmVyZW5jZSA9IHdlYXRoZXJUZXN0LiRkaWZmZXJlbmNlQ29udDtcbiAgZGlmZk1zZyA9IHdlYXRoZXJUZXN0LiRkaWZmZXJlbmNlO1xuICBjbGVhckJ0biA9IHdlYXRoZXJUZXN0LiRjbGVhckJ1dHRvbjtcbiAgZXJyQ29udCA9IHdlYXRoZXJUZXN0LiRlcnJvckNvbnRhaW5lcjtcbiAgZXJyQXJyb3cgPSB3ZWF0aGVyVGVzdC4kZXJyb3JBcnJvdztcblxuICBlbGVtZW50c0FycmF5ID0gW2FsbElucHV0cywgdWRJbnB1dCwgdWRPdXRwdXQsIGxkSW5wdXQsIGxkT3V0cHV0LCBkaWZmZXJlbmNlLCBkaWZmTXNnLCBcbiAgICBjbGVhckJ0biwgZXJyQ29udCwgZXJyQXJyb3ddO1xuXG4gIGZvciAodmFyIGk9MDsgaSA8IGVsZW1lbnRzQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoIShlbGVtZW50c0FycmF5W2ldIGluc3RhbmNlb2YgalF1ZXJ5KSkge1xuICAgICAgYWxsRWxlbWVudHNWYWxpZCA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgYXNzZXJ0Lm9rKGFsbEVsZW1lbnRzVmFsaWQsICdwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoICdpbml0TGlzdGVuZXJzIHNob3VsZCBzZXQgYSBjaGFuZ2UgbGlzdGVuZXIgb24gYWxsSW5wdXRzICcsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB2YXIgcHJveHlTcHkgPSB0aGlzLnNweSgkLCAncHJveHknKTtcblxuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmFsbElucHV0cykpO1xuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmNsZWFyQnV0dG9uKSk7XG4gIHdlYXRoZXJUZXN0LmFsbElucHV0cyA9ICQobWFya3VwRml4dHVyZXMuYWxsSW5wdXRzKTtcbiAgd2VhdGhlclRlc3QuJGNsZWFyQnV0dG9uID0gJChtYXJrdXBGaXh0dXJlcy5jbGVhckJ1dHRvbik7XG5cbiAgd2VhdGhlclRlc3QuaW5pdExpc3RlbmVycygpO1xuXG4gICQobWFya3VwRml4dHVyZXMubG93ZXJJbnB1dCkuY2xpY2soKTtcbiAgJChtYXJrdXBGaXh0dXJlcy5hbGxJbnB1dHMpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAkKG1hcmt1cEZpeHR1cmVzLmNsZWFyQnV0dG9uKS5jbGljaygpO1xuXG4gIGFzc2VydC5vayhwcm94eVNweS5jYWxsZWRXaXRoKHdlYXRoZXJUZXN0LmhhbmRsZUlucHV0Q2hhbmdlKSwgJ2lucHV0IGNoYW5nZSBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKHByb3h5U3B5LmNhbGxlZFdpdGgod2VhdGhlclRlc3QubWFuYWdlSW5wdXRFbnRyeSksICdpbnB1dCBlbnRyeSBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKHByb3h5U3B5LmNhbGxlZFdpdGgod2VhdGhlclRlc3QuY2xlYXJEYXRhKSwgJ2NsZWFyIGJ1dHRvbiBjbGljayBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKHByb3h5U3B5LmFyZ3MubGVuZ3RoID09PSAzLCAndGhyZWUgY2FsbHMgdG8gcHJveHkgcGFzc2VkJyk7XG4gIGVtcHR5Rnh0KCk7XG59KTtcblxuUS50ZXN0KCAnaGFuZGxlSW5wdXRDaGFuZ2Ugc2hvdWxkIGNhbGwgcmV0cmlldmUgY29uZGl0aW9ucyB3aXRoIGNvcnJlY3QgZGF0YScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIG1vY2tFdmVudCwgcGFzc2VkT2JqO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciByZXRyaWV2ZUNvbmRpdGlvbnNTcHkgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdyZXRyaWV2ZUNvbmRpdGlvbnNEYXRhJywgbW9ja0RlZmVycmVkKTtcblxuICB2YXIgdGFyZ2V0RWwgPSAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpKTtcbiAgdGFyZ2V0RWwudmFsKCdob2d3YXJ0cycpO1xuXG4gIG1vY2tFdmVudCA9IHtcbiAgICB0YXJnZXQ6IHRhcmdldEVsXG4gIH1cblxuICB3ZWF0aGVyVGVzdC5oYW5kbGVJbnB1dENoYW5nZShtb2NrRXZlbnQpO1xuXG4gIHBhc3NlZE9iaiA9IHJldHJpZXZlQ29uZGl0aW9uc1NweS5hcmdzWzBdWzBdO1xuXG4gIGFzc2VydC5vayhwYXNzZWRPYmoucGxhY2UgPT09ICdob2d3YXJ0cycsICdwbGFjZSB2YWx1ZSBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKHBhc3NlZE9iai5lcnJvciA9PT0gbnVsbCwgJ3Jlc2V0IGVycm9yIHBhc3NlZCcpO1xuICBlbXB0eUZ4dCgpO1xufSk7XG5cblEudGVzdCggJ21hbmFnZUlucHV0RW50cnkgc2hvdWxkIGhhbmRsZSBlcnJvciwgb3IgYWRkIC8gcmVtb3ZlIGNsYXNzZXMgYmFzZWQgb24gbGVuZ3RoJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgbW9ja0V2ZW50LCB0YXJnZXRFbCwgYWRkQ2xhc3NTcHksIHJlbW92ZUNsYXNzU3B5LCB6ZXJvTGVuZ3RoLCBvdmVyTmluZSwgdW5kZXJOaW5lO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBoYW5kbGVFcnJvclNweSA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2hhbmRsZUVycm9yJyk7XG5cbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KSk7XG4gIHRhcmdldEVsID0gJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KTtcbiAgXG4gIG1vY2tFdmVudCA9IHtcbiAgICB0YXJnZXQ6IHRhcmdldEVsXG4gIH1cblxuICB0YXJnZXRFbC52YWwoJycpOyAvLyBaZXJvIGxlbmd0aCBlbnRyeVxuICB6ZXJvTGVuZ3RoID0gd2VhdGhlclRlc3QubWFuYWdlSW5wdXRFbnRyeShtb2NrRXZlbnQpO1xuICBhc3NlcnQub2soaGFuZGxlRXJyb3JTcHkuY2FsbGVkT25jZSAmJiBoYW5kbGVFcnJvclNweS5jYWxsZWRXaXRoKCcnKSwgJ2VtcHR5IHN0cmluZywgaGFuZGxlIGVycm9yIHBhc3NlZCcpO1xuXG4gIHRhcmdldEVsLnZhbCgnbmluZUNoYXJhY3RlcnNPck1vcmUnKTsgLy8gT3ZlciBuaW5lIGNoYXJhY3RlcnNcbiAgb3Zlck5pbmUgPSB3ZWF0aGVyVGVzdC5tYW5hZ2VJbnB1dEVudHJ5KG1vY2tFdmVudCk7XG4gIGFzc2VydC5vayhvdmVyTmluZS5oYXNDbGFzcygnc21hbGxlci1pbnB1dC10ZXh0JyksICdsb25nIHN0cmluZywgc21hbGwgZm9udCBjbGFzcyBhZGRlZCcpO1xuXG4gIHRhcmdldEVsLnZhbCgnc2hvcnQnKTsgLy8gVW5kZXIgbmluZSBjaGFyYWN0ZXJzXG4gIHVuZGVyTmluZSA9IHdlYXRoZXJUZXN0Lm1hbmFnZUlucHV0RW50cnkobW9ja0V2ZW50KTtcbiAgYXNzZXJ0Lm9rKCF1bmRlck5pbmUuaGFzQ2xhc3MoJ3NtYWxsZXItaW5wdXQtdGV4dCcpLCAnc2hvcnQgc3RyaW5nLCBzbWFsbCBmb250IGNsYXNzIHJlbW92ZWQnKTtcblxuICBlbXB0eUZ4dCgpO1xufSk7XG5cblEudGVzdCgnY2xlYXJEYXRhIHNob3VsZCBlbXB0eSBkYXRhIG9iamVjdHMsIGVtcHR5IHRoZSBpbnB1dHMsIGFuZCBpbnZva2Ugc3Vib3JkaW5hdGUgZm5jdGlvbnMnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGNsZWFyVGVtcGxhdGVTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJUZW1wbGF0ZScpO1xuICB2YXIgY2xlYXJDb21wYXNyaXNvblN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjbGVhckNvbXBhcmlzb24nKTtcbiAgdmFyIGNsZWFyRXJyb3JTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJFcnJvcnMnKTtcbiAgdmFyIGJsYW5rT2JqRml4dHVyZSA9IHtcbiAgICBwbGFjZU5hbWU6ICcnLFxuICAgIHRlbXBTdHJpbmc6ICcnLFxuICAgIHRlbXBWYWw6IDAsXG4gICAgaWNvblVybDogJycsXG4gICAgZXJyb3I6IHt9XG4gIH1cblxuICB3ZWF0aGVyVGVzdC5hbGxJbnB1dHMgPSAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmFsbElucHV0cykudmFsKCc0IHByaXZldCBkcml2ZScpKVxuXG4gIHdlYXRoZXJUZXN0LnVwcGVyRGF0YSA9IHtcbiAgICBwbGFjZU5hbWU6ICdob2d3YXJ0cycsXG4gICAgdGVtcFN0cmluZzogJ2NoaWxseScsXG4gICAgdGVtcFZhbDogNyxcbiAgICBpY29uVXJsOiAnbWlycm9yX29mX2VyaXNlZCcsXG4gICAgZXJyb3I6IHtkZXNjcmlwdGlvbjogJ1doYXQgd291bGQgSSBnZXQgaWYgSSBhZGRlZCBwb3dkZXJlZCByb290IG9mIGFzcGhvZGVsIHRvIGFuIGluZnVzaW9uIG9mIHdvcm13b29kPyd9XG4gIH1cblxuICB3ZWF0aGVyVGVzdC5jbGVhckRhdGEoKTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHdlYXRoZXJUZXN0LnVwcGVyRGF0YSwgYmxhbmtPYmpGaXh0dXJlLCAnYmxhbmsgb3V0IGRhdGEgb2JqZWN0IHBhc3NlZCcpO1xuICBhc3NlcnQub2sod2VhdGhlclRlc3QuYWxsSW5wdXRzLnZhbCgpID09PSAnJywgJ2VtcHR5IGlucHV0cyBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKGNsZWFyVGVtcGxhdGVTdHViLmNhbGxlZE9uY2UsICdjbGVhclRlbXBsYXRlIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjbGVhckNvbXBhc3Jpc29uU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXJDb21wYXJpc29uIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjbGVhckVycm9yU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXJFcnJvcnMgY2FsbCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ3JldHJpZXZlQ29uZGl0aW9uc0RhdGEgc2hvdWxkIGludm9rZSByZXF1ZXN0IGZyb20gdGhlIHdlYXRoZXJBUEkgd2l0aCB0aGUgcHJvdmlkZWQgZGF0YScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIGFwaVJlcXVlc3RTdHViO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG5cbiAgd2VhdGhlclRlc3Qud2VhdGhlckFQSSA9IHsgcmVxdWVzdDogbW9ja0RlZmVycmVkIH07XG4gIGFwaVJlcXVlc3RTdHViID0gdGhpcy5zcHkod2VhdGhlclRlc3Qud2VhdGhlckFQSSwgJ3JlcXVlc3QnKTtcblxuICB2YXIgdGVzdE9iaiA9IHtcbiAgICBwbGFjZTogJ21vcyBlaXNsZXknLFxuICAgIGVycm9yOiBudWxsXG4gIH1cblxuICB3ZWF0aGVyVGVzdC5yZXRyaWV2ZUNvbmRpdGlvbnNEYXRhKHRlc3RPYmopO1xuXG4gIGFzc2VydC5vayhhcGlSZXF1ZXN0U3R1Yi5jYWxsZWRXaXRoKHRlc3RPYmopLCAnY29ycmVjdCBvYmplY3QgcGFzc2VkIHRvIHJlcXVlc3QsIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgncG9wdWxhdGVUZW1wbGF0ZSBzaG91bGQgY2FsbCBoYW5kbGVFcnJvciBpZiB0aGVyZSBpcyBhbiBlcnJvciBwcm9wZXJ0eScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB2YXIgaGFuZGxlRXJyb3JTcHkgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdoYW5kbGVFcnJvcicpO1xuICB2YXIgZXJyb3JUZXN0T2JqID0ge1xuICAgIHBsYWNlTmFtZTogJ21vcyBlaXNsZXknLFxuICAgIGVycm9yOiB7ZGVzY3JpcHRpb246ICdUaGlzIGlzIGEgd3JldGNoZWQgaGl2ZSBvZiBzY3VtIGFuZCB2aWxsYWlueSd9XG4gIH1cblxuICB3ZWF0aGVyVGVzdC5wb3B1bGF0ZVRlbXBsYXRlKGVycm9yVGVzdE9iaik7XG5cbiAgYXNzZXJ0Lm9rKGhhbmRsZUVycm9yU3B5LmNhbGxlZFdpdGgoZXJyb3JUZXN0T2JqKSwgJ2NhbGxlZCBoYW5kbGVFcnJvciB3aGVuIG9iamVjdCBoYXMgZXJyb3IgcHJvcCwgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdwb3B1bGF0ZVRlbXBsYXRlIHNob3VsZCBjYWxsIHVwZGF0ZSB0aGUgdGVtcGxhdGUsIGFuZCBjYWxsIHN1Ym9yZGluYXRlIG1ldGhvZHMnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB0ZXN0T2JqLCB0ZXN0THdyT3V0cHV0O1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBjbGVhckVycm9yU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2NsZWFyRXJyb3JzJyk7XG4gIHZhciBtYXJrdXBUZW1wZXJhdHVyZVN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdtYXJrdXBUZW1wZXJhdHVyZScpO1xuICB2YXIgdXBkYXRlUGxhY2VOYW1lU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ3VwZGF0ZVBsYWNlTmFtZXMnKTtcbiAgdmFyIGNvbXBhcmVUd29Mb2NhdGlvblN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjb21wYXJlVHdvTG9jYXRpb25zJyk7XG5cbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5sb3dlck91dHB1dCkpO1xuXG4gIHRlc3RMd3JPdXRwdXQgPSAkKG1hcmt1cEZpeHR1cmVzLmxvd2VyT3V0cHV0KTtcblxuICB0ZXN0T2JqID0ge1xuICAgIHBsYWNlTmFtZTogJ2dvbmRvcicsXG4gICAgdGVtcFN0cmluZzogJ3N0b3JteScsXG4gICAgdGVtcFZhbDogOTcsXG4gICAgaWNvblVybDogJycsXG4gICAgJG91dHB1dDogdGVzdEx3ck91dHB1dFxuICB9O1xuXG4gIHdlYXRoZXJUZXN0LnVwcGVyRGF0YS50ZW1wVmFsID0gOTk7XG4gIHdlYXRoZXJUZXN0Lmxvd2VyRGF0YS50ZW1wVmFsID0gOTc7XG5cblxuICB3ZWF0aGVyVGVzdC5wb3B1bGF0ZVRlbXBsYXRlKHRlc3RPYmopO1xuXG4gIGFzc2VydC5vayhjbGVhckVycm9yU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXIgZXJyb3JzIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhtYXJrdXBUZW1wZXJhdHVyZVN0dWIuY2FsbGVkV2l0aCh0ZXN0T2JqLnRlbXBTdHJpbmcpLCAnbWFya3VwIHRlbXBlcmF0dXJlcyBjYWxsIHBhc3NlZCcpO1xuICBhc3NlcnQub2sodXBkYXRlUGxhY2VOYW1lU3R1Yi5jYWxsZWRPbmNlLCAndXBkYXRlIHBsYWNlIG5hbWVzIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjb21wYXJlVHdvTG9jYXRpb25TdHViLmNhbGxlZE9uY2UsICdjb21wYXJlIHR3byBsb2NhdGlvbnMgY2FsbCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ21hcmt1cFRlbXBlcmF0dXJlIHNob3VsZCByZXR1cm4gYSBtYXJrZWQgdXAgc3RyaW5nJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG5cbiAgdmFyIGV4cGVjdGVkU3RyaW5nID0ge1xuICAgIGZvcm1hdHRlZDogJzQ4LjU8c3BhbiBjbGFzcz1cIm5hcnJvdy1kZWdcIj4mZGVnOzwvc3Bhbj48c3BhbiBjbGFzcz1cInNtYWxsLWZcIj5GPC9zcGFuPicsXG4gICAgcmF3OiA0OC41XG4gIH07XG5cbiAgdmFyIHJldHVybmVkU3RyaW5nID0gd2VhdGhlclRlc3QubWFya3VwVGVtcGVyYXR1cmUoZXhwZWN0ZWRTdHJpbmcucmF3KTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHJldHVybmVkU3RyaW5nLCBleHBlY3RlZFN0cmluZy5mb3JtYXR0ZWQsICdzdHJpbmcgbWFya3VwIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgnaGFuZGxlRXJyb3Igc2hvdWxkIGNhbGwgY2xlYXJFcnJvcnMgaWYgcGFzc2VkIGEgZmFsc2V5IHZhbHVlIG9yIGFuIG9iamVjdCB3aXRoIG5vIGVycm9yIHByb3AnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGNsZWFyRXJyb3JTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJFcnJvcnMnKTtcbiAgdmFyIHRlc3RPYmpOb0Vycm9yID0ge1xuICAgIHBsYWNlTmFtZTogJ2Rpc3RyaWN0IDEzJyxcbiAgICB0ZW1wU3RyaW5nOiAnc25vd3knLFxuICAgIHRlbXBWYWw6IDEzXG4gIH07XG5cbiAgd2VhdGhlclRlc3QuaGFuZGxlRXJyb3IoJycpO1xuICB3ZWF0aGVyVGVzdC5oYW5kbGVFcnJvcih0ZXN0T2JqTm9FcnJvcik7XG4gIHdlYXRoZXJUZXN0LmhhbmRsZUVycm9yKDApO1xuXG4gIGFzc2VydC5vayhjbGVhckVycm9yU3R1Yi5hcmdzLmxlbmd0aCA9PT0gMywgJ2NhbGxlZCBmb3IgdGhyZWUgZmFsc2V5IHZhbHVlcywgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdoYW5kbGVFcnJvciBzaG91bGQgY2FsbCBjbGVhclRlbXBsYXRlIGFuZCBjbGVhckNvbXBhcmlzb24gaWYgZXJyb3Igb2JqZWN0IGlzIHBhc3NlZCcsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHRlc3RPYmpFcnJvciwgbG93ZXJJbnB1dEVsO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBjbGVhclRlbXBsYXRlU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2NsZWFyVGVtcGxhdGUnKTtcbiAgdmFyIGNsZWFyQ29tcGFzcmlzb25TdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJDb21wYXJpc29uJylcblxuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpKTtcbiAgbG93ZXJJbnB1dEVsID0gJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KTtcblxuICB0ZXN0T2JqRXJyb3IgPSB7XG4gICAgcGxhY2VOYW1lOiAnJyxcbiAgICBlcnJvcjoge2Rlc2NyaXB0aW9uOiAnbm8gcGxhY2UgbmFtZSwgb29wcyd9LFxuICAgICRpbnB1dDogbG93ZXJJbnB1dEVsXG4gIH07XG5cbiAgd2VhdGhlclRlc3QuJGVycm9yQ29udGFpbmVyID0gJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5lcnJvckNvbnRhaW5lcikpO1xuICB3ZWF0aGVyVGVzdC4kZXJyb3JBcnJvdyA9ICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMuZXJyb3JBcnJvdykpO1xuXG4gIHdlYXRoZXJUZXN0LmhhbmRsZUVycm9yKHRlc3RPYmpFcnJvcik7XG5cbiAgYXNzZXJ0Lm9rKGNsZWFyVGVtcGxhdGVTdHViLmNhbGxlZFdpdGgodGVzdE9iakVycm9yKSwgJ2NsZWFyIHRlbXBsYXRlIGNhbGxlZCB3aXRoIG9iamVjdCwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjbGVhckNvbXBhc3Jpc29uU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXIgY29tcGFyaXNvbiBjYWxsZWQsIHBhc3NlZCcpO1xufSk7XG5cbi8vIFRlc3Qgb2Ygd2VhdGhlci11bmRlcmdyb3VuZC1hcGkuanNcblEudGVzdCgncmVxdWVzdCBzaG91bGQgY2FsbCB3ZWF0aGVyIHVuZGVyZ3JvdW5kIHdpdGggYWpheCcsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIGFwaVRlc3QgPSBuZXcgV1VBcGkoKTtcbiAgdmFyIGJ1aWxkVXJsU3R1YiA9IHRoaXMuc3R1YihhcGlUZXN0LCAnYnVpbGRVcmwnLCBmdW5jdGlvbiAoKSB7cmV0dXJuICdhcGlfdGVzdCc7fSk7XG4gIHZhciBhamF4U3R1YiA9IHRoaXMuc3R1YigkLCAnYWpheCcsIG1vY2tEZWZlcnJlZCk7XG4gIHZhciB0ZXN0UmVxT2JqID0ge1xuICAgIHBsYWNlOiAnbW9yZG9yJ1xuICB9XG5cbiAgYXBpVGVzdC5yZXF1ZXN0KHRlc3RSZXFPYmopO1xuXG4gIGFzc2VydC5vayhidWlsZFVybFN0dWIuY2FsbGVkV2l0aCh0ZXN0UmVxT2JqLnBsYWNlKSwgJ2J1aWxkIHVybCBjYWxsIHBhc3NlZCcpO1xuICBhc3NlcnQub2soYWpheFN0dWIuY2FsbGVkV2l0aCgnYXBpX3Rlc3QnKSwgJ2FqYXggY2FsbCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ2NvbmZvcm0gbWFuaXB1bGF0ZXMgdGhlIG9iamVjdCBwYXNzZWQsIHJldHVybmluZyBhbiBlcnJvciBpZiBwcmVzZW50IG9yIGZvcm1hdHRpbmcgdGhlIG9iamVjdCBjb3JyZWN0bHknLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciBzdWNjZXNzVGVzdCwgZXJyb3JUZXN0LCBtdWx0aXBsZVJlc3VsdHNUZXN0O1xuICB2YXIgYXBpVGVzdCA9IG5ldyBXVUFwaSgpO1xuICBcbiAgdmFyIGljb25TdHViU3RyaW5nID0gZnVuY3Rpb24gKCkge3JldHVybiAnaWNvbl91cmxfdGVzdCc7fTtcbiAgdmFyIGJ1aWxkSWNvblVybFN0dWIgPSB0aGlzLnN0dWIoYXBpVGVzdCwgJ2J1aWxkSWNvblVybCcsIGljb25TdHViU3RyaW5nKTtcbiAgdmFyIG11bHRpcGxlUmVzdWx0U3R1YiA9IHRoaXMuc3R1YihhcGlUZXN0LmVycm9yVHlwZSwgJ211bHRpcGxlUmVzdWx0cycpO1xuXG4gIHZhciBtb2NrUmVzcG9uc2UgPSBtb2NrQXBpUmVzcG9uc2U7XG4gIHZhciBtb2NrRXJyb3JSZXNwb25zZSA9IHtkZXNjcmlwdGlvbjogJ2Nhbm5vdCBzZWUgdG9vIGZvZ2d5J307XG4gIHZhciBtb2NrUmVzdWx0c1Jlc3BvbnNlID0gW3tuYW1lOiAnZmlyc3Rfb2JqZWN0J30sIHtuYW1lOiAnc2Vjb25kX29iamVjdCd9XTtcbiAgdmFyIHN1Y2Nlc3NGaXh0dXJlT2JqID0ge1xuICAgIHBsYWNlTmFtZTogJ1NBTiBGUkFOQ0lTQ08sIENBJyxcbiAgICBzcGVjaWZpY1BsYWNlOiAnU09NQSAtIE5FQVIgVkFOIE5FU1MsIFNBTiBGUkFOQ0lTQ08sIENBJyxcbiAgICB0ZW1wU3RyaW5nOiAnNjYuMycsXG4gICAgdGVtcFZhbDogNjYuMyxcbiAgICBpY29uVXJsOiBpY29uU3R1YlN0cmluZygpXG4gIH1cblxuICAvLyBGaXN0IGNhbGwgdGhlIG1ldGhvZCB3aXRoIGV4cGVjdGVkIGJlaGF2aW9yXG4gIHN1Y2Nlc3NUZXN0ID0gYXBpVGVzdC5jb25mb3JtKG1vY2tSZXNwb25zZSk7XG4gIC8vIEFuZCBkZWNsYXJlIHRoZSBhc3NlcnRpb25zIGZvciBleHBlY3RlZCBiZWhhdmlvclxuICBhc3NlcnQuZGVlcEVxdWFsKHN1Y2Nlc3NUZXN0LCBzdWNjZXNzRml4dHVyZU9iaiwgJ3N1Y2Nlc3NmdWwgY2FsbCBwYXNzZWQnKTtcblxuICAvLyBBZGQgbXVsdGlwbGUgcmVzdWx0cyB0byB0aGUgcmVzcG9uc2UgYW5kIGNhbGwgdGhlIG1ldGhvZFxuICBtb2NrUmVzcG9uc2UucmVzcG9uc2UucmVzdWx0cyA9IG1vY2tSZXN1bHRzUmVzcG9uc2U7XG4gIG11bHRpcGxlUmVzdWx0c1Rlc3QgPSBhcGlUZXN0LmNvbmZvcm0obW9ja1Jlc3BvbnNlKTtcbiAgLy8gRGVjbGFyZSB0aGUgYXNzZXJ0aW9ucyBmb3IgbXVsdGlwbGUgcmVzdWx0c1xuICBhc3NlcnQub2sobXVsdGlwbGVSZXN1bHRTdHViLmNhbGxlZFdpdGgobW9ja1Jlc3VsdHNSZXNwb25zZVswXSksICdjYWxsIHdpdGggbXVsdGlwbGUgcmVzdWx0cyBwYXNzZWQnKTtcblxuICAvLyBBZGQgdGhlIGVycm9yIG9iamVjdCBhbmQgY2FsbCB0aGUgbWV0aG9kXG4gIG1vY2tSZXNwb25zZS5yZXNwb25zZS5lcnJvciA9IG1vY2tFcnJvclJlc3BvbnNlO1xuICBlcnJvclRlc3QgPSBhcGlUZXN0LmNvbmZvcm0obW9ja1Jlc3BvbnNlKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChlcnJvclRlc3QsIHtcImVycm9yXCI6IG1vY2tFcnJvclJlc3BvbnNlfSwgJ2NhbGwgd2l0aCBlcnJvciBwcm9wIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgnYnVpbGRVcmwgc2hvdWxkIGNvbWJpbmUgdGhlIEFQSSBLZXkgYW5kIHRoZSBzZWFyY2ggdGVybSB0byBidWlsZCB0aGUgdXJsIGZvciBhamF4JywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgdGVzdFJlc3VsdDtcbiAgdmFyIGFwaVRlc3QgPSBuZXcgV1VBcGkoKTtcbiAgdmFyIHVybEZpeHR1cmUgPSAnaHR0cDovL2FwaS53dW5kZXJncm91bmQuY29tL2FwaS8xMjM0NS9jb25kaXRpb25zL3EvbW9yZG9yLmpzb24nO1xuICB2YXIgc2VhcmNoVGVybSA9ICdtb3Jkb3InO1xuXG4gIGFwaVRlc3QuQVBJa2V5ID0gJzEyMzQ1JztcblxuICB0ZXN0UmVzdWx0ID0gYXBpVGVzdC5idWlsZFVybChzZWFyY2hUZXJtKTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHRlc3RSZXN1bHQsIHVybEZpeHR1cmUsICdidWlsZCB1cmwgc3RyaW5nIGNvcnJlY3RseSwgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdidWlsZEljb25VcmwgY2hlY2tzIGRlZmF1bHQgaWNvbiB1cmwgZm9yIG5pZ2h0IHRpbWUgZGVzaWduYXRpb24sIHRoZW4gYnVpbGRzIGNvcnJlY3RseScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIGRheVRlc3RSZXN1bHQsIG5pZ2h0VGVzdFJlc3VsdDtcbiAgdmFyIGFwaVRlc3QgPSBuZXcgV1VBcGkoKTtcbiAgdmFyIGljb25UeXBlID0gJ2NsZWFyJztcbiAgdmFyIGRheVRlc3RTdHJpbmcgPSAnY2xvdWR5LmdpZic7XG4gIHZhciBuaWdodFRlc3RTdHJpbmcgPSAnbnRfY2xvdWR5LmdpZic7XG4gIHZhciBpY29uVXJsRGF5Rml4dHVyZSA9ICdodHRwOi8vaWNvbnMud3h1Zy5jb20vaS9jL2JpbGJvL2NsZWFyLmdpZic7XG4gIHZhciBpY29uVXJsTmlnaHRGaXh0dXJlID0gJ2h0dHA6Ly9pY29ucy53eHVnLmNvbS9pL2MvYmlsYm8vbnRfY2xlYXIuZ2lmJztcblxuICBhcGlUZXN0Lmljb25TZXQgPSAnYmlsYm8vJztcblxuICBkYXlUZXN0UmVzdWx0ID0gYXBpVGVzdC5idWlsZEljb25VcmwoaWNvblR5cGUsIGRheVRlc3RTdHJpbmcpO1xuICBuaWdodFRlc3RSZXN1bHQgPSBhcGlUZXN0LmJ1aWxkSWNvblVybChpY29uVHlwZSwgbmlnaHRUZXN0U3RyaW5nKTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKGRheVRlc3RSZXN1bHQsIGljb25VcmxEYXlGaXh0dXJlLCAnYnVpbGQgaWNvbiB1cmwgZm9yIGRheSBwYXNzZWQnKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChuaWdodFRlc3RSZXN1bHQsIGljb25VcmxOaWdodEZpeHR1cmUsICdidWlsZCBpY29uIHVybCBmb3IgbmlnaHQgcGFzc2VkJyk7XG59KTsiXX0=
