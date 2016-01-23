module.exports = function wapi () {

  this.request = function (reqObj) {
    var Def = $.Deferred();
    var urlString = this.buildUrl(reqObj.place);
    $.ajax(urlString)
      .done(function (response) {
        Def.resolve(this.conform(response));
      }.bind(this))
      .fail(function () {
        Def.reject();
      });

    return Def;
  };

  this.conform = function (responseObj) {
    var ret = {};

    if (responseObj.response.error) {
      console.log('you suck');
    } else {
      if (responseObj.current_observation) {
        var obsv = responseObj.current_observation;

        ret.placeName = obsv.display_location.full;
        ret.tempString = obsv.temperature_string.split('(')[0].trim();
        ret.tempVal = obsv.temp_f;
        ret.iconUrl = this.buildIconUrl(obsv.icon, obsv.icon_url);
      }
    }

    return ret;
  };

  this.buildUrl = function (searchString) {
    var firstPart = 'http://api.wunderground.com/api/625172310aff38a6/conditions/q/';
    var lastPart = '.json';

    return firstPart + searchString + lastPart;
  };

  // TODO: This should determine day or night.
  this.buildIconUrl = function (iconType, iconUrl) {
    if (iconUrl.indexOf('nt') !== -1) iconType = 'nt_' + iconType;
    return 'http://icons.wxug.com/i/c/i/' + iconType + '.gif';
  };
};