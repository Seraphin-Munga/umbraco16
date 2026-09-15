"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var apiObj = [];
var currentDataStr="";
var selectedPeriod = 3,
    selectedPeriodNotice = 7,
    chart,
    investmentAmount = 500;
var payoutFrequency = "Monthly";
var currentData = {
  frequency: "M0131",
  product: "Fixed",
  productCode: "IFD03",
  amount: investmentAmount
};
$(document).ready(function () {

});
var chartRendered = false,
    loaded = false;

var appIsReady = function appIsReady() {
  formatThisVal();
  getInitialData();
}; //Below method get called from the appIsReady method


var prepareCharts = function() {
    
  chart = Highcharts.chart('chart-container', {
    chart: {
      type: 'column'
    },
    title: {
      text: ''
    },
    exporting: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    xAxis: {
      type: 'category',
      labels: {
        useHTML: true,
        formatter: function(data) {
          var prefix;
          var value = data.value == "TxFree" ? "Tax" : data.value;

          if (value == 'Fixed') {
            prefix = " Deposit";
          } else if (value == "Notice") {
            prefix = " Deposit";
          } else if (value == "Access") {
            prefix = "Accumulator";
          } else if (value == "Tax") {
            prefix = "Free";
          }

          return '<div class="centeredCategory">' + value + '<div style="margin-top:-22px;">' + prefix + '</div></div>';
        }
      },
      lineWidth: 0
    },
    yAxis: {
      title: {
        text: 'Total percent market share'
      },
      visible: false
    },
    legend: {
      enabled: false
    },
    plotOptions: {
      series: {
        borderWidth: 1,
        minPointLength: 70,
        borderRadius: 25 ,
        pointWidth:50,
        
        dataLabels: {
          enabled: false //format: '{point.y:.1f}%'
        },
        point: {
          events: {
            click: function() {
              barChartClicked(this);
            }
          }
        },
        // Apply border radius and box shadow to the lines
        line: {
          borderRadius: 5,
          boxShadow: '0px 3px 30px rgba(0, 0, 0, 0.2)'
        }
      }
    },
    tooltip: {
      headerFormat: '',
      pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>R {point.y:.2f}</b><br/>'
    },
    series: [{
      data: calculateDataSetFromApi(apiObj)
    }]
  });
  chartRendered = true;
};

var calculateDataSetFromApi = function calculateDataSetFromApi(api) {

  var dataSetObject = [];
  api.map(function (obj) {
    if (obj.product.includes('Fixed')) {
      var color = obj.selected ? '#0d1a5c' : '#adaaaa';
      dataSetObject.push({
        name: 'Fixed',
        y: obj.FinalAmount,
        marker: {
          enabled: false
        },
        color: color,
        defaultColor: '#0d1a5c'
      });
    } else if (obj.product.includes('Notice')) {
      var color = obj.selected ? '#0d1a5c' : '#adaaaa';
      dataSetObject.push({
        name: 'Notice',
        y: obj.FinalAmount,
        marker: {
          enabled: false
        },
        color: color,
        defaultColor: '#0d1a5c'
      });
    } else if (obj.product.includes('Access')) {
      var color = obj.selected ? '#0d1a5c' : '#adaaaa';
      dataSetObject.push({
        name: 'Access',
        y: obj.FinalAmount,
        marker: {
          enabled: false
        },
        color: color,
        defaultColor: '#0d1a5c'
      });
    } else if (obj.product.includes('TxFree')) {
      var color = obj.selected ? '#0d1a5c' : '#adaaaa';
      dataSetObject.push({
        name: 'TxFree',
        y: obj.FinalAmount,
        marker: {
          enabled: false
        },
        color: color,
        defaultColor: '#0d1a5c'
      });
    }
  });
  return dataSetObject;
}; //The investment button is clicked


var investBtnClicked = function investBtnClicked() {
  window.location = "https://ib.africanbank.net/";
}; //We update the chart according to new values | depends on the investment amount and period selected





var updateSeriesData = function updateSeriesData() {
  !chartRendered ? (prepareCharts(), $('.cta-button,.re-cta-button').slideToggle()) : (chart.series[0].update({
    data: calculateDataSetFromApi(apiObj)
  }), $('.calc-loader,.re-cta-button').slideToggle());
  displayReturnsData();
};

