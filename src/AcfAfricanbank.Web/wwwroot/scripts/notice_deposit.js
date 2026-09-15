
var interest = [];
var context = $("#loggedInContext").attr('href');
var noticeLookupUrl = context + "/savings/rates/notice-deposit";
var detailedNoticeRatesLookupUrl = context + "/savings/detailed-notice-deposit-rates";

$(function(ab, $){

    /**
     * Exit this script if there is no bounding element found
     */
    if (!$('.notice-calc .fixed-calculator-wrapper').length > 0) return;


    function populateRatesTable(){
      $.ajax({
          type: "GET",
          url: detailedNoticeRatesLookupUrl,
          crossDomain: true,
          success: function (response) {
            printRates(response.reverse());
          }
        });
    }

    function printRates(rates){
      $.each(rates, function(key) {
        row = '<div class="col-xs-12"> ' +
              '<div class="rate-values">' +
                '<div class="row">' +
                  '<div class="col-xs-12 col-sm-2">'+ rates[key].term +' days</div>' +
                  '<div class="col-xs-12 col-sm-2">R500</div>' +
                  '<div class="col-xs-12 col-sm-2">'+ rates[key].monthlyRate +'%</div>' +
                  '<div class="col-xs-12 col-sm-2">n.a.</div>' +
                  '<div class="col-xs-12 col-sm-2">n.a.</div>' +
                  '<div class="col-xs-12 col-sm-2">'+ rates[key].expiryRate +'%</div>' +
                '</div>' +
              '</div>' +
            '</div> <div class="col-xs-12"><hr></div>';
        $(".notice-rates-rows").append($(row));
      });

    }

    $.ajax({
        type: "GET",
        url: noticeLookupUrl,
        crossDomain: true,
        success: function (response) {

            if (response == null) {

                ab.shared.showErrorMsg("An empty response was returned from the server. Please try again Later");
                $("#calculator-footer").slideUp();

                return false;
            }

            if (!ab.utilities.isNullOrEmpty(response.errorMessage)) {

                ab.shared.showErrorMsg(response.errorMessage);
                $("#calculator-footer").slideUp();

                return false;
            }

            for( var key in response.interestRates ){

                interest.push(parseFloat(response.interestRates[key]));
            }


            populateRatesTable(response.interestRates);

            return interest;
        },
        error: function (jqXHR, textStatus, errorThrown) {

            return ab.shared.showErrorMsg('Error: ' + errorThrown);
            $("#calculator-footer").slideUp();
        }
    });

}(window.ab = window.ab || {}, jQuery));

