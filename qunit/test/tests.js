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
module.exports = function () {
  return {

    konamiOrder: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65],
    konamiOverheard: [],
    hasSucceeded: false,

    listen: function (callback) {
      this.codeSuccessful = typeof callback == 'function' ? (callback) : function () {return true;};
      $(document).on('keyup', $.proxy(this.konamiProgress, this));
    },

    konamiProgress: function (evt) {
      if (this.hasSucceeded) return;
      var enteredLength;

      if (evt.keyCode) {
        this.konamiOverheard.push(evt.keyCode);
        enteredLength = this.konamiOverheard.length;

        if (this.arraysEqual(this.konamiOverheard, this.konamiOrder)) {
          this.hasSucceeded = true;
          this.codeSuccessful();
        }

        if ( !this.arraysEqual(this.konamiOverheard, this.konamiOrder.slice(0, enteredLength)) ) {
          this.konamiOverheard = [];
        }
      }
    },

    arraysEqual: function (arr1, arr2) {
      if (arr1.length != arr2.length) {
        return false;
      } else {
        var areEqual = true;
        for (var i=0; i<arr1.length; i++) {
          if (arr1[i] !== arr2[i]) {
            areEqual = false;
            break;
          }
        }

        return areEqual;
      }
    }
  };
};
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
module.exports = function App () {

  var WUAPI = require('./weather-underground-api.js');
  var roundto = require('round-to');
  var konami = require('./weather-or-konami');

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
      konami().listen(this.viewTestPage);
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
    },

    viewTestPage: function () {
      $('.container').find('.header-wrapper h1').append('<a href="./test/test.html">test page</a>');
    }
  };
}
},{"./weather-or-konami":5,"./weather-underground-api.js":6,"round-to":4}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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

  // $(markupFixtures.lowerInput).click();
  // $(markupFixtures.allInputs).trigger('change');
  // $(markupFixtures.clearButton).click();

  assert.ok(proxySpy.calledWith(weatherTest.handleInputChange), 'input change passed');
  assert.ok(proxySpy.calledWith(weatherTest.manageInputEntry), 'input entry passed');
  assert.ok(proxySpy.calledWith(weatherTest.clearData), 'clear button click passed');
  assert.ok(proxySpy.args.length === 4, 'four calls to proxy passed');
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
},{"../scripts/weather-underground-api.js":6,"../scripts/weatherOr.js":7,"./mock-response.js":8}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaXMtZmluaXRlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL251bWJlci1pcy1pbnRlZ2VyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL251bWJlci1pcy1uYW4vaW5kZXguanMiLCJub2RlX21vZHVsZXMvcm91bmQtdG8vaW5kZXguanMiLCJzY3JpcHRzL3dlYXRoZXItb3Ita29uYW1pLmpzIiwic2NyaXB0cy93ZWF0aGVyLXVuZGVyZ3JvdW5kLWFwaS5qcyIsInNjcmlwdHMvd2VhdGhlck9yLmpzIiwidGVzdC9tb2NrLXJlc3BvbnNlLmpzIiwidGVzdC90ZXN0cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcbnZhciBudW1iZXJJc05hbiA9IHJlcXVpcmUoJ251bWJlci1pcy1uYW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXIuaXNGaW5pdGUgfHwgZnVuY3Rpb24gKHZhbCkge1xuXHRyZXR1cm4gISh0eXBlb2YgdmFsICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hbih2YWwpIHx8IHZhbCA9PT0gSW5maW5pdHkgfHwgdmFsID09PSAtSW5maW5pdHkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBudW1iZXJJc0Zpbml0ZSA9IHJlcXVpcmUoJ2lzLWZpbml0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlci5pc0ludGVnZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0cmV0dXJuIG51bWJlcklzRmluaXRlKHgpICYmIE1hdGguZmxvb3IoeCkgPT09IHg7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gKHgpIHtcblx0cmV0dXJuIHggIT09IHg7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG51bWJlcklzSW50ZWdlciA9IHJlcXVpcmUoJ251bWJlci1pcy1pbnRlZ2VyJyk7XG5cbmZ1bmN0aW9uIHJvdW5kKGZuLCB4LCBwcmVjaXNpb24pIHtcblx0aWYgKHR5cGVvZiB4ICE9PSAnbnVtYmVyJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIHZhbHVlIHRvIGJlIGEgbnVtYmVyJyk7XG5cdH1cblxuXHRpZiAoIW51bWJlcklzSW50ZWdlcihwcmVjaXNpb24pKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgcHJlY2lzaW9uIHRvIGJlIGFuIGludGVnZXInKTtcblx0fVxuXG5cdHZhciBleHBvbmVudCA9IHByZWNpc2lvbiA+IDAgPyAnZScgOiAnZS0nO1xuXHR2YXIgZXhwb25lbnROZWcgPSBwcmVjaXNpb24gPiAwID8gJ2UtJyA6ICdlJztcblx0cHJlY2lzaW9uID0gTWF0aC5hYnMocHJlY2lzaW9uKTtcblxuXHRyZXR1cm4gTnVtYmVyKE1hdGhbZm5dKHggKyBleHBvbmVudCArIHByZWNpc2lvbikgKyBleHBvbmVudE5lZyArIHByZWNpc2lvbik7XG59XG5cbnZhciBmbiA9IG1vZHVsZS5leHBvcnRzID0gcm91bmQuYmluZChudWxsLCAncm91bmQnKTtcbmZuLnVwID0gcm91bmQuYmluZChudWxsLCAnY2VpbCcpO1xuZm4uZG93biA9IHJvdW5kLmJpbmQobnVsbCwgJ2Zsb29yJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcblxuICAgIGtvbmFtaU9yZGVyOiBbMzgsIDM4LCA0MCwgNDAsIDM3LCAzOSwgMzcsIDM5LCA2NiwgNjVdLFxuICAgIGtvbmFtaU92ZXJoZWFyZDogW10sXG4gICAgaGFzU3VjY2VlZGVkOiBmYWxzZSxcblxuICAgIGxpc3RlbjogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNvZGVTdWNjZXNzZnVsID0gdHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicgPyAoY2FsbGJhY2spIDogZnVuY3Rpb24gKCkge3JldHVybiB0cnVlO307XG4gICAgICAkKGRvY3VtZW50KS5vbigna2V5dXAnLCAkLnByb3h5KHRoaXMua29uYW1pUHJvZ3Jlc3MsIHRoaXMpKTtcbiAgICB9LFxuXG4gICAga29uYW1pUHJvZ3Jlc3M6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgIGlmICh0aGlzLmhhc1N1Y2NlZWRlZCkgcmV0dXJuO1xuICAgICAgdmFyIGVudGVyZWRMZW5ndGg7XG5cbiAgICAgIGlmIChldnQua2V5Q29kZSkge1xuICAgICAgICB0aGlzLmtvbmFtaU92ZXJoZWFyZC5wdXNoKGV2dC5rZXlDb2RlKTtcbiAgICAgICAgZW50ZXJlZExlbmd0aCA9IHRoaXMua29uYW1pT3ZlcmhlYXJkLmxlbmd0aDtcblxuICAgICAgICBpZiAodGhpcy5hcnJheXNFcXVhbCh0aGlzLmtvbmFtaU92ZXJoZWFyZCwgdGhpcy5rb25hbWlPcmRlcikpIHtcbiAgICAgICAgICB0aGlzLmhhc1N1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5jb2RlU3VjY2Vzc2Z1bCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCAhdGhpcy5hcnJheXNFcXVhbCh0aGlzLmtvbmFtaU92ZXJoZWFyZCwgdGhpcy5rb25hbWlPcmRlci5zbGljZSgwLCBlbnRlcmVkTGVuZ3RoKSkgKSB7XG4gICAgICAgICAgdGhpcy5rb25hbWlPdmVyaGVhcmQgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheXNFcXVhbDogZnVuY3Rpb24gKGFycjEsIGFycjIpIHtcbiAgICAgIGlmIChhcnIxLmxlbmd0aCAhPSBhcnIyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJlRXF1YWwgPSB0cnVlO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8YXJyMS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChhcnIxW2ldICE9PSBhcnIyW2ldKSB7XG4gICAgICAgICAgICBhcmVFcXVhbCA9IGZhbHNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFyZUVxdWFsO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3YXBpICgpIHtcblxuICAvKipcbiAgICogQVBJIEtleSBcbiAgICogQHR5cGUge1N0cmluZ31cbiAgICovXG4gIHRoaXMuQVBJa2V5ID0gJzhjNGM2YzhiZWJkMzQxYTUnO1xuXG4gIC8qKlxuICAgKiBTdHJpbmcgaW5kaWNhdGluZyB3aGljaCBpY29uIHNldCBmcm9tIFdlYXRoZXIgVW5kZXJncm91bmQgdG8gdXNlLlxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdGhpcy5pY29uU2V0ID0gJ2kvJztcblxuICAvKipcbiAgICogRXh0ZW5zaWJsZSBNYXAgb2YgY3VzdG9tIGVycm9ycy4gUHJvcGVydGllcyBzaG91bGQgYmUgT2JqZWN0cyBvciByZXR1cm4gYW4gT2JqZWN0IGNvbnRhaW5pbmdcbiAgICogYXQgbGVhc3QgYSAnZGVzY3JpcHRpb24nIHByb3BlcnR5LlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5lcnJvclR5cGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBQcm92aWRlIGFuIGVycm9yIGZvciB3aGVuIHRoZSBzZXJ2aWNlIHJldHVybnMgbXVsdGlwbGUgcmVzdWx0cyBmb3IgdGhlIHNlYXJjaCB0ZXJtLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gIGV4YW1wbGVPYmogIE9uZSBvZiB0aGUgbXVsdGlwbGUgcmVzdWx0cyByZXR1cm5lZCBmcm9tIHRoZSBzZXJ2aWUuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICAgQW4gZXJyb3Igb2JqZWN0IHdpdGggYSBjdXN0b21pemVkIGRlc2NyaXB0aW9uIGZpZWxkLlxuICAgICAqL1xuICAgIG11bHRpcGxlUmVzdWx0czogZnVuY3Rpb24gKGV4YW1wbGVPYmopIHtcbiAgICAgIHZhciBkZXNjcmlwdGlvblN0cmluZyA9ICcnO1xuICAgICAgdmFyIHNlYXJjaFRlcm0gPSBleGFtcGxlT2JqLm5hbWUgfHwgZXhhbXBsZU9iai5jaXR5IHx8ICcnO1xuICAgICAgdmFyIHNlYXJjaExvY2FsZSA9IGV4YW1wbGVPYmouc3RhdGUgfHwgZXhhbXBsZU9iai5jb3VudHJ5IHx8ICcnO1xuICAgICAgdmFyIGZpbGxlclRleHQgPSBbXTtcbiAgICAgIHZhciB2ZXJib3NlU2VhcmNoO1xuXG4gICAgICBpZiAoIXNlYXJjaFRlcm0gfHwgIXNlYXJjaExvY2FsZSkge1xuICAgICAgICBmaWxsZXJUZXh0ID0gWydQb3J0bGFuZCwgT1InLCAnUG9ydGxhbmQnXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZlcmJvc2VTZWFyY2ggPSBzZWFyY2hUZXJtICsgJywgJyArIHNlYXJjaExvY2FsZTtcbiAgICAgICAgZmlsbGVyVGV4dCA9IFt2ZXJib3NlU2VhcmNoLCBzZWFyY2hUZXJtXTtcbiAgICAgIH1cblxuICAgICAgZGVzY3JpcHRpb25TdHJpbmcgPSAnVHJ5IGEgbW9yZSBkZXNjcmlwdGl2ZSBzZWFyY2ggdGVybSwgZS5nLiBcIicgKyB2ZXJib3NlU2VhcmNoICsgXG4gICAgICAgICdcIiBpbnN0ZWFkIG9mIFwiJyArIHNlYXJjaFRlcm0gKyAnXCIuJztcblxuICAgICAgcmV0dXJuIHtkZXNjcmlwdGlvbjogZGVzY3JpcHRpb25TdHJpbmd9O1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVxdWVzdCBkYXRhIGZyb20gdGhlIHNlcnZpY2UuXG4gICAqIEBwYXJhbSAge09iamVjdH0gIHJlcU9iaiAgUmVxdWVzdCBvYmplY3QgcmVjZWl2ZWQgZnJvbSB0aGUgQXBwLCBleHBlY3RzIFwicGxhY2VcIiBwcm9wZXJ0eSBhcyB0aGUgc2VhcmNoIHRlcm0uXG4gICAqIEByZXR1cm4ge0RlZmVycmVkfSAgICAgICAgalF1ZXJ5IERlZmVycmVkKCkgb2JqZWN0XG4gICAqL1xuICB0aGlzLnJlcXVlc3QgPSBmdW5jdGlvbiAocmVxT2JqKSB7XG4gICAgdmFyIERlZiA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgdXJsU3RyaW5nID0gdGhpcy5idWlsZFVybChyZXFPYmoucGxhY2UpO1xuICAgICQuYWpheCh1cmxTdHJpbmcpXG4gICAgICAuZG9uZShmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgRGVmLnJlc29sdmUodGhpcy5jb25mb3JtKHJlc3BvbnNlKSk7XG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgICAuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIERlZi5yZWplY3Qoe2Vycm9yOiB7ZGVzY3JpcHRpb246ICdTb3JyeSwgd2UgY2FuXFwndCBzZWVtIHRvIGRvd25sb2FkIGFueSB3ZWF0aGVyIGluZm9ybWF0aW9uIDxicj5iZWNhdXNlIHRoZSBpbnRlcm5ldCB3b25cXCd0IGFuc3dlciBpdHMgcGhvbmUuJ319KTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIERlZjtcbiAgfTtcblxuICAvKipcbiAgICogVHJhbnNsYXRlIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2aWNlIHRvIHRoZSBvYmplY3QgZXhwZWN0ZWQgYnkgdGhlIEFwcC5cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgcmVzcG9uc2VPYmogIERhdGEgb2JqZWN0IHJlY2VpdmVkIGZyb20gdGhlIHNlcnZpY2UuXG4gICAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgICBPYmplY3QgcGFyc2VkIHRvIHRoZSBmb3JtYXQgdGhlIGFwcCBleHBlY3RzLlxuICAgKi9cbiAgdGhpcy5jb25mb3JtID0gZnVuY3Rpb24gKHJlc3BvbnNlT2JqKSB7XG4gICAgdmFyIHJldCA9IHt9O1xuXG4gICAgaWYgKHJlc3BvbnNlT2JqLnJlc3BvbnNlLmVycm9yKSB7XG4gICAgICByZXQuZXJyb3IgPSByZXNwb25zZU9iai5yZXNwb25zZS5lcnJvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3BvbnNlT2JqLnJlc3BvbnNlLnJlc3VsdHMgJiYgcmVzcG9uc2VPYmoucmVzcG9uc2UucmVzdWx0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJldC5lcnJvciA9IHRoaXMuZXJyb3JUeXBlLm11bHRpcGxlUmVzdWx0cyhyZXNwb25zZU9iai5yZXNwb25zZS5yZXN1bHRzWzBdKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXNwb25zZU9iai5jdXJyZW50X29ic2VydmF0aW9uKSB7XG4gICAgICAgIHZhciBvYnN2ID0gcmVzcG9uc2VPYmouY3VycmVudF9vYnNlcnZhdGlvbjtcblxuICAgICAgICByZXQucGxhY2VOYW1lID0gb2Jzdi5kaXNwbGF5X2xvY2F0aW9uLmZ1bGwudG9VcHBlckNhc2UoKTtcbiAgICAgICAgcmV0LnNwZWNpZmljUGxhY2UgPSBvYnN2Lm9ic2VydmF0aW9uX2xvY2F0aW9uLmZ1bGwuc3BsaXQoJywnKVswXS50b1VwcGVyQ2FzZSgpLnRyaW0oKSArICcsICcgKyByZXQucGxhY2VOYW1lO1xuICAgICAgICByZXQudGVtcFN0cmluZyA9IG9ic3YudGVtcF9mLnRvU3RyaW5nKCk7XG4gICAgICAgIHJldC50ZW1wVmFsID0gb2Jzdi50ZW1wX2Y7XG4gICAgICAgIHJldC5pY29uVXJsID0gdGhpcy5idWlsZEljb25Vcmwob2Jzdi5pY29uLCBvYnN2Lmljb25fdXJsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgdGhlIHVybCBzdHJpbmcgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAqIEBwYXJhbSAge1N0cmluZ30gIHNlYXJjaFN0cmluZyAgVGhlIHNlYXJjaCB0ZXJtIHBhc3NlZCBmcm9tIHRoZSBBcHAuXG4gICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgICAgVGhlIGNvbXBsZXRlIHVybCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICovXG4gIHRoaXMuYnVpbGRVcmwgPSBmdW5jdGlvbiAoc2VhcmNoU3RyaW5nKSB7XG4gICAgdmFyIGZpcnN0UGFydCA9ICdodHRwOi8vYXBpLnd1bmRlcmdyb3VuZC5jb20vYXBpLycgKyB0aGlzLkFQSWtleSArICcvY29uZGl0aW9ucy9xLyc7XG4gICAgdmFyIGxhc3RQYXJ0ID0gJy5qc29uJztcblxuICAgIHJldHVybiBmaXJzdFBhcnQgKyBzZWFyY2hTdHJpbmcgKyBsYXN0UGFydDtcbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyB0aGUgdXJsIGZvciB0aGUgd2VhdGhlciBpY29uIGJhc2VkIG9uIHRoZSBzZXJ2aWNlIHJlc3BvbnNlLlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICBpY29uVHlwZSAgU3RyaW5nIGRlc2NyaWJpbmcgdGhlIHR5cGUgb2YgaWNvbiB0byB1c2UuXG4gICAqIEBwYXJhbSAge1N0cmluZ30gIGljb25VcmwgICBUaGUgZGVmYXVsdCBpY29uIHVybCByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2aWNlLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgICAgVGhlIGNvbnN0cnVjdGVkIHVybCBmb3IgdGhlIFdlYXRoZXIgVW5kZXJncm91bmQgaWNvbiwgdXNpbmcgdGhlIHNwZWNpZmllZCBpY29uIHNldC5cbiAgICovXG4gIHRoaXMuYnVpbGRJY29uVXJsID0gZnVuY3Rpb24gKGljb25UeXBlLCBpY29uVXJsKSB7XG4gICAgaWNvblR5cGUgPSBpY29uVXJsLmluZGV4T2YoJ250JykgPT09IC0xID8gaWNvblR5cGUgOiAnbnRfJyArIGljb25UeXBlO1xuXG4gICAgcmV0dXJuICdodHRwOi8vaWNvbnMud3h1Zy5jb20vaS9jLycgKyB0aGlzLmljb25TZXQgKyBpY29uVHlwZSArICcuZ2lmJztcbiAgfTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBBcHAgKCkge1xuXG4gIHZhciBXVUFQSSA9IHJlcXVpcmUoJy4vd2VhdGhlci11bmRlcmdyb3VuZC1hcGkuanMnKTtcbiAgdmFyIHJvdW5kdG8gPSByZXF1aXJlKCdyb3VuZC10bycpO1xuICB2YXIga29uYW1pID0gcmVxdWlyZSgnLi93ZWF0aGVyLW9yLWtvbmFtaScpO1xuXG4gIHJldHVybiB7XG4gICAgLyogVGhlc2UgYXJlIHR3byBjb250YWluZXJzIHRvIHN0b3JlIG91ciByZXN1bHRzIGluICovXG4gICAgdXBwZXJEYXRhOiB7fSxcbiAgICBsb3dlckRhdGE6IHt9LFxuXG4gICAgLyogVGhpcyBpcyBhIENsYXNzIFByb3BlcnR5IHRoYXQgdGVsbHMgdGhlIEFwcCBpZiBpdCBuZWVkcyB0byBhZGQgc3BlY2lmaWNpdHkgdG8gUGxhY2VOYW1lICovXG4gICAgc3BlY2lmaWNQbGFjZU5hbWVOZWVkZWQ6IGZhbHNlLFxuXG4gICAgLyogSW5pdGlhbGl6ZSB0aGlzISAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuaW5pdFNlbGVjdG9ycygpO1xuICAgICAgdGhpcy5pbml0TGlzdGVuZXJzKCk7XG4gICAgICB0aGlzLndlYXRoZXJBUEkgPSBuZXcgV1VBUEkoKTtcbiAgICB9LFxuXG4gICAgLyogSWRlbnRpZnkgc2VsZWN0b3JzIGluIG1hcmt1cCAqL1xuICAgIGluaXRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMudXBwZXJEYXRhLiRpbnB1dCA9ICQoJy5pbnB1dC1jb250YWluZXInKS5maW5kKCdpbnB1dC5qcy11cHBlcicpO1xuICAgICAgdGhpcy5sb3dlckRhdGEuJGlucHV0ID0gJCgnLmlucHV0LWNvbnRhaW5lcicpLmZpbmQoJ2lucHV0LmpzLWxvd2VyJyk7XG4gICAgICB0aGlzLmFsbElucHV0cyA9IHRoaXMudXBwZXJEYXRhLiRpbnB1dC5hZGQodGhpcy5sb3dlckRhdGEuJGlucHV0KTtcblxuICAgICAgdGhpcy51cHBlckRhdGEuJG91dHB1dCA9ICQoJy5vdXRwdXQtY29udGFpbmVyJykuZmluZCgnZGl2LmpzLXVwcGVyJyk7XG4gICAgICB0aGlzLmxvd2VyRGF0YS4kb3V0cHV0ID0gJCgnLm91dHB1dC1jb250YWluZXInKS5maW5kKCdkaXYuanMtbG93ZXInKTtcblxuICAgICAgdGhpcy4kZGlmZmVyZW5jZUNvbnQgPSAkKCcuY29udGFpbmVyJykuZmluZCgnLmRpZmZlcmVuY2UtY29udGFpbmVyJyk7XG4gICAgICB0aGlzLiRkaWZmZXJlbmNlID0gJCgnLmNvbnRhaW5lcicpLmZpbmQoJy5kaWZmZXJlbmNlLW1zZycpO1xuICAgICAgdGhpcy4kY2xlYXJCdXR0b24gPSAkKCcuY29udGFpbmVyJykuZmluZCgnLmNsZWFyLWJ1dHRvbicpO1xuXG4gICAgICB0aGlzLiRlcnJvckNvbnRhaW5lciA9ICQoJy5jb250YWluZXInKS5maW5kKCcuZXJyb3ItY29udGFpbmVyJyk7XG4gICAgICB0aGlzLiRlcnJvckFycm93ID0gJCgnLmNvbnRhaW5lcicpLmZpbmQoJy5lcnJvci1pbmRpY2F0b3InKTtcbiAgICB9LFxuXG4gICAgLyogSW5pdGlhbGl6ZSB0aGUgbGlzdGVuZXJzIG9uIHRoZSBzZWxlY3RvcnMgKi9cbiAgICBpbml0TGlzdGVuZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmFsbElucHV0cy5vbignY2hhbmdlJywgJC5wcm94eSh0aGlzLmhhbmRsZUlucHV0Q2hhbmdlLCB0aGlzKSk7XG4gICAgICB0aGlzLmFsbElucHV0cy5vbigna2V5dXAnLCAkLnByb3h5KHRoaXMubWFuYWdlSW5wdXRFbnRyeSwgdGhpcykpO1xuICAgICAgdGhpcy4kY2xlYXJCdXR0b24ub24oJ2NsaWNrIHRvdWNoJywgJC5wcm94eSh0aGlzLmNsZWFyRGF0YSwgdGhpcykpO1xuICAgICAga29uYW1pKCkubGlzdGVuKHRoaXMudmlld1Rlc3RQYWdlKTtcbiAgICB9LCAgXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5mb3JtYXRpb24gYmVpbmcgZW50ZXJlZCBpbnRvIHRoZSBpbnB1dHNcbiAgICAgKiBAcGFyYW0gIHtFdmVudH0gIGV2dCAgalF1ZXJ5IGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlSW5wdXRDaGFuZ2U6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgIHZhciAkdGFyZ2V0ID0gJChldnQudGFyZ2V0KTtcbiAgICAgIHZhciBsb2NhdGlvbiA9ICR0YXJnZXQudmFsKCk7XG4gICAgICB2YXIgdXBkYXRlT2JqZWN0ID0gJHRhcmdldC5oYXNDbGFzcygnanMtdXBwZXInKSA/IHRoaXMudXBwZXJEYXRhIDogdGhpcy5sb3dlckRhdGE7XG5cbiAgICAgIHVwZGF0ZU9iamVjdC5wbGFjZSA9IGxvY2F0aW9uO1xuICAgICAgdXBkYXRlT2JqZWN0LmVycm9yID0gbnVsbDtcblxuICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgIHRoaXMucmV0cmlldmVDb25kaXRpb25zRGF0YSh1cGRhdGVPYmplY3QpXG4gICAgICAgICAgLmRvbmUoJC5wcm94eSh0aGlzLnBvcHVsYXRlVGVtcGxhdGUsIHRoaXMpKVxuICAgICAgICAgIC5mYWlsKCQucHJveHkodGhpcy5oYW5kbGVFcnJvciwgdGhpcykpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExpc3RlbmVyIG9uIGJvdGggaW5wdXRzIGZvciByZXNwb25kaW5nIHRvIHVzZXIgaW50ZXJhY3Rpb24uICBDbGVhcnMgZXJyb3IsIGFkanVzdHMgZm9udCBzaXplLlxuICAgICAqIEBwYXJhbSAge2pRdWVyeX0gIGV2dCAgalF1ZXJ5IGV2ZW50LlxuICAgICAqIEByZXR1cm4ge2pRdWVyeX0gICAgICAgdGFyZ2V0IG9mIHRoZSBqUXVlcnkgZXZlbnQgXG4gICAgICovXG4gICAgbWFuYWdlSW5wdXRFbnRyeTogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgdmFyICR0aGlzSW5wdXQgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgdmFyIGVudHJ5ID0gJHRoaXNJbnB1dC52YWwoKTtcblxuICAgICAgaWYgKGVudHJ5ID09PSAnJykgdGhpcy5oYW5kbGVFcnJvcihlbnRyeSk7XG5cbiAgICAgIGlmIChlbnRyeS5sZW5ndGggPiA5KSB7XG4gICAgICAgICR0aGlzSW5wdXQuYWRkQ2xhc3MoJ3NtYWxsZXItaW5wdXQtdGV4dCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHRoaXNJbnB1dC5yZW1vdmVDbGFzcygnc21hbGxlci1pbnB1dC10ZXh0Jyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAkdGhpc0lucHV0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgYWxsIGRhdGEgZnJvbSB0aGUgdmlldy5cbiAgICAgKiBAcGFyYW0gIHtqUXVlcnl9ICBldnQgIFRoZSBqUXVlcnkgZXZlbnQgaWYgbmVlZGVkXG4gICAgICovXG4gICAgY2xlYXJEYXRhOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICB2YXIgYmxhbmtPYmogPSB7XG4gICAgICAgIHBsYWNlTmFtZTogJycsXG4gICAgICAgIHRlbXBTdHJpbmc6ICcnLFxuICAgICAgICB0ZW1wVmFsOiAwLFxuICAgICAgICBpY29uVXJsOiAnJyxcbiAgICAgICAgZXJyb3I6IHt9XG4gICAgICB9O1xuXG4gICAgICAkLmV4dGVuZCh0aGlzLnVwcGVyRGF0YSwgYmxhbmtPYmopO1xuICAgICAgJC5leHRlbmQodGhpcy5sb3dlckRhdGEsIGJsYW5rT2JqKTtcblxuICAgICAgdGhpcy5hbGxJbnB1dHMudmFsKCcnKTtcblxuICAgICAgdGhpcy5jbGVhclRlbXBsYXRlKHRoaXMudXBwZXJEYXRhLCB0aGlzLmxvd2VyRGF0YSk7XG4gICAgICB0aGlzLmNsZWFyQ29tcGFyaXNvbigpO1xuICAgICAgdGhpcy5jbGVhckVycm9ycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQYXNzIHRoZSBvYmplY3QgdG8gYmUgdXBkYXRlZCB0byB0aGUgV2VhdGhlciBBUEkgdG8gZ2V0IG5ldyBkYXRhLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gIHVwZGF0ZU9iamVjdCAgVGhlIGNvbnRhaW5lciB0byBiZSB1cGRhdGVkIHdpdGggbmV3IGRhdGFcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgICAgICAgIFJldHVybnMgUHJvbWlzZVxuICAgICAqL1xuICAgIHJldHJpZXZlQ29uZGl0aW9uc0RhdGE6IGZ1bmN0aW9uICh1cGRhdGVPYmplY3QpIHtcbiAgICAgIHZhciBEZWYgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgIHRoaXMud2VhdGhlckFQSS5yZXF1ZXN0KHVwZGF0ZU9iamVjdClcbiAgICAgICAgLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlT2JqKSB7XG4gICAgICAgICAgRGVmLnJlc29sdmUoJC5leHRlbmQodXBkYXRlT2JqZWN0LCByZXNwb25zZU9iaikpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICBEZWYucmVqZWN0KCQuZXh0ZW5kKHVwZGF0ZU9iamVjdCwgZXJyb3IpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBEZWY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHRoZSB0ZW1wbGF0ZSB3aXRoIHRoZSBkYXRhIHJlY2VpdmVkIGZyb20gdGhlIEFQSVxuICAgICAqIEBwYXJhbSAge09iamVjdH0gIGRhdGEgIEZvcm1hdHRlZCBvYmplY3QgcmVjZWl2ZWQgZnJvbSB3ZWF0aGVyIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlVGVtcGxhdGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKGRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jbGVhckVycm9ycygpO1xuICAgICAgICB2YXIgJG91dHB1dENvbnQgPSBkYXRhLiRvdXRwdXQ7XG5cbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoaXMgbmV3IHBsYWNlTmFtZSBpcyB0aGUgc2FtZSBhcyB0aGUgZXhpc3RpbmcgcGxhY2VOYW1lXG4gICAgICAgIHRoaXMuc3BlY2lmaWNQbGFjZU5hbWVOZWVkZWQgPSB0aGlzLnVwcGVyRGF0YS5wbGFjZU5hbWUgPT09IHRoaXMubG93ZXJEYXRhLnBsYWNlTmFtZSAmJlxuICAgICAgICAgIHRoaXMudXBwZXJEYXRhLnNwZWNpZmljUGxhY2UgIT09IHRoaXMubG93ZXJEYXRhLnNwZWNpZmljUGxhY2U7XG5cbiAgICAgICAgJG91dHB1dENvbnQuZmluZCgnLmNpdHktbmFtZScpLmh0bWwoZGF0YS5wbGFjZU5hbWUpO1xuICAgICAgICAkb3V0cHV0Q29udC5maW5kKCcubG9jYWwtdGVtcCcpLmh0bWwodGhpcy5tYXJrdXBUZW1wZXJhdHVyZShkYXRhLnRlbXBTdHJpbmcpKTtcbiAgICAgICAgJG91dHB1dENvbnQuZmluZCgnLmltZy1jb250YWluZXInKVxuICAgICAgICAgIC5lbXB0eSgpXG4gICAgICAgICAgLmFwcGVuZCgkKCc8aW1nPicsIHtcbiAgICAgICAgICAgIHNyYzogZGF0YS5pY29uVXJsXG4gICAgICAgICAgfSkpO1xuXG4gICAgICAgIHRoaXMudXBkYXRlUGxhY2VOYW1lcyh0aGlzLnVwcGVyRGF0YSwgdGhpcy5sb3dlckRhdGEpO1xuXG4gICAgICAgIGlmICh0aGlzLnVwcGVyRGF0YS50ZW1wVmFsICYmIHRoaXMubG93ZXJEYXRhLnRlbXBWYWwpIHtcbiAgICAgICAgICB0aGlzLmNvbXBhcmVUd29Mb2NhdGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgYSBzaW5nbGUgdGVtcGxhdGUgb2YgZGF0YS5cbiAgICAgKiBAcGFyYW0gIHtBcmd1bWVudHN9ICBhcmdzICBFeHBlY3RzIG9uZSBvciBtb3JlIGRhdGEgb2JqZWN0cyBhcyBBcmd1bWVudHNcbiAgICAgKi9cbiAgICBjbGVhclRlbXBsYXRlOiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgdmFyICRvdXRwdXRDb250O1xuXG4gICAgICBmb3IgKHZhciBpPTA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJG91dHB1dENvbnQgPSBhcmd1bWVudHNbaV0uJG91dHB1dDtcblxuICAgICAgICAkb3V0cHV0Q29udC5maW5kKCcuY2l0eS1uYW1lJykuaHRtbCgnJyk7XG4gICAgICAgICRvdXRwdXRDb250LmZpbmQoJy5sb2NhbC10ZW1wJykuaHRtbCgnJyk7XG4gICAgICAgICRvdXRwdXRDb250LmZpbmQoJy5pbWctY29udGFpbmVyJykuZW1wdHkoKTtcbiAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTcGVjaWZpY2FsbHkgdGFyZ2V0cyB0aGUgZGlzcGxheWVkIGxvY2F0aW9uIG5hbWUsIGFkZHMgbW9yZSBzcGVjaWZpY2l0eSBpZiB0aGUgdHdvIGRpc3BsYXllZFxuICAgICAqIHBsYWNlcyBhcmUgaWRlbnRpY2FsLlxuICAgICAqIEBwYXJhbSAge0FyZ3VtZW50c30gIGFyZ3MgIEV4cGVjdHMgb25lIG9yIG1vcmUgZGF0YSBvYmplY3RzIGFzIEFyZ3VtZW50cy5cbiAgICAgKi9cbiAgICB1cGRhdGVQbGFjZU5hbWVzOiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgdmFyIGFkZFNwZWNpZmljaXR5ID0gdGhpcy5zcGVjaWZpY1BsYWNlTmFtZU5lZWRlZDtcbiAgICAgIHZhciBvdXRwdXRPYmo7XG4gICAgICB2YXIgcHJvcFRvQWRkID0gYWRkU3BlY2lmaWNpdHkgPyAnc3BlY2lmaWNQbGFjZScgOiAncGxhY2VOYW1lJztcblxuICAgICAgZm9yICh2YXIgaT0wOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dHB1dE9iaiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgb3V0cHV0T2JqLiRvdXRwdXQuZmluZCgnLmNpdHktbmFtZScpLmh0bWwob3V0cHV0T2JqW3Byb3BUb0FkZF0pO1xuICAgICAgICBvdXRwdXRPYmouaXNTcGVjaWZpYyA9IGFkZFNwZWNpZmljaXR5O1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIG1hcmsgdXAgZm9yIHRoZSB0ZW1wZXJhdHVyZSBzdHJpbmc7IHdyYXBzIHBvcnRpb25zIG9mIHRoZSBtYXJrdXAgaW4gSFRNTCBlbGVtZW50c1xuICAgICAqIGZvciBzdHlsaW5nLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gIHRlbXBlcmF0dXJlU3RyaW5nICBBIHN0cmluZyBkZXNjcmlwaW5nIHRoZSB0ZW1wZXJhdHVyZSBpbiBkZWdyZWVzIEYsIGUuZy4gJzQ4LjUnLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICBBIHN0cmluZyBmb3JtYXR0ZWQgd2l0aCBIVE1MIHdyYXBwaW5nLlxuICAgICAqL1xuICAgIG1hcmt1cFRlbXBlcmF0dXJlOiBmdW5jdGlvbiAodGVtcGVyYXR1cmVTdHJpbmcpIHtcbiAgICAgIHZhciBtYXJrdXBGb3JtYXQgPSAnPHNwYW4gY2xhc3M9XCJuYXJyb3ctZGVnXCI+JmRlZzs8L3NwYW4+PHNwYW4gY2xhc3M9XCJzbWFsbC1mXCI+Rjwvc3Bhbj4nO1xuICAgICAgdmFyIGZvcm1hdHRlZFN0cmluZyA9ICcnO1xuXG4gICAgICBpZiAodGVtcGVyYXR1cmVTdHJpbmcpIHtcbiAgICAgICAgZm9ybWF0dGVkU3RyaW5nID0gdGVtcGVyYXR1cmVTdHJpbmcgKyBtYXJrdXBGb3JtYXQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmb3JtYXR0ZWRTdHJpbmc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIG1hdGhlbWF0aWNhbCBjb21wYXJpc29uIGJldHdlZW4gdGhlIHR3byBleGlzdGluZyBkYXRhIG9iamVjdCB0ZW1wZXJhdHVyZSB2YWx1ZXMuXG4gICAgICogQ2FsbHMgdGhlIHBvcHVsYXRpb24gbWV0aG9kIHdpdGggdGhlIGRpZmZlcmVuY2UgYW5kIGEgYm9vbGVhbiB0aGF0IGlzIHRydWUgaWYgdGhlIHVwcGVyIGRhdGFcbiAgICAgKiBpcyB3YXJtZXIgdGhhbiB0aGUgbG93ZXIuXG4gICAgICovXG4gICAgY29tcGFyZVR3b0xvY2F0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRpZmYgPSByb3VuZHRvKHRoaXMudXBwZXJEYXRhLnRlbXBWYWwgLSB0aGlzLmxvd2VyRGF0YS50ZW1wVmFsLCAxKTtcbiAgICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaWZmKS50b1N0cmluZygpO1xuICAgICAgdmFyIHRvcElzV2FybWVyID0gZGlmZiA+IDA7XG5cbiAgICAgIHRoaXMucG9wdWxhdGVDb21wYXJpc29uKGFicywgdG9wSXNXYXJtZXIpO1xuICAgIH0sICAgIFxuXG4gICAgLyoqXG4gICAgICogVW4tZGlzcGxheXMgdGhlIGVycm9yIHBvcHVwIGFuZCByZS1zZXRzIGl0LlxuICAgICAqL1xuICAgIGNsZWFyRXJyb3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLiRlcnJvckNvbnRhaW5lci5odG1sKCcnKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICB0aGlzLiRlcnJvckFycm93LnJlbW92ZUNsYXNzKCd1cHBlciBsb3dlcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGVzIHRoZSBjb21wYXJpc29uIHRlbXBsYXRlIG9mIHRoZSB2aWV3LlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gIGRpZmZlcmVuY2UgIFN0cmluZyBkZXNjcmliaW5nIHRoZSBkaWZmZXJlbmNlIGluIHRlbXBlcmF0dXJlIGJldHdlZW4gdGhlIHR3byBcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRlcmVkIGxvY2F0aW9ucy5cbiAgICAgKiBAcGFyYW0gIHtib29sZWFufSB0b3BJc1dhcm1lciBCb29sZWFuIGRlc2NyaWJpbmcgd2hldGhlciB0aGUgXCJ1cHBlclwiIGRhdGEgb2JqZWN0IGlzIHdhcm1lciB0aGFuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGxvd2VyLlxuICAgICAqL1xuICAgIHBvcHVsYXRlQ29tcGFyaXNvbjogZnVuY3Rpb24gKGRpZmZlcmVuY2UsIHRvcElzV2FybWVyKSB7XG4gICAgICB2YXIgY29tcGFyaXNvblN0cmluZztcbiAgICAgIHZhciBkaWZmU3RyaW5nID0gJ2lzIDxzcGFuIGNsYXNzPVwibGFyZ2VyLWRlZ1wiPiVkJmRlZzs8L3NwYW4+JztcbiAgICAgIHZhciB0b3BXYXJtZXIgPSAnIHdhcm1lciB0aGFuJztcbiAgICAgIHZhciB0b3BDb29sZXIgPSAnIGNvb2xlciB0aGFuJztcbiAgICAgIHZhciBzYW1lU3RyaW5nID0gJ2lzIHRoZSBzYW1lIHRlbXBlcmF0dXJlIGFzJztcblxuICAgICAgaWYgKGRpZmZlcmVuY2UpIHtcbiAgICAgICAgY29tcGFyaXNvblN0cmluZyA9IHRvcElzV2FybWVyID8gdG9wV2FybWVyIDogdG9wQ29vbGVyO1xuICAgICAgICBkaWZmU3RyaW5nID0gZGlmZlN0cmluZy5yZXBsYWNlKCclZCcsIGRpZmZlcmVuY2UpO1xuXG4gICAgICAgIHRoaXMuJGRpZmZlcmVuY2UuaHRtbChkaWZmU3RyaW5nICsgY29tcGFyaXNvblN0cmluZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLiRkaWZmZXJlbmNlLmh0bWwoc2FtZVN0cmluZyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGRpZmZlcmVuY2VDb250LnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW1wdGllcyB0aGUgY29tcGFyaXNvbiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNsZWFyQ29tcGFyaXNvbjogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy4kZGlmZmVyZW5jZS5odG1sKCcnKTtcbiAgICAgIHRoaXMuJGRpZmZlcmVuY2VDb250LmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmlldyBtZXRob2QgdG8gYWRkIG9yIGNsZWFyIGVycm9ycyByZWNlaXZlZCBmcm9tIHRoZSBTZXJ2aWNlIG9yIGluaXRpYXRlZCBieSB0aGUgdmlldy4gXG4gICAgICogQHBhcmFtICB7T2JqZWN0IG9yICcnfSAgZXJyb3IgIEVpdGhlciB0aGUgZGF0YSBvYmplY3Qgd2l0aCBhbiAnZXJyb3InIHBhcmFtZXRlciAodG8gYWRkIHRoZSBlcnJvcilcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgYSBmYWxzZXkgdmFsdWUgdG8gcmVtb3ZlIHRoZSBlcnJvci5cbiAgICAgKi9cbiAgICBoYW5kbGVFcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICBpZiAoZXJyb3IgJiYgZXJyb3IuZXJyb3IpIHtcbiAgICAgICAgdmFyIGluZGljYXRvckNsYXNzID0gZXJyb3IuJGlucHV0Lmhhc0NsYXNzKCdqcy11cHBlcicpID8gJ3VwcGVyJyA6ICdsb3dlcic7XG4gICAgICAgIHRoaXMuJGVycm9yQ29udGFpbmVyLmh0bWwoZXJyb3IuZXJyb3IuZGVzY3JpcHRpb24pLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgdGhpcy4kZXJyb3JBcnJvdy5yZW1vdmVDbGFzcygndXBwZXIgbG93ZXInKS5hZGRDbGFzcyhpbmRpY2F0b3JDbGFzcykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB0aGlzLmNsZWFyVGVtcGxhdGUoZXJyb3IpO1xuICAgICAgICB0aGlzLmNsZWFyQ29tcGFyaXNvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jbGVhckVycm9ycygpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB2aWV3VGVzdFBhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICQoJy5jb250YWluZXInKS5maW5kKCcuaGVhZGVyLXdyYXBwZXIgaDEnKS5hcHBlbmQoJzxhIGhyZWY9XCIuL3Rlc3QvdGVzdC5odG1sXCI+dGVzdCBwYWdlPC9hPicpO1xuICAgIH1cbiAgfTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9XG57XG4gIFwicmVzcG9uc2VcIjoge1xuICBcInZlcnNpb25cIjogXCIwLjFcIixcbiAgXCJ0ZXJtc29mU2VydmljZVwiOiBcImh0dHA6Ly93d3cud3VuZGVyZ3JvdW5kLmNvbS93ZWF0aGVyL2FwaS9kL3Rlcm1zLmh0bWxcIixcbiAgXCJmZWF0dXJlc1wiOiB7XG4gIFwiY29uZGl0aW9uc1wiOiAxXG4gIH1cbiAgfSxcbiAgXCJjdXJyZW50X29ic2VydmF0aW9uXCI6IHtcbiAgXCJpbWFnZVwiOiB7XG4gIFwidXJsXCI6IFwiaHR0cDovL2ljb25zLWFrLnd4dWcuY29tL2dyYXBoaWNzL3d1Mi9sb2dvXzEzMHg4MC5wbmdcIixcbiAgXCJ0aXRsZVwiOiBcIldlYXRoZXIgVW5kZXJncm91bmRcIixcbiAgXCJsaW5rXCI6IFwiaHR0cDovL3d3dy53dW5kZXJncm91bmQuY29tXCJcbiAgfSxcbiAgXCJkaXNwbGF5X2xvY2F0aW9uXCI6IHtcbiAgXCJmdWxsXCI6IFwiU2FuIEZyYW5jaXNjbywgQ0FcIixcbiAgXCJjaXR5XCI6IFwiU2FuIEZyYW5jaXNjb1wiLFxuICBcInN0YXRlXCI6IFwiQ0FcIixcbiAgXCJzdGF0ZV9uYW1lXCI6IFwiQ2FsaWZvcm5pYVwiLFxuICBcImNvdW50cnlcIjogXCJVU1wiLFxuICBcImNvdW50cnlfaXNvMzE2NlwiOiBcIlVTXCIsXG4gIFwiemlwXCI6IFwiOTQxMDFcIixcbiAgXCJsYXRpdHVkZVwiOiBcIjM3Ljc3NTAwOTE2XCIsXG4gIFwibG9uZ2l0dWRlXCI6IFwiLTEyMi40MTgyNTg2N1wiLFxuICBcImVsZXZhdGlvblwiOiBcIjQ3LjAwMDAwMDAwXCJcbiAgfSxcbiAgXCJvYnNlcnZhdGlvbl9sb2NhdGlvblwiOiB7XG4gIFwiZnVsbFwiOiBcIlNPTUEgLSBOZWFyIFZhbiBOZXNzLCBTYW4gRnJhbmNpc2NvLCBDYWxpZm9ybmlhXCIsXG4gIFwiY2l0eVwiOiBcIlNPTUEgLSBOZWFyIFZhbiBOZXNzLCBTYW4gRnJhbmNpc2NvXCIsXG4gIFwic3RhdGVcIjogXCJDYWxpZm9ybmlhXCIsXG4gIFwiY291bnRyeVwiOiBcIlVTXCIsXG4gIFwiY291bnRyeV9pc28zMTY2XCI6IFwiVVNcIixcbiAgXCJsYXRpdHVkZVwiOiBcIjM3Ljc3MzI4NVwiLFxuICBcImxvbmdpdHVkZVwiOiBcIi0xMjIuNDE3NzI1XCIsXG4gIFwiZWxldmF0aW9uXCI6IFwiNDkgZnRcIlxuICB9LFxuICBcImVzdGltYXRlZFwiOiB7fSxcbiAgXCJzdGF0aW9uX2lkXCI6IFwiS0NBU0FORlI1OFwiLFxuICBcIm9ic2VydmF0aW9uX3RpbWVcIjogXCJMYXN0IFVwZGF0ZWQgb24gSnVuZSAyNywgNToyNyBQTSBQRFRcIixcbiAgXCJvYnNlcnZhdGlvbl90aW1lX3JmYzgyMlwiOiBcIldlZCwgMjcgSnVuIDIwMTIgMTc6Mjc6MTMgLTA3MDBcIixcbiAgXCJvYnNlcnZhdGlvbl9lcG9jaFwiOiBcIjEzNDA4NDMyMzNcIixcbiAgXCJsb2NhbF90aW1lX3JmYzgyMlwiOiBcIldlZCwgMjcgSnVuIDIwMTIgMTc6Mjc6MTQgLTA3MDBcIixcbiAgXCJsb2NhbF9lcG9jaFwiOiBcIjEzNDA4NDMyMzRcIixcbiAgXCJsb2NhbF90el9zaG9ydFwiOiBcIlBEVFwiLFxuICBcImxvY2FsX3R6X2xvbmdcIjogXCJBbWVyaWNhL0xvc19BbmdlbGVzXCIsXG4gIFwibG9jYWxfdHpfb2Zmc2V0XCI6IFwiLTA3MDBcIixcbiAgXCJ3ZWF0aGVyXCI6IFwiUGFydGx5IENsb3VkeVwiLFxuICBcInRlbXBlcmF0dXJlX3N0cmluZ1wiOiBcIjY2LjMgRiAoMTkuMSBDKVwiLFxuICBcInRlbXBfZlwiOiA2Ni4zLFxuICBcInRlbXBfY1wiOiAxOS4xLFxuICBcInJlbGF0aXZlX2h1bWlkaXR5XCI6IFwiNjUlXCIsXG4gIFwid2luZF9zdHJpbmdcIjogXCJGcm9tIHRoZSBOTlcgYXQgMjIuMCBNUEggR3VzdGluZyB0byAyOC4wIE1QSFwiLFxuICBcIndpbmRfZGlyXCI6IFwiTk5XXCIsXG4gIFwid2luZF9kZWdyZWVzXCI6IDM0NixcbiAgXCJ3aW5kX21waFwiOiAyMi4wLFxuICBcIndpbmRfZ3VzdF9tcGhcIjogXCIyOC4wXCIsXG4gIFwid2luZF9rcGhcIjogMzUuNCxcbiAgXCJ3aW5kX2d1c3Rfa3BoXCI6IFwiNDUuMVwiLFxuICBcInByZXNzdXJlX21iXCI6IFwiMTAxM1wiLFxuICBcInByZXNzdXJlX2luXCI6IFwiMjkuOTNcIixcbiAgXCJwcmVzc3VyZV90cmVuZFwiOiBcIitcIixcbiAgXCJkZXdwb2ludF9zdHJpbmdcIjogXCI1NCBGICgxMiBDKVwiLFxuICBcImRld3BvaW50X2ZcIjogNTQsXG4gIFwiZGV3cG9pbnRfY1wiOiAxMixcbiAgXCJoZWF0X2luZGV4X3N0cmluZ1wiOiBcIk5BXCIsXG4gIFwiaGVhdF9pbmRleF9mXCI6IFwiTkFcIixcbiAgXCJoZWF0X2luZGV4X2NcIjogXCJOQVwiLFxuICBcIndpbmRjaGlsbF9zdHJpbmdcIjogXCJOQVwiLFxuICBcIndpbmRjaGlsbF9mXCI6IFwiTkFcIixcbiAgXCJ3aW5kY2hpbGxfY1wiOiBcIk5BXCIsXG4gIFwiZmVlbHNsaWtlX3N0cmluZ1wiOiBcIjY2LjMgRiAoMTkuMSBDKVwiLFxuICBcImZlZWxzbGlrZV9mXCI6IFwiNjYuM1wiLFxuICBcImZlZWxzbGlrZV9jXCI6IFwiMTkuMVwiLFxuICBcInZpc2liaWxpdHlfbWlcIjogXCIxMC4wXCIsXG4gIFwidmlzaWJpbGl0eV9rbVwiOiBcIjE2LjFcIixcbiAgXCJzb2xhcnJhZGlhdGlvblwiOiBcIlwiLFxuICBcIlVWXCI6IFwiNVwiLFxuICBcInByZWNpcF8xaHJfc3RyaW5nXCI6IFwiMC4wMCBpbiAoIDAgbW0pXCIsXG4gIFwicHJlY2lwXzFocl9pblwiOiBcIjAuMDBcIixcbiAgXCJwcmVjaXBfMWhyX21ldHJpY1wiOiBcIiAwXCIsXG4gIFwicHJlY2lwX3RvZGF5X3N0cmluZ1wiOiBcIjAuMDAgaW4gKDAgbW0pXCIsXG4gIFwicHJlY2lwX3RvZGF5X2luXCI6IFwiMC4wMFwiLFxuICBcInByZWNpcF90b2RheV9tZXRyaWNcIjogXCIwXCIsXG4gIFwiaWNvblwiOiBcInBhcnRseWNsb3VkeVwiLFxuICBcImljb25fdXJsXCI6IFwiaHR0cDovL2ljb25zLWFrLnd4dWcuY29tL2kvYy9rL3BhcnRseWNsb3VkeS5naWZcIixcbiAgXCJmb3JlY2FzdF91cmxcIjogXCJodHRwOi8vd3d3Lnd1bmRlcmdyb3VuZC5jb20vVVMvQ0EvU2FuX0ZyYW5jaXNjby5odG1sXCIsXG4gIFwiaGlzdG9yeV91cmxcIjogXCJodHRwOi8vd3d3Lnd1bmRlcmdyb3VuZC5jb20vaGlzdG9yeS9haXJwb3J0L0tDQVNBTkZSNTgvMjAxMi82LzI3L0RhaWx5SGlzdG9yeS5odG1sXCIsXG4gIFwib2JfdXJsXCI6IFwiaHR0cDovL3d3dy53dW5kZXJncm91bmQuY29tL2NnaS1iaW4vZmluZHdlYXRoZXIvZ2V0Rm9yZWNhc3Q/cXVlcnk9MzcuNzczMjg1LC0xMjIuNDE3NzI1XCJcbiAgfVxufSIsInZhciBRID0gUVVuaXQ7XG5cbnZhciBBcHAgPSByZXF1aXJlKCcuLi9zY3JpcHRzL3dlYXRoZXJPci5qcycpO1xudmFyIFdVQXBpID0gcmVxdWlyZSgnLi4vc2NyaXB0cy93ZWF0aGVyLXVuZGVyZ3JvdW5kLWFwaS5qcycpO1xudmFyIG1vY2tBcGlSZXNwb25zZSA9IHJlcXVpcmUoJy4vbW9jay1yZXNwb25zZS5qcycpO1xuXG52YXIgbWFya3VwRml4dHVyZXMgPSB7XG4gIGJhc2U6ICcjcXVuaXQtZml4dHVyZScsXG4gIGFsbElucHV0czogJzxkaXYgY2xhc3M9XCJpbnB1dC1jb250YWluZXJcIj48aW5wdXQgY2xhc3M9XCJqcy11cHBlclwiIC8+PGlucHV0IGNsYXNzPVwianMtbG93ZXJcIiAvPjwvZGl2PicsXG4gIGNsZWFyQnV0dG9uOiAnPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPjxkaXYgY2xhc3M9XCJjbGVhci1idXR0b25cIj48L2Rpdj48L2Rpdj4nLFxuICBsb3dlcklucHV0OiAnPGlucHV0IGNsYXNzPVwianMtbG93ZXJcIiAvPicsXG4gIGxvd2VyT3V0cHV0OiAnPGRpdiBjbGFzcz1cIm91dHB1dC1jb250YWluZXJcIj48ZGl2IGNsYXNzPVwianMtbG93ZXJcIj48L2Rpdj48L2Rpdj4nLFxuICBlcnJvckNvbnRhaW5lcjogJzxkaXYgY2xhc3M9XCJlcnJvci1jb250YWluZXJcIj48L2Rpdj4nLFxuICBlcnJvckFycm93OiAnPGRpdiBjbGFzcz1cImVycm9yLWFycm93XCI+PC9kaXY+J1xufTtcblxudmFyIGVtcHR5Rnh0ID0gZnVuY3Rpb24gKCkge1xuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmVtcHR5KCk7XG59O1xuXG52YXIgbW9ja0RlZmVycmVkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIGRvbmU6IGZ1bmN0aW9uICgpIHtyZXR1cm4gdGhpczt9LFxuICAgIGZhaWw6IGZ1bmN0aW9uICgpIHtyZXR1cm4gdGhpczt9XG4gIH07XG59XG5cblxuLy8gVGVzdCBvZiB3ZWF0aGVyT3IuanNcblEudGVzdCggJ0luaXQgc2hvdWxkIGludm9rZSBpbml0U2VsZWN0b3JzIGFuZCBpbml0TGlzdGVuZXJzJywgZnVuY3Rpb24oYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIHNlbGVjdG9yU3B5ID0gdGhpcy5zcHkod2VhdGhlclRlc3QsICdpbml0U2VsZWN0b3JzJyk7XG4gIHZhciBsaXN0ZW5lclNweSA9IHRoaXMuc3B5KHdlYXRoZXJUZXN0LCAnaW5pdExpc3RlbmVycycpO1xuXG4gIHdlYXRoZXJUZXN0LmluaXQoKTtcblxuICBhc3NlcnQub2sod2VhdGhlclRlc3QuaW5pdFNlbGVjdG9ycy5jYWxsZWRPbmNlICYmIHdlYXRoZXJUZXN0LmluaXRMaXN0ZW5lcnMuY2FsbGVkT25jZSwgJ3Bhc3NlZCcpO1xufSk7XG5cblEudGVzdCggJ0luaXQgc2hvdWxkIGluc3RhbnRpYXRlIGEgbmV3IHdlYXRoZXIgQVBJJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG5cbiAgd2VhdGhlclRlc3QuaW5pdCgpO1xuXG4gIGFzc2VydC5vayh0eXBlb2Ygd2VhdGhlclRlc3Qud2VhdGhlckFQSSA9PT0gJ29iamVjdCcsICdwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoICdpbml0U2VsZWN0b3JzIHNob3VsZCBwb3B1bGF0ZSB0aGUgYXBwXFwncyBkYXRhIG9iamVjdHMnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB1cHBlckRhdGEsIGxvd2VyRGF0YSwgYWxsSW5wdXRzLCB1ZElucHV0LCB1ZE91dHB1dCwgbGRJbnB1dCwgbGRPdXRwdXQsIGRpZmZlcmVuY2UsIGRpZmZNc2csIFxuICAgIGNsZWFyQnRuLCBlcnJDb250LCBlcnJBcnJvdztcbiAgdmFyIGVsZW1lbnRzQXJyYXk7XG4gIHZhciBhbGxFbGVtZW50c1ZhbGlkID0gdHJ1ZTtcblxuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHdlYXRoZXJUZXN0LmluaXRTZWxlY3RvcnMoKTtcblxuICB1cHBlckRhdGEgPSB3ZWF0aGVyVGVzdC51cHBlckRhdGE7XG4gIGxvd2VyRGF0YSA9IHdlYXRoZXJUZXN0Lmxvd2VyRGF0YTtcbiAgYWxsSW5wdXRzID0gd2VhdGhlclRlc3QuYWxsSW5wdXRzO1xuICB1ZElucHV0ID0gdXBwZXJEYXRhLiRpbnB1dDtcbiAgdWRPdXRwdXQgPSB1cHBlckRhdGEuJG91dHB1dDtcbiAgbGRJbnB1dCA9IGxvd2VyRGF0YS4kaW5wdXQ7XG4gIGxkT3V0cHV0ID0gbG93ZXJEYXRhLiRvdXRwdXQ7XG4gIGRpZmZlcmVuY2UgPSB3ZWF0aGVyVGVzdC4kZGlmZmVyZW5jZUNvbnQ7XG4gIGRpZmZNc2cgPSB3ZWF0aGVyVGVzdC4kZGlmZmVyZW5jZTtcbiAgY2xlYXJCdG4gPSB3ZWF0aGVyVGVzdC4kY2xlYXJCdXR0b247XG4gIGVyckNvbnQgPSB3ZWF0aGVyVGVzdC4kZXJyb3JDb250YWluZXI7XG4gIGVyckFycm93ID0gd2VhdGhlclRlc3QuJGVycm9yQXJyb3c7XG5cbiAgZWxlbWVudHNBcnJheSA9IFthbGxJbnB1dHMsIHVkSW5wdXQsIHVkT3V0cHV0LCBsZElucHV0LCBsZE91dHB1dCwgZGlmZmVyZW5jZSwgZGlmZk1zZywgXG4gICAgY2xlYXJCdG4sIGVyckNvbnQsIGVyckFycm93XTtcblxuICBmb3IgKHZhciBpPTA7IGkgPCBlbGVtZW50c0FycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCEoZWxlbWVudHNBcnJheVtpXSBpbnN0YW5jZW9mIGpRdWVyeSkpIHtcbiAgICAgIGFsbEVsZW1lbnRzVmFsaWQgPSBmYWxzZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGFzc2VydC5vayhhbGxFbGVtZW50c1ZhbGlkLCAncGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCAnaW5pdExpc3RlbmVycyBzaG91bGQgc2V0IGEgY2hhbmdlIGxpc3RlbmVyIG9uIGFsbElucHV0cyAnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIHByb3h5U3B5ID0gdGhpcy5zcHkoJCwgJ3Byb3h5Jyk7XG5cbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5hbGxJbnB1dHMpKTtcbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5jbGVhckJ1dHRvbikpO1xuICB3ZWF0aGVyVGVzdC5hbGxJbnB1dHMgPSAkKG1hcmt1cEZpeHR1cmVzLmFsbElucHV0cyk7XG4gIHdlYXRoZXJUZXN0LiRjbGVhckJ1dHRvbiA9ICQobWFya3VwRml4dHVyZXMuY2xlYXJCdXR0b24pO1xuXG4gIHdlYXRoZXJUZXN0LmluaXRMaXN0ZW5lcnMoKTtcblxuICAvLyAkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpLmNsaWNrKCk7XG4gIC8vICQobWFya3VwRml4dHVyZXMuYWxsSW5wdXRzKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgLy8gJChtYXJrdXBGaXh0dXJlcy5jbGVhckJ1dHRvbikuY2xpY2soKTtcblxuICBhc3NlcnQub2socHJveHlTcHkuY2FsbGVkV2l0aCh3ZWF0aGVyVGVzdC5oYW5kbGVJbnB1dENoYW5nZSksICdpbnB1dCBjaGFuZ2UgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhwcm94eVNweS5jYWxsZWRXaXRoKHdlYXRoZXJUZXN0Lm1hbmFnZUlucHV0RW50cnkpLCAnaW5wdXQgZW50cnkgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhwcm94eVNweS5jYWxsZWRXaXRoKHdlYXRoZXJUZXN0LmNsZWFyRGF0YSksICdjbGVhciBidXR0b24gY2xpY2sgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhwcm94eVNweS5hcmdzLmxlbmd0aCA9PT0gNCwgJ2ZvdXIgY2FsbHMgdG8gcHJveHkgcGFzc2VkJyk7XG4gIGVtcHR5Rnh0KCk7XG59KTtcblxuUS50ZXN0KCAnaGFuZGxlSW5wdXRDaGFuZ2Ugc2hvdWxkIGNhbGwgcmV0cmlldmUgY29uZGl0aW9ucyB3aXRoIGNvcnJlY3QgZGF0YScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIG1vY2tFdmVudCwgcGFzc2VkT2JqO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciByZXRyaWV2ZUNvbmRpdGlvbnNTcHkgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdyZXRyaWV2ZUNvbmRpdGlvbnNEYXRhJywgbW9ja0RlZmVycmVkKTtcblxuICB2YXIgdGFyZ2V0RWwgPSAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpKTtcbiAgdGFyZ2V0RWwudmFsKCdob2d3YXJ0cycpO1xuXG4gIG1vY2tFdmVudCA9IHtcbiAgICB0YXJnZXQ6IHRhcmdldEVsXG4gIH1cblxuICB3ZWF0aGVyVGVzdC5oYW5kbGVJbnB1dENoYW5nZShtb2NrRXZlbnQpO1xuXG4gIHBhc3NlZE9iaiA9IHJldHJpZXZlQ29uZGl0aW9uc1NweS5hcmdzWzBdWzBdO1xuXG4gIGFzc2VydC5vayhwYXNzZWRPYmoucGxhY2UgPT09ICdob2d3YXJ0cycsICdwbGFjZSB2YWx1ZSBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKHBhc3NlZE9iai5lcnJvciA9PT0gbnVsbCwgJ3Jlc2V0IGVycm9yIHBhc3NlZCcpO1xuICBlbXB0eUZ4dCgpO1xufSk7XG5cblEudGVzdCggJ21hbmFnZUlucHV0RW50cnkgc2hvdWxkIGhhbmRsZSBlcnJvciwgb3IgYWRkIC8gcmVtb3ZlIGNsYXNzZXMgYmFzZWQgb24gbGVuZ3RoJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgbW9ja0V2ZW50LCB0YXJnZXRFbCwgYWRkQ2xhc3NTcHksIHJlbW92ZUNsYXNzU3B5LCB6ZXJvTGVuZ3RoLCBvdmVyTmluZSwgdW5kZXJOaW5lO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBoYW5kbGVFcnJvclNweSA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2hhbmRsZUVycm9yJyk7XG5cbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KSk7XG4gIHRhcmdldEVsID0gJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KTtcbiAgXG4gIG1vY2tFdmVudCA9IHtcbiAgICB0YXJnZXQ6IHRhcmdldEVsXG4gIH1cblxuICB0YXJnZXRFbC52YWwoJycpOyAvLyBaZXJvIGxlbmd0aCBlbnRyeVxuICB6ZXJvTGVuZ3RoID0gd2VhdGhlclRlc3QubWFuYWdlSW5wdXRFbnRyeShtb2NrRXZlbnQpO1xuICBhc3NlcnQub2soaGFuZGxlRXJyb3JTcHkuY2FsbGVkT25jZSAmJiBoYW5kbGVFcnJvclNweS5jYWxsZWRXaXRoKCcnKSwgJ2VtcHR5IHN0cmluZywgaGFuZGxlIGVycm9yIHBhc3NlZCcpO1xuXG4gIHRhcmdldEVsLnZhbCgnbmluZUNoYXJhY3RlcnNPck1vcmUnKTsgLy8gT3ZlciBuaW5lIGNoYXJhY3RlcnNcbiAgb3Zlck5pbmUgPSB3ZWF0aGVyVGVzdC5tYW5hZ2VJbnB1dEVudHJ5KG1vY2tFdmVudCk7XG4gIGFzc2VydC5vayhvdmVyTmluZS5oYXNDbGFzcygnc21hbGxlci1pbnB1dC10ZXh0JyksICdsb25nIHN0cmluZywgc21hbGwgZm9udCBjbGFzcyBhZGRlZCcpO1xuXG4gIHRhcmdldEVsLnZhbCgnc2hvcnQnKTsgLy8gVW5kZXIgbmluZSBjaGFyYWN0ZXJzXG4gIHVuZGVyTmluZSA9IHdlYXRoZXJUZXN0Lm1hbmFnZUlucHV0RW50cnkobW9ja0V2ZW50KTtcbiAgYXNzZXJ0Lm9rKCF1bmRlck5pbmUuaGFzQ2xhc3MoJ3NtYWxsZXItaW5wdXQtdGV4dCcpLCAnc2hvcnQgc3RyaW5nLCBzbWFsbCBmb250IGNsYXNzIHJlbW92ZWQnKTtcblxuICBlbXB0eUZ4dCgpO1xufSk7XG5cblEudGVzdCgnY2xlYXJEYXRhIHNob3VsZCBlbXB0eSBkYXRhIG9iamVjdHMsIGVtcHR5IHRoZSBpbnB1dHMsIGFuZCBpbnZva2Ugc3Vib3JkaW5hdGUgZm5jdGlvbnMnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGNsZWFyVGVtcGxhdGVTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJUZW1wbGF0ZScpO1xuICB2YXIgY2xlYXJDb21wYXNyaXNvblN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjbGVhckNvbXBhcmlzb24nKTtcbiAgdmFyIGNsZWFyRXJyb3JTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJFcnJvcnMnKTtcbiAgdmFyIGJsYW5rT2JqRml4dHVyZSA9IHtcbiAgICBwbGFjZU5hbWU6ICcnLFxuICAgIHRlbXBTdHJpbmc6ICcnLFxuICAgIHRlbXBWYWw6IDAsXG4gICAgaWNvblVybDogJycsXG4gICAgZXJyb3I6IHt9XG4gIH1cblxuICB3ZWF0aGVyVGVzdC5hbGxJbnB1dHMgPSAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmFsbElucHV0cykudmFsKCc0IHByaXZldCBkcml2ZScpKVxuXG4gIHdlYXRoZXJUZXN0LnVwcGVyRGF0YSA9IHtcbiAgICBwbGFjZU5hbWU6ICdob2d3YXJ0cycsXG4gICAgdGVtcFN0cmluZzogJ2NoaWxseScsXG4gICAgdGVtcFZhbDogNyxcbiAgICBpY29uVXJsOiAnbWlycm9yX29mX2VyaXNlZCcsXG4gICAgZXJyb3I6IHtkZXNjcmlwdGlvbjogJ1doYXQgd291bGQgSSBnZXQgaWYgSSBhZGRlZCBwb3dkZXJlZCByb290IG9mIGFzcGhvZGVsIHRvIGFuIGluZnVzaW9uIG9mIHdvcm13b29kPyd9XG4gIH1cblxuICB3ZWF0aGVyVGVzdC5jbGVhckRhdGEoKTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHdlYXRoZXJUZXN0LnVwcGVyRGF0YSwgYmxhbmtPYmpGaXh0dXJlLCAnYmxhbmsgb3V0IGRhdGEgb2JqZWN0IHBhc3NlZCcpO1xuICBhc3NlcnQub2sod2VhdGhlclRlc3QuYWxsSW5wdXRzLnZhbCgpID09PSAnJywgJ2VtcHR5IGlucHV0cyBwYXNzZWQnKTtcbiAgYXNzZXJ0Lm9rKGNsZWFyVGVtcGxhdGVTdHViLmNhbGxlZE9uY2UsICdjbGVhclRlbXBsYXRlIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjbGVhckNvbXBhc3Jpc29uU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXJDb21wYXJpc29uIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjbGVhckVycm9yU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXJFcnJvcnMgY2FsbCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ3JldHJpZXZlQ29uZGl0aW9uc0RhdGEgc2hvdWxkIGludm9rZSByZXF1ZXN0IGZyb20gdGhlIHdlYXRoZXJBUEkgd2l0aCB0aGUgcHJvdmlkZWQgZGF0YScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIGFwaVJlcXVlc3RTdHViO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG5cbiAgd2VhdGhlclRlc3Qud2VhdGhlckFQSSA9IHsgcmVxdWVzdDogbW9ja0RlZmVycmVkIH07XG4gIGFwaVJlcXVlc3RTdHViID0gdGhpcy5zcHkod2VhdGhlclRlc3Qud2VhdGhlckFQSSwgJ3JlcXVlc3QnKTtcblxuICB2YXIgdGVzdE9iaiA9IHtcbiAgICBwbGFjZTogJ21vcyBlaXNsZXknLFxuICAgIGVycm9yOiBudWxsXG4gIH1cblxuICB3ZWF0aGVyVGVzdC5yZXRyaWV2ZUNvbmRpdGlvbnNEYXRhKHRlc3RPYmopO1xuXG4gIGFzc2VydC5vayhhcGlSZXF1ZXN0U3R1Yi5jYWxsZWRXaXRoKHRlc3RPYmopLCAnY29ycmVjdCBvYmplY3QgcGFzc2VkIHRvIHJlcXVlc3QsIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgncG9wdWxhdGVUZW1wbGF0ZSBzaG91bGQgY2FsbCBoYW5kbGVFcnJvciBpZiB0aGVyZSBpcyBhbiBlcnJvciBwcm9wZXJ0eScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHdlYXRoZXJUZXN0ID0gbmV3IEFwcCgpO1xuICB2YXIgaGFuZGxlRXJyb3JTcHkgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdoYW5kbGVFcnJvcicpO1xuICB2YXIgZXJyb3JUZXN0T2JqID0ge1xuICAgIHBsYWNlTmFtZTogJ21vcyBlaXNsZXknLFxuICAgIGVycm9yOiB7ZGVzY3JpcHRpb246ICdUaGlzIGlzIGEgd3JldGNoZWQgaGl2ZSBvZiBzY3VtIGFuZCB2aWxsYWlueSd9XG4gIH1cblxuICB3ZWF0aGVyVGVzdC5wb3B1bGF0ZVRlbXBsYXRlKGVycm9yVGVzdE9iaik7XG5cbiAgYXNzZXJ0Lm9rKGhhbmRsZUVycm9yU3B5LmNhbGxlZFdpdGgoZXJyb3JUZXN0T2JqKSwgJ2NhbGxlZCBoYW5kbGVFcnJvciB3aGVuIG9iamVjdCBoYXMgZXJyb3IgcHJvcCwgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdwb3B1bGF0ZVRlbXBsYXRlIHNob3VsZCBjYWxsIHVwZGF0ZSB0aGUgdGVtcGxhdGUsIGFuZCBjYWxsIHN1Ym9yZGluYXRlIG1ldGhvZHMnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB0ZXN0T2JqLCB0ZXN0THdyT3V0cHV0O1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBjbGVhckVycm9yU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2NsZWFyRXJyb3JzJyk7XG4gIHZhciBtYXJrdXBUZW1wZXJhdHVyZVN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdtYXJrdXBUZW1wZXJhdHVyZScpO1xuICB2YXIgdXBkYXRlUGxhY2VOYW1lU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ3VwZGF0ZVBsYWNlTmFtZXMnKTtcbiAgdmFyIGNvbXBhcmVUd29Mb2NhdGlvblN0dWIgPSB0aGlzLnN0dWIod2VhdGhlclRlc3QsICdjb21wYXJlVHdvTG9jYXRpb25zJyk7XG5cbiAgJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5sb3dlck91dHB1dCkpO1xuXG4gIHRlc3RMd3JPdXRwdXQgPSAkKG1hcmt1cEZpeHR1cmVzLmxvd2VyT3V0cHV0KTtcblxuICB0ZXN0T2JqID0ge1xuICAgIHBsYWNlTmFtZTogJ2dvbmRvcicsXG4gICAgdGVtcFN0cmluZzogJ3N0b3JteScsXG4gICAgdGVtcFZhbDogOTcsXG4gICAgaWNvblVybDogJycsXG4gICAgJG91dHB1dDogdGVzdEx3ck91dHB1dFxuICB9O1xuXG4gIHdlYXRoZXJUZXN0LnVwcGVyRGF0YS50ZW1wVmFsID0gOTk7XG4gIHdlYXRoZXJUZXN0Lmxvd2VyRGF0YS50ZW1wVmFsID0gOTc7XG5cblxuICB3ZWF0aGVyVGVzdC5wb3B1bGF0ZVRlbXBsYXRlKHRlc3RPYmopO1xuXG4gIGFzc2VydC5vayhjbGVhckVycm9yU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXIgZXJyb3JzIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhtYXJrdXBUZW1wZXJhdHVyZVN0dWIuY2FsbGVkV2l0aCh0ZXN0T2JqLnRlbXBTdHJpbmcpLCAnbWFya3VwIHRlbXBlcmF0dXJlcyBjYWxsIHBhc3NlZCcpO1xuICBhc3NlcnQub2sodXBkYXRlUGxhY2VOYW1lU3R1Yi5jYWxsZWRPbmNlLCAndXBkYXRlIHBsYWNlIG5hbWVzIGNhbGwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjb21wYXJlVHdvTG9jYXRpb25TdHViLmNhbGxlZE9uY2UsICdjb21wYXJlIHR3byBsb2NhdGlvbnMgY2FsbCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ21hcmt1cFRlbXBlcmF0dXJlIHNob3VsZCByZXR1cm4gYSBtYXJrZWQgdXAgc3RyaW5nJywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG5cbiAgdmFyIGV4cGVjdGVkU3RyaW5nID0ge1xuICAgIGZvcm1hdHRlZDogJzQ4LjU8c3BhbiBjbGFzcz1cIm5hcnJvdy1kZWdcIj4mZGVnOzwvc3Bhbj48c3BhbiBjbGFzcz1cInNtYWxsLWZcIj5GPC9zcGFuPicsXG4gICAgcmF3OiA0OC41XG4gIH07XG5cbiAgdmFyIHJldHVybmVkU3RyaW5nID0gd2VhdGhlclRlc3QubWFya3VwVGVtcGVyYXR1cmUoZXhwZWN0ZWRTdHJpbmcucmF3KTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHJldHVybmVkU3RyaW5nLCBleHBlY3RlZFN0cmluZy5mb3JtYXR0ZWQsICdzdHJpbmcgbWFya3VwIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgnaGFuZGxlRXJyb3Igc2hvdWxkIGNhbGwgY2xlYXJFcnJvcnMgaWYgcGFzc2VkIGEgZmFsc2V5IHZhbHVlIG9yIGFuIG9iamVjdCB3aXRoIG5vIGVycm9yIHByb3AnLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciB3ZWF0aGVyVGVzdCA9IG5ldyBBcHAoKTtcbiAgdmFyIGNsZWFyRXJyb3JTdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJFcnJvcnMnKTtcbiAgdmFyIHRlc3RPYmpOb0Vycm9yID0ge1xuICAgIHBsYWNlTmFtZTogJ2Rpc3RyaWN0IDEzJyxcbiAgICB0ZW1wU3RyaW5nOiAnc25vd3knLFxuICAgIHRlbXBWYWw6IDEzXG4gIH07XG5cbiAgd2VhdGhlclRlc3QuaGFuZGxlRXJyb3IoJycpO1xuICB3ZWF0aGVyVGVzdC5oYW5kbGVFcnJvcih0ZXN0T2JqTm9FcnJvcik7XG4gIHdlYXRoZXJUZXN0LmhhbmRsZUVycm9yKDApO1xuXG4gIGFzc2VydC5vayhjbGVhckVycm9yU3R1Yi5hcmdzLmxlbmd0aCA9PT0gMywgJ2NhbGxlZCBmb3IgdGhyZWUgZmFsc2V5IHZhbHVlcywgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdoYW5kbGVFcnJvciBzaG91bGQgY2FsbCBjbGVhclRlbXBsYXRlIGFuZCBjbGVhckNvbXBhcmlzb24gaWYgZXJyb3Igb2JqZWN0IGlzIHBhc3NlZCcsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIHRlc3RPYmpFcnJvciwgbG93ZXJJbnB1dEVsO1xuICB2YXIgd2VhdGhlclRlc3QgPSBuZXcgQXBwKCk7XG4gIHZhciBjbGVhclRlbXBsYXRlU3R1YiA9IHRoaXMuc3R1Yih3ZWF0aGVyVGVzdCwgJ2NsZWFyVGVtcGxhdGUnKTtcbiAgdmFyIGNsZWFyQ29tcGFzcmlzb25TdHViID0gdGhpcy5zdHViKHdlYXRoZXJUZXN0LCAnY2xlYXJDb21wYXJpc29uJylcblxuICAkKG1hcmt1cEZpeHR1cmVzLmJhc2UpLmFwcGVuZCgkKG1hcmt1cEZpeHR1cmVzLmxvd2VySW5wdXQpKTtcbiAgbG93ZXJJbnB1dEVsID0gJChtYXJrdXBGaXh0dXJlcy5sb3dlcklucHV0KTtcblxuICB0ZXN0T2JqRXJyb3IgPSB7XG4gICAgcGxhY2VOYW1lOiAnJyxcbiAgICBlcnJvcjoge2Rlc2NyaXB0aW9uOiAnbm8gcGxhY2UgbmFtZSwgb29wcyd9LFxuICAgICRpbnB1dDogbG93ZXJJbnB1dEVsXG4gIH07XG5cbiAgd2VhdGhlclRlc3QuJGVycm9yQ29udGFpbmVyID0gJChtYXJrdXBGaXh0dXJlcy5iYXNlKS5hcHBlbmQoJChtYXJrdXBGaXh0dXJlcy5lcnJvckNvbnRhaW5lcikpO1xuICB3ZWF0aGVyVGVzdC4kZXJyb3JBcnJvdyA9ICQobWFya3VwRml4dHVyZXMuYmFzZSkuYXBwZW5kKCQobWFya3VwRml4dHVyZXMuZXJyb3JBcnJvdykpO1xuXG4gIHdlYXRoZXJUZXN0LmhhbmRsZUVycm9yKHRlc3RPYmpFcnJvcik7XG5cbiAgYXNzZXJ0Lm9rKGNsZWFyVGVtcGxhdGVTdHViLmNhbGxlZFdpdGgodGVzdE9iakVycm9yKSwgJ2NsZWFyIHRlbXBsYXRlIGNhbGxlZCB3aXRoIG9iamVjdCwgcGFzc2VkJyk7XG4gIGFzc2VydC5vayhjbGVhckNvbXBhc3Jpc29uU3R1Yi5jYWxsZWRPbmNlLCAnY2xlYXIgY29tcGFyaXNvbiBjYWxsZWQsIHBhc3NlZCcpO1xufSk7XG5cbi8vIFRlc3Qgb2Ygd2VhdGhlci11bmRlcmdyb3VuZC1hcGkuanNcblEudGVzdCgncmVxdWVzdCBzaG91bGQgY2FsbCB3ZWF0aGVyIHVuZGVyZ3JvdW5kIHdpdGggYWpheCcsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIGFwaVRlc3QgPSBuZXcgV1VBcGkoKTtcbiAgdmFyIGJ1aWxkVXJsU3R1YiA9IHRoaXMuc3R1YihhcGlUZXN0LCAnYnVpbGRVcmwnLCBmdW5jdGlvbiAoKSB7cmV0dXJuICdhcGlfdGVzdCc7fSk7XG4gIHZhciBhamF4U3R1YiA9IHRoaXMuc3R1YigkLCAnYWpheCcsIG1vY2tEZWZlcnJlZCk7XG4gIHZhciB0ZXN0UmVxT2JqID0ge1xuICAgIHBsYWNlOiAnbW9yZG9yJ1xuICB9XG5cbiAgYXBpVGVzdC5yZXF1ZXN0KHRlc3RSZXFPYmopO1xuXG4gIGFzc2VydC5vayhidWlsZFVybFN0dWIuY2FsbGVkV2l0aCh0ZXN0UmVxT2JqLnBsYWNlKSwgJ2J1aWxkIHVybCBjYWxsIHBhc3NlZCcpO1xuICBhc3NlcnQub2soYWpheFN0dWIuY2FsbGVkV2l0aCgnYXBpX3Rlc3QnKSwgJ2FqYXggY2FsbCBwYXNzZWQnKTtcbn0pO1xuXG5RLnRlc3QoJ2NvbmZvcm0gbWFuaXB1bGF0ZXMgdGhlIG9iamVjdCBwYXNzZWQsIHJldHVybmluZyBhbiBlcnJvciBpZiBwcmVzZW50IG9yIGZvcm1hdHRpbmcgdGhlIG9iamVjdCBjb3JyZWN0bHknLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gIHZhciBzdWNjZXNzVGVzdCwgZXJyb3JUZXN0LCBtdWx0aXBsZVJlc3VsdHNUZXN0O1xuICB2YXIgYXBpVGVzdCA9IG5ldyBXVUFwaSgpO1xuICBcbiAgdmFyIGljb25TdHViU3RyaW5nID0gZnVuY3Rpb24gKCkge3JldHVybiAnaWNvbl91cmxfdGVzdCc7fTtcbiAgdmFyIGJ1aWxkSWNvblVybFN0dWIgPSB0aGlzLnN0dWIoYXBpVGVzdCwgJ2J1aWxkSWNvblVybCcsIGljb25TdHViU3RyaW5nKTtcbiAgdmFyIG11bHRpcGxlUmVzdWx0U3R1YiA9IHRoaXMuc3R1YihhcGlUZXN0LmVycm9yVHlwZSwgJ211bHRpcGxlUmVzdWx0cycpO1xuXG4gIHZhciBtb2NrUmVzcG9uc2UgPSBtb2NrQXBpUmVzcG9uc2U7XG4gIHZhciBtb2NrRXJyb3JSZXNwb25zZSA9IHtkZXNjcmlwdGlvbjogJ2Nhbm5vdCBzZWUgdG9vIGZvZ2d5J307XG4gIHZhciBtb2NrUmVzdWx0c1Jlc3BvbnNlID0gW3tuYW1lOiAnZmlyc3Rfb2JqZWN0J30sIHtuYW1lOiAnc2Vjb25kX29iamVjdCd9XTtcbiAgdmFyIHN1Y2Nlc3NGaXh0dXJlT2JqID0ge1xuICAgIHBsYWNlTmFtZTogJ1NBTiBGUkFOQ0lTQ08sIENBJyxcbiAgICBzcGVjaWZpY1BsYWNlOiAnU09NQSAtIE5FQVIgVkFOIE5FU1MsIFNBTiBGUkFOQ0lTQ08sIENBJyxcbiAgICB0ZW1wU3RyaW5nOiAnNjYuMycsXG4gICAgdGVtcFZhbDogNjYuMyxcbiAgICBpY29uVXJsOiBpY29uU3R1YlN0cmluZygpXG4gIH1cblxuICAvLyBGaXN0IGNhbGwgdGhlIG1ldGhvZCB3aXRoIGV4cGVjdGVkIGJlaGF2aW9yXG4gIHN1Y2Nlc3NUZXN0ID0gYXBpVGVzdC5jb25mb3JtKG1vY2tSZXNwb25zZSk7XG4gIC8vIEFuZCBkZWNsYXJlIHRoZSBhc3NlcnRpb25zIGZvciBleHBlY3RlZCBiZWhhdmlvclxuICBhc3NlcnQuZGVlcEVxdWFsKHN1Y2Nlc3NUZXN0LCBzdWNjZXNzRml4dHVyZU9iaiwgJ3N1Y2Nlc3NmdWwgY2FsbCBwYXNzZWQnKTtcblxuICAvLyBBZGQgbXVsdGlwbGUgcmVzdWx0cyB0byB0aGUgcmVzcG9uc2UgYW5kIGNhbGwgdGhlIG1ldGhvZFxuICBtb2NrUmVzcG9uc2UucmVzcG9uc2UucmVzdWx0cyA9IG1vY2tSZXN1bHRzUmVzcG9uc2U7XG4gIG11bHRpcGxlUmVzdWx0c1Rlc3QgPSBhcGlUZXN0LmNvbmZvcm0obW9ja1Jlc3BvbnNlKTtcbiAgLy8gRGVjbGFyZSB0aGUgYXNzZXJ0aW9ucyBmb3IgbXVsdGlwbGUgcmVzdWx0c1xuICBhc3NlcnQub2sobXVsdGlwbGVSZXN1bHRTdHViLmNhbGxlZFdpdGgobW9ja1Jlc3VsdHNSZXNwb25zZVswXSksICdjYWxsIHdpdGggbXVsdGlwbGUgcmVzdWx0cyBwYXNzZWQnKTtcblxuICAvLyBBZGQgdGhlIGVycm9yIG9iamVjdCBhbmQgY2FsbCB0aGUgbWV0aG9kXG4gIG1vY2tSZXNwb25zZS5yZXNwb25zZS5lcnJvciA9IG1vY2tFcnJvclJlc3BvbnNlO1xuICBlcnJvclRlc3QgPSBhcGlUZXN0LmNvbmZvcm0obW9ja1Jlc3BvbnNlKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChlcnJvclRlc3QsIHtcImVycm9yXCI6IG1vY2tFcnJvclJlc3BvbnNlfSwgJ2NhbGwgd2l0aCBlcnJvciBwcm9wIHBhc3NlZCcpO1xufSk7XG5cblEudGVzdCgnYnVpbGRVcmwgc2hvdWxkIGNvbWJpbmUgdGhlIEFQSSBLZXkgYW5kIHRoZSBzZWFyY2ggdGVybSB0byBidWlsZCB0aGUgdXJsIGZvciBhamF4JywgZnVuY3Rpb24gKGFzc2VydCkge1xuICB2YXIgdGVzdFJlc3VsdDtcbiAgdmFyIGFwaVRlc3QgPSBuZXcgV1VBcGkoKTtcbiAgdmFyIHVybEZpeHR1cmUgPSAnaHR0cDovL2FwaS53dW5kZXJncm91bmQuY29tL2FwaS8xMjM0NS9jb25kaXRpb25zL3EvbW9yZG9yLmpzb24nO1xuICB2YXIgc2VhcmNoVGVybSA9ICdtb3Jkb3InO1xuXG4gIGFwaVRlc3QuQVBJa2V5ID0gJzEyMzQ1JztcblxuICB0ZXN0UmVzdWx0ID0gYXBpVGVzdC5idWlsZFVybChzZWFyY2hUZXJtKTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHRlc3RSZXN1bHQsIHVybEZpeHR1cmUsICdidWlsZCB1cmwgc3RyaW5nIGNvcnJlY3RseSwgcGFzc2VkJyk7XG59KTtcblxuUS50ZXN0KCdidWlsZEljb25VcmwgY2hlY2tzIGRlZmF1bHQgaWNvbiB1cmwgZm9yIG5pZ2h0IHRpbWUgZGVzaWduYXRpb24sIHRoZW4gYnVpbGRzIGNvcnJlY3RseScsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgdmFyIGRheVRlc3RSZXN1bHQsIG5pZ2h0VGVzdFJlc3VsdDtcbiAgdmFyIGFwaVRlc3QgPSBuZXcgV1VBcGkoKTtcbiAgdmFyIGljb25UeXBlID0gJ2NsZWFyJztcbiAgdmFyIGRheVRlc3RTdHJpbmcgPSAnY2xvdWR5LmdpZic7XG4gIHZhciBuaWdodFRlc3RTdHJpbmcgPSAnbnRfY2xvdWR5LmdpZic7XG4gIHZhciBpY29uVXJsRGF5Rml4dHVyZSA9ICdodHRwOi8vaWNvbnMud3h1Zy5jb20vaS9jL2JpbGJvL2NsZWFyLmdpZic7XG4gIHZhciBpY29uVXJsTmlnaHRGaXh0dXJlID0gJ2h0dHA6Ly9pY29ucy53eHVnLmNvbS9pL2MvYmlsYm8vbnRfY2xlYXIuZ2lmJztcblxuICBhcGlUZXN0Lmljb25TZXQgPSAnYmlsYm8vJztcblxuICBkYXlUZXN0UmVzdWx0ID0gYXBpVGVzdC5idWlsZEljb25VcmwoaWNvblR5cGUsIGRheVRlc3RTdHJpbmcpO1xuICBuaWdodFRlc3RSZXN1bHQgPSBhcGlUZXN0LmJ1aWxkSWNvblVybChpY29uVHlwZSwgbmlnaHRUZXN0U3RyaW5nKTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKGRheVRlc3RSZXN1bHQsIGljb25VcmxEYXlGaXh0dXJlLCAnYnVpbGQgaWNvbiB1cmwgZm9yIGRheSBwYXNzZWQnKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbChuaWdodFRlc3RSZXN1bHQsIGljb25VcmxOaWdodEZpeHR1cmUsICdidWlsZCBpY29uIHVybCBmb3IgbmlnaHQgcGFzc2VkJyk7XG59KTsiXX0=