var displayReturnsData = function displayReturnsData() {

  $(".otherInvestmentTypes").html("");

  if (chartRendered) {
    $(chart.series[0].data).each(function () {
      var icon,
          investmentType = this.name,
          investmentTypeAmount = formatToCurrency(this.y);
      var displayName, backgroundColor;
      var chosenPeriod = $("." + this.name + "-select-input").val();

      if (investmentType.includes("Fixed")) {
        icon = "/media/pk3lovs3/noticeboard.png";
        displayName = investmentType + " Deposit";
        var titleText = "Investment after " + chosenPeriod.toLowerCase() + "";
        backgroundColor = '#00A6D6';
      } else if (investmentType.includes("Notice")) {
        icon = "/media/pk3lovs3/noticeboard.png";
        displayName = investmentType + " Deposit";
        var titleText = "After 36 months";
        backgroundColor = '#00A6D6';
      } else if (investmentType.includes("Access")) {
        icon = "/media/r5jl3dxs/access-acumulator.png";
        displayName =investmentType + " Accumulator"
        var titleText = "Investment after 24 months";
        backgroundColor = '#00A6D6';
      } else if (investmentType.includes("TxFree")) {
        icon = "/media/jrxbam1i/tax-free.png";
        displayName = " Tax Free";
        var titleText = "After expiry (Max R36 000)";
        backgroundColor = '#00A6D6';
      }

      if (!investmentType.includes(currentData.product)) {
        $(".otherInvestmentTypes").append("<div class='other-inv' investmentType=" + investmentType + "><div class='inv-other-ico' style='background:" + backgroundColor + ";border-radius:10px;padding: 22px 20px 20px 20px;align-items:center;align-content:center;'><img class='' src='" + icon + "'  alt=" + this.name + "/></div><div><p class='other-inv-title'>" + displayName + "</p><p class='big-return-other'>" + investmentTypeAmount + "</p><p class='other-inv-term'>" + titleText + "</p></div></div>");
      } else {
        $(".selected-header-inv-type").text(displayName);
        $(".big-return").text(investmentTypeAmount);
        $(".return-inv-term").text(titleText);
      }
    });
  }
};

var formatToCurrency = function formatToCurrency(val) {
  return "R " + val.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$& ");
};

var formatThisVal = function formatThisVal() {
  if (investmentAmount) {
    $(".investment_amount_input").val("R " + investmentAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$& "));
  }
};

function isNumber(evt) {
  var charCode = evt.which ? evt.which : event.keyCode;
  if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) return false;
  return true;
}

$(".cta-button").click(function () {
 
  if ($(".investment_amount_input").val() !== "" && loaded !== false) {
    $(".artwork").css("position", "absolute").animate({
      left: "-5000px"
    }, 500);
    $(".i-loader").fadeIn(1000).delay(500).fadeOut(1000);
    $(".investment-results").delay(2000).animate({
      left: "0px"
    }, 1000).css("position", "relative");
    

    
    fetchData();
    
 $(".investment-results").css("display", "block");

  }
});

var getInitialData = function getInitialData() {
  var products = ['Fixed', 'Notice', 'Access', 'TxFree'];
  Promise.all(products.map(function (product) {
    return fetchApi('terms', {
      product: product
    }, function (_ref) {
      var Result = _ref.Result;
      return createUI(Result, product);
    });
  })).then(function () {
    loaded = true;
  });
};

