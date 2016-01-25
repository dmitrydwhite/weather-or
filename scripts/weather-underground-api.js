module.exports = function wapi () {

  this.request = function (reqObj) {
    var Def = $.Deferred();
    var urlString = this.buildUrl(reqObj.place);
    $.ajax(urlString)
      .done(function (response) {
        Def.resolve(this.conform(response));
      }.bind(this))
      .fail(function () {
        this.stubRequest();
      });

    return Def;
  };

  this.stubRequest = function (reqObj) {
    var Def = $.Deferred();

    Def.resolve({
      placeName: 'SALEM, OR',
      tempString: '47.2 F',
      tempVal: 47.2,
      iconUrl: 'http://icons.wxug.com/i/c/i/nt_clear.gif'
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

        ret.placeName = obsv.display_location.full.toUpperCase();
        ret.specificPlace = obsv.observation_location.full.split(',')[0].toUpperCase().trim();
        ret.tempString = obsv.temp_f.toString();
        ret.tempVal = obsv.temp_f;
        ret.iconUrl = this.buildIconUrl(obsv.icon, obsv.icon_url);
      }
    }

    return ret;
  };

  this.buildUrl = function (searchString) {
    var firstPart = 'http://api.wunderground.com/api/8c4c6c8bebd341a5/conditions/q/';
    var lastPart = '.json';

    return firstPart + searchString + lastPart;
  };

  // TODO: This should determine day or night.
  this.buildIconUrl = function (iconType, iconUrl) {
    if (iconUrl.indexOf('nt') !== -1) iconType = 'nt_' + iconType;
    return 'http://icons.wxug.com/i/c/i/' + iconType + '.gif';
  };
};