$(function (ab, $) {

    /**
     * Exit this script if there is no bounding element found
     */
    if (!$('.notice-calc .fixed-calculator-wrapper').length > 0) return;

    ab.shared = {

        showErrorMsg : showErrorMsg
    };

    /**
     * Fields
     */
    var $applyButton = $('.action-button button'),
        noticePeriod = 0,
        termPeriod,
        numberFormatOptions = {
            symbol: "R",
            decimal: ".",
            thousand: " ",
            precision: 2,
            format: "%s %v"
        };


    $applyButton.on('click', function () {

        ab.utilities.scrollToElem('#call-to-action-investment')

    });

    $('#amount').keyup(function (e) {

        calculate();

    });

    $("#selectedNoticePeriod").on('change', function () {

        calculate();
    })

    $('#selectedHowToInvest').on('change', function () {

        calculate();
    });

    function calculate() {

        var amount = $("#amount").val(),
            parsedAmount = parseFloat(amount),
            regX = /^[1-9]\d*(\.\d{1,2})?\s*$/;

        if (isNullOrEmpty(amount) || _.isNaN(parsedAmount) || !regX.test(amount)) {
            showErrorMsg("Please specify a valid amount, eg: 500.00");
            $("#calculator-footer").slideUp();
            return;
        }

        if (parseInt(amount) == 0 || amount == "") {

            $("#calculator-footer").slideUp();

            return;
        }


        noticePeriod = $("#selectedNoticePeriod").val();

        var interestRate = setTerm(noticePeriod) / 100;

        var investmentMethod = $("#selectedHowToInvest").val();

        //Once-off is simple, monthly is compound interest.
        var isSimpleInterest = investmentMethod == "O";

        calculateNoticeInterest(amount, interestRate, isSimpleInterest);
    }


    function setTerm(noticePeriod) {

        termPeriod = interest[noticePeriod];

        return termPeriod;

    }

    function calculateNoticeInterest(amount, interestRate, isSimpleInterest) {
        hideErrorMsg();
        if (isNullOrEmpty(amount)) {
            showErrorMsg("Please specify a valid amount, eg: 500.00");
            $("#calculator-footer").slideUp();
            return;
        }

        if (parseInt(amount) < 500) {
            showErrorMsg("Please specify an amount of R500 or more");
            $("#calculator-footer").slideUp();
            return;
        }

        var periods = [6, 12, 24, 36];

        for (var i = 0; i < periods.length; i++) {
            var period = periods[i];
            if (!period) {
                continue;
            }

            var calculateResult = isSimpleInterest
                ? calculateSimpleInterest(amount, interestRate, period)
                : calculateCompoundInterest(amount, interestRate, period);

            var investmentEntry = new investmentResult(period, interestRate, calculateResult.interest, calculateResult.total);

            updateInvestmentTable(investmentEntry);
        }
        ShowHideResultsTable(true);
    }

    function calculateSimpleInterest(amount, interestRate, months) {
        hideErrorMsg();
        var totalIncInterest = amount * Math.pow(1 + (interestRate / 12), months);
        //var totalIncInterest = amount * (1 + (interestRate / 12) * months);//amount * Math.pow(1+(interestRate / 12), months);
        var interest = totalIncInterest - amount;
        var total = totalIncInterest;

        if (isNullOrEmpty(amount)) {
            showErrorMsg("Please specify a valid amount, eg: 200.00");
            $("#calculator-footer").slideUp();
            return;
        }

        if (parseInt(amount) < 500) {
            showErrorMsg("Please specify an amount of R500 or more");
            $("#calculator-footer").slideUp();
            return;
        }

        return new calculationResult(total, interest);
    }

    function calculateCompoundInterest(monthlyDeposit, interestRate, months) {
        hideErrorMsg();

        if (isNullOrEmpty(monthlyDeposit)) {
            showErrorMsg("Please specify a valid amount, eg: 200.00");
            $("#calculator-footer").slideUp();
            return;
        }

        if (parseInt(monthlyDeposit) < 500) {
            showErrorMsg("Please specify an amount of R500 or more");
            $("#calculator-footer").slideUp();
            return;
        }

        var adjustedMonthlyRate = (1 + (interestRate / 12));

        var monthlyPeriodRate = (Math.pow(adjustedMonthlyRate, months)) - 1;
        var monthlyValue = monthlyDeposit * (monthlyPeriodRate / (interestRate / 12));
        var total = adjustedMonthlyRate * monthlyValue;
        var totalInterest = total - (monthlyDeposit * months);

        return new calculationResult(total, totalInterest);
    }

    function investmentResult(period, interestRate, totalInterestEarned, totalInvestmentValue) {
        this.period = period;
        this.interestRate = interestRate;
        this.totalInterestEarned = totalInterestEarned;
        this.totalInvestmentValue = totalInvestmentValue;

        this.getPeriodDisplay = function () {
            return this.period + " Months";
        };

        this.getInterestRate = function () {
            return (this.interestRate * 100).toFixed(2) + "%";
        };

        this.getTotalInterestEarned = function () {
            return formatAsCurrencyStr(this.totalInterestEarned);
        };

        this.getTotalInvestmentValue = function () {
            return formatAsCurrencyStr(this.totalInvestmentValue);
        };

        return this;
    }

    function formatAsCurrencyStr(num) {
        //var amt = accounting.formatMoney()
        var isNull = isNullOrUndefined(num);

        /*var amt = !isNull && (typeof num == "number" || (typeof num == "string" && num.length > 0 && num.indexOf("R") == -1))
            ? parseFloat(Math.round(num * 100) / 100)// .toFixed(2).toString()
            : num;*/
        //As we have no implemented the regex to validate the amount - we no longer need to do the above ^^
        var amt = parseFloat(num);

        if (!isNaN(amt)) {
            amt = accounting.formatMoney(amt, numberFormatOptions);
        }

        /*if (!isNullOrUndefined(amt) && amt.indexOf("R") == -1) {
            amt = "R " + amt;
        }*/

        if (!isNullOrUndefined(amt)) {
            amt =  amt;
        }

        return amt;
    }

    function updateInvestmentTable(investmentEntry) {
        var period = investmentEntry.period;

        $("#interestRate" + period).text(investmentEntry.getInterestRate());
        $("#interestEarned" + period).text(investmentEntry.getTotalInterestEarned());
        $("#investTotal" + period).text(investmentEntry.getTotalInvestmentValue());
    }

    function calculationResult(total, interest) {
        this.total = total;
        this.interest = interest;
        return this;
    }

    function ShowHideResultsTable(visible) {
        if (visible) {

            $(".investmentResultsTable").show();
            $("#calculator-footer").slideDown();
        }
        else {
            $(".investmentResultsTable").hide();
        }
    }

    function isNullOrEmpty(str) {
        return isNullOrUndefined(str) || str.length == 0 || (typeof str == "string" && str == "");
    }

    function isNullOrUndefined(obj) {
        return typeof obj == "undefined" || obj == null;
    }

    function showErrorMsg(errorMsg) {
        $("#errorMsg").text(errorMsg).show();
    }

    function hideErrorMsg() {
        $("#errorMsg").hide();
    }

    $('[data-toggle="tooltip"]').tooltip();

}(window.ab = window.ab || {}, jQuery));
