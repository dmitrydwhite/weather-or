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