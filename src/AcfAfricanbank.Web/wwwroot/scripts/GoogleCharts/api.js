"use strict";

var endPoint = 'https://mobile.africanbank.net';

var fetchApi = function fetchApi(type, data, cb) {
  var url = '/public/calculator/' + type;
  var attr = getFetchAttr();
  setEndPoint(attr);
  $.ajax({
    type: 'POST',
    url: endPoint + url,
    dataType: 'json',
    contentType: 'application/json',
    beforeSend: function beforeSend(xhr) {
      makeHeaders(xhr, attr.headers);
    },
    data: JSON.stringify(data),
    success: function success(response) {
      if (response.Result) {
        cb(response);
      } else {
        console.log(response);
      }
    },
    error: function error() {
      console.log("There was an error");
    }
  });
};

function makeHeaders(_xhr, _list) {
  if (_list && _list.length > 0) {
    for (var i = 0, l = _list.length; i < l; i++) {
      _xhr.setRequestHeader(_list[i][0], _list[i][1]);
    }
  }
}

function setEndPoint(_data) {
  if (_data && _data.serviceUrl) {
    endPoint = _data.serviceUrl;
  }
}