var createUI = function createUI(result, product) {
  result.Terms.map(function (item) {
    var timeFrame = item.Timeframe == 'M' ? ' MONTHS' : ' DAYS';
    $("." + product + "-select-input").append("<option ProductCode=" + item.ProductCode + " product=" + product + ">" + item.TermValue + timeFrame + "</option>");
  });
  result.PayoutFrequencies.map(function (item) {
    return item.Value !== undefined && $("." + product + "-payFeq-input").append("<option Key=" + item.Key + " product=" + product + ">" + item.Value + "</option>");
  });
  
  debugger;

  if (product === 'Fixed') {
    apiObj.push({
      frequency: "M0131",
      product: "Fixed",
      productCode: "IFD03",
      amount: investmentAmount,
      selected: true,
      ValidationAmount: result.ValidationAmount
    });
  } else if (product === 'Notice') {
    apiObj.push({
      frequency: "M0131",
      product: "Notice",
      productCode: "IND07",
      amount: investmentAmount,
      selected: false,
      ValidationAmount: result.ValidationAmount
    });
  } else if (product === 'Access') {
    apiObj.push({
      frequency: "M9999",
      product: "Access",
      productCode: "IAA24",
      amount: investmentAmount,
      selected: false,
      ValidationAmount: result.ValidationAmount
    });
  } else if (product === 'TxFree') {
    apiObj.push({
      frequency: "M9999",
      product: "TxFree",
      productCode: "ITN01",
      amount: investmentAmount,
      selected: false,
      ValidationAmount: result.ValidationAmount
    });
    $(".thereafter_amount_input").attr("MonthlyMaxAmount", result.ValidationAmount.MonthlyMaxAmount).attr("OnceOffMaxAmount", result.ValidationAmount.OnceOffMaxAmount);
  }
  
  
  
 apiObj = apiObj.map(function (item) {
    return item.product !== (currentDataStr) ? _objectSpread(_objectSpread({}, item), {}, {
      selected: false
    }) : _objectSpread(_objectSpread({}, item), {}, {
      selected: true
    });
  });
    
  
  
};

var getFinalAmount = function getFinalAmount(obj, cb) {
  return fetchApi('calculate', obj, function (_ref2) {
    var Result = _ref2.Result;
    //console.log(obj);
    apiObj = apiObj.map(function (item) {
      return item.product !== obj.product ? item : _objectSpread(_objectSpread({}, obj), {}, {
        FinalAmount: Result.FinalAmount
      });
    });
    cb();
  });
};

$(document).on("click", ".re-cta-button", function (e) {
  if ($(".investment_amount_input").val() !== "" && loaded) {
    $('.calc-loader,.re-cta-button').slideToggle();
    fetchData();
  }
});

var fetchData = function fetchData() {
  var amount = $(".investment_amount_input").val();

  if (amount != "") {
    var counter = 4;
    apiObj.map(function (obj) {
      getFinalAmount(obj, function () {
        counter = counter - 1, counter == 0 && updateSeriesData();
      });
    });
  }
};

$(document).on("change", ".dynamic-input", function (e) {
  var productCode = $('option:selected', this).attr('ProductCode');
  currentData = _objectSpread(_objectSpread({}, currentData), {}, {
    productCode: productCode,
    noticePeriod: currentData.product == "Notice" ? productCode : null
  });
  apiObj = apiObj.map(function (item) {
    return item.product !== currentData.product ? item : _objectSpread(_objectSpread({}, item), {}, {
      productCode: productCode,
      noticePeriod: currentData.product == "Notice" ? productCode : null
    });
  });
  var period = parseInt($(this).val().split(" ")[0]);
  selectedPeriod = period;
});
$(document).on("change", ".dynamic-inputs", function (e) {
  var Key = $('option:selected', this).attr('Key');
  currentData = _objectSpread(_objectSpread({}, currentData), {}, {
    frequency: Key
  });
  apiObj = apiObj.map(function (item) {
    return item.product !== currentData.product ? item : _objectSpread(_objectSpread({}, item), {}, {
      frequency: Key
    });
  });
}); //When user update the investment amount

var newInvestmentAmountEntered = function newInvestmentAmountEntered(e) {
  var amount = $(".investment_amount_input").val().replace(/[ ,]/g, "");

  if (amount.includes('R')) {
    amount = amount.slice(1, amount.length);
  }

  investmentAmount = parseFloat(amount);
  apiObj = apiObj.map(function (item) {
    var dynamicAmount = item.product == "TxFree" ? investmentAmount >= parseFloat(item.ValidationAmount.OnceOffMinAmount) && investmentAmount <= parseFloat(item.ValidationAmount.OnceOffMaxAmount) ? investmentAmount : investmentAmount > parseFloat(item.ValidationAmount.OnceOffMaxAmount) ? parseFloat(item.ValidationAmount.OnceOffMaxAmount) : parseFloat(item.ValidationAmount.OnceOffMinAmount) : investmentAmount <= parseFloat(item.ValidationAmount.OnceOffMinAmount) ? parseFloat(item.ValidationAmount.OnceOffMinAmount) : investmentAmount;
    currentData = _objectSpread(_objectSpread({}, currentData), {}, {
      amount: dynamicAmount
    });

    if (currentData.product === item.product) {
      investmentAmount = dynamicAmount;
    }

    return _objectSpread(_objectSpread({}, item), {}, {
      amount: dynamicAmount
    });
  });
  var OnceOffMaxAmount = parseFloat($(".thereafter_amount_input").attr("OnceOffMaxAmount"));

  if (currentData.product === "TxFree") {
    if (amount > OnceOffMaxAmount) {
      $(".TxFree-error-class1").text("Max amount is R36 000");
      $(".TxFree-norm-class1,.TxFree-error-class1").slideToggle();
      $(".investment_amount_input").val("R " + OnceOffMaxAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$& "));
      investmentAmount = OnceOffMaxAmount;
      currentData = _objectSpread(_objectSpread({}, currentData), {}, {
        monthlyAmountThereafter: OnceOffMaxAmount
      });
      apiObj = apiObj.map(function (item) {
        return item.product !== currentData.product ? item : _objectSpread(_objectSpread({}, item), {}, {
          amount: OnceOffMaxAmount
        });
      });
      setTimeout(function () {
        $(".TxFree-norm-class1,.TxFree-error-class1").slideToggle();
      }, 3000);
    }

    checkTaxFreeInputs('onceOff');
  }
};

var inputFocused = function inputFocused() {};

$(document).on("keyup", ".investment_amount_input", function (e) {
  if (e.which === 13) {
    formatThisVal();
  }
});
$(document).on("keyup", ".thereafter_amount_input", function (e) {
  var amount = $(this).val().replace(/[ ,]/g, "");

  if (amount.includes('R')) {
    amount = amount.slice(1, amount.length);
  }

  amount = parseFloat(amount);
  currentData = _objectSpread(_objectSpread({}, currentData), {}, {
    monthlyAmountThereafter: amount
  });
  apiObj = apiObj.map(function (item) {
    return item.product !== currentData.product ? item : _objectSpread(_objectSpread({}, item), {}, {
      monthlyAmountThereafter: amount
    });
  });

  if (e.which === 13) {
    TAX_FREE_VALIDATION(this);
  }
});

var TAX_FREE_VALIDATION = function TAX_FREE_VALIDATION(elem) {
  if ($(elem).val().replace(/[ R,]/g, "") != "") {
    var amount = parseFloat($(elem).val().replace(/[ R,]/g, ""));
    var MonthlyMaxAmount = $(elem).attr("MonthlyMaxAmount");

    if (currentData.product === "TxFree") {
      if (amount > parseFloat(MonthlyMaxAmount)) {
        $(".TxFree-error-class").text("Max amount is R3 000");
        $(".TxFree-norm-class,.TxFree-error-class").slideToggle();
        $(elem).val("");
        currentData = _objectSpread(_objectSpread({}, currentData), {}, {
          monthlyAmountThereafter: 0
        });
        setTimeout(function () {
          $(".TxFree-norm-class,.TxFree-error-class").slideToggle();
        }, 3000);
      } else {
        $(elem).val("R " + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$& "));
      }

      checkTaxFreeInputs('monthly');
    } else {
      $(".thereafter_amount_input").val("R " + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$& "));
    }
  }
};

var checkTaxFreeInputs = function checkTaxFreeInputs(input) {
  var monthlyAmount = parseFloat($(".tax_thereafter_amount_input").val().replace(/[ R,]/g, ""));
  var onceOffAmount = parseFloat($(".investment_amount_input").val().replace(/[ R,]/g, ""));
  var OnceOffMaxAmount = parseFloat($(".thereafter_amount_input").attr("OnceOffMaxAmount"));

  if (monthlyAmount * 12 + onceOffAmount > OnceOffMaxAmount) {
    if (input == 'monthly') {
      $(".thereafter_amount_input").val("");
      $(".TxFree-error-class").text("Once off Investment amount + monthly investment amount can not be greater than R 36 000!");
      $(".TxFree-error-class,.TxFree-norm-class").slideToggle();
      apiObj = apiObj.map(function (item) {
        return item.product !== currentData.product ? item : _objectSpread(_objectSpread({}, item), {}, {
          monthlyAmountThereafter: 0
        });
      });
      setTimeout(function () {
        $(".TxFree-error-class,.TxFree-norm-class").slideToggle();
      }, 4500);
    } else {
      $(".investment_amount_input").val("");
      $(".TxFree-error-class1").text("Once off Investment amount + monthly investment amount can not be greater than R 36 000!");
      $(".TxFree-error-class1,.TxFree-norm-class1").slideToggle();
      apiObj = apiObj.map(function (item) {
        return item.product !== currentData.product ? item : _objectSpread(_objectSpread({}, item), {}, {
          amount: 0
        });
      });
      setTimeout(function () {
        $(".TxFree-error-class1,.TxFree-norm-class1").slideToggle();
      }, 4500);
    }
  }
};




$(document).on("change", ".investmentType", function (e) {

  var selectedInvestmentType = $(this).val();
  investmentTypeChange(selectedInvestmentType);
}); //Get executed when we press period labels

$(document).on("click", ".other-inv", function (e) {
  var selectedInvestmentType = $(this).attr("investmentType");
  investmentTypeChange(selectedInvestmentType);
});

var barChartClicked = function barChartClicked(args) {
  $(chart.series[0].data).each(function () {
    this.update({
      color: "#adaaaa"
    });
  });
  currentData = _objectSpread(_objectSpread({}, currentData), {}, {
    product: args.name
  });
  args.update({
    color: args.defaultColor
  });
  investmentTypeChange(args.name);
};

var validate_decimal = function validate_decimal(e) {
  var t = e.value;
  e.value = t.indexOf(".") >= 0 ? t.substr(0, t.indexOf(".")) + t.substr(t.indexOf("."), 3) : t;
};

var investmentTypeChange = function investmentTypeChange(selectedInvestmentType) {
  debugger
  var partialElem = selectedInvestmentType.split(" ")[0];
  chartRendered && $(chart.series[0].data).each(function () {
    selectedInvestmentType.includes(this.name) ? (this.update({
      color: this.defaultColor
    }), currentData = _objectSpread(_objectSpread({}, currentData), {}, {
      product: this.name
    })) : this.update({
      color: "#adaaaa"
    });
  });
  $(".thereafter_amount_input").val("");
  $(".investmentType-holder").hide();

    partialElem = partialElem === "TxFree" ? "Tax" : partialElem;
  
  $("." + partialElem + "-inputs-holder").show();
  var productCode = $('option:selected', $("." + partialElem + "-select-input")).attr('ProductCode');
  productCode = productCode === undefined ? "ITN01" : productCode;
  
  var frequency = $('option:selected', $("." + partialElem + "-payFeq-input")).attr('Key');
  partialElem = partialElem === "Tax" ? "TxFree" : partialElem;
  
  currentData = _objectSpread(_objectSpread({}, currentData), {}, {
    product: partialElem,
    productCode: productCode,
    frequency: frequency,
    noticePeriod: partialElem == "Notice" ? productCode : null,
    monthlyAmountThereafter: null
  });
  
 
 currentDataStr = currentData.product;
 

  apiObj = apiObj.map(function (item) {
    return item.product !== (currentData.product) ? _objectSpread(_objectSpread({}, item), {}, {
      selected: false
    }) : _objectSpread(_objectSpread({}, item), {}, {
      selected: true
    });
  });
  
  apiObj.map(function (item) {
    if (item.product == currentData.product) {
      investmentAmount = item.amount;
      formatThisVal();
    }
  });
  chartRendered && displayReturnsData();
};

$(document).ready(function() {
    
 
var investmentData = ""

var path = window.location.pathname;

console.log("Path: " + path);

var modifiedString = path.replace(/\/en\/home\//g, "");



var accumulator = modifiedString.indexOf("accumulator");
var investment = modifiedString.indexOf("fixed-deposit-investment");

var tax = modifiedString.indexOf("product-tax-free");
var notice = modifiedString.indexOf("notice");



if (accumulator !== -1) {
      investmentData= "Access Accumulator"
} else if(notice !== -1){
    
         investmentData= "Notice Deposit"
}else if (tax !== -1){
     investmentData= "Tax Free"
    
}else if (investment !== -1){
     investmentData= "Fixed Deposit"
    
}


 appIsReady();
investmentTypeChange(investmentData);
})