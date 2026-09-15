var validMove = false;
var _banks = [];

var bankRef = "";
var bankBranch = "";
var empRef = "";
var empName = "";
var cmbOffers = 0;
var allOffers = 0;
var ccOffers = 0;
var lnsOffers = 0;

var qqSession = {
    applicationId: "", clientNumber: "", otpSession: "", clientIdType: "", clientIdnumber: "",
    clientPassportNumber: "", clientType: "", clientTitle: "", clientCellphone: "", clientName: "",
    clientKnownName: "", clientSurname: "", clientEmail: "", step_process: "",
    employment: {
        clientReference: "",
        clientWageType: "",
        clientSalaryDepositDay: "",
        clientEmploymentStartDate: "",
        clientOccupationType: "",
        clientEmploymentType: "",
        clientOccupationStatus: "",
        clientContractEndDate: "",
        clientEmployerName: "",
        clientCalenderId: "",
        clientEmployeeNumber: "",
        clientSwitchBoardNumber: "",
        clientSwitchBoardAreacode: ""
    }

};
var resendValidate = null;
var stepData = { offerId: "", uniqueId: "" };
var loanStepOffer = 0;
var creditStepOffer = 0;
var extra_offer162 = 0;
var extra_offer176 = 0;

var loanUniqueId = 0;
var creditUnique = 0;
var extra_offer162uniqueId = 0;
var extra_offer176uniqueId = 0;

var extraBanks =
    [
        {
            "bankCode": "SBSA",
            "bankName": "STANDARD BANK",
            "branchName": "STANDARD BANK SOUTH AFRICA",
            "branchCode": "51001",
            "bankID": "1",
            "obs": true
        },
        {
            "bankCode": "FNB",
            "bankName": "FNB",
            "branchName": "REMOTE BANKING SERVICE     560",
            "branchCode": "250655",
            "bankID": "3",
            "obs": false
        }
    ];

var quick_quote_steps = function () {
  ;
    
 
    var store = new local_storage();
    var instance = this;
    var opt_retry = 0;

    this.frmStep_1 = function (e) {
        // Temporary move next

	if (validatePersonalDetailsField()) {
		if (IsValidID($("#idNumber").val(), $("#title").val())) {
			// instance.promote_next_step("process");
			instance.logic_control();
		}
	}

    },
        this.frmStep_1_1 = function (e) {
	if (validatePersonalDetailsField()) {
	    
            // $("#form-preloader").show();
            var token = $('input[name="__RequestVerificationToken"]')[0].value;

            // Check the Title versus ID
            if (IsValidID($("#idNumber").val(), $("#title").val())) {

                qqSession.clientName = $("#firstName").val();
                qqSession.clientSurname = $("#surname").val();
                qqSession.clientTitle = $("#title").val();
                qqSession.clientType = 'MAS';
                qqSession.clientIdnumber = $("#idNumber").val();
                qqSession.clientIdTye = '01';
                qqSession.clientKnownName = '';
                qqSession.clientPassportNumber = '';
                getEmploymentType();

                // $('.pause-form').show();
                var person = {
                    "idNumber": $("#idNumber").val(), 
                    "title": $("#title").val(), 
                    "surname": $("#surname").val(), 
                    "firstName": $("#firstName").val(), 
                    "EmailAddress": $("#email").val() 
                };
                var personalDetails = JSON.stringify(person);
                var post_data = {
                    "PersonalDetailsRequestString": personalDetails,
                    "PhoneNumber": $("#telephoneNumber").val(),
                    "FinancialDetails": null,
                    "OTPValue": null,
                    "Offers": null,
                    "SelectedOffer": null,
                    "utm_source": $("#utmSource").val(),
                    "utm_medium": $("#utmMedium").val(),
                    "utm_campaign": $("#utmCampaign").val()                
                };
                 $.ajax({
                    headers: { '__RequestVerificationToken': token },
                    url: '/umbraco/surface/QuickLoans/LogPersonalDetails',
                    type: "POST",
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ form: post_data }),
                    success: function (data) { 
                        $("#form-preloader").hide();
                        SaveMarketingConsentDetails(token);
                        instance.promote_next_step("process");
                     },
                    error: function (error) {
                        $('.pause-form').hide();
                        instance.terminate_process("process");
                    }
                }); 
                // instance.promote_next_step("process");
            } else {
                $('.pause-form').hide();
                instance.terminate_process("title");
            }
           }
	},
        this.frmStep_2 = function () {
	 // if (validateEmployer() === true) {
            var area_code = $("#telephoneNumber").val().substring(0, 3);
            var tel = $("#telephoneNumber").val().substring(3, 10);
            var res = $("#start-date").val().split("/");
            var endDate = $("#end-date").val().split("/");
            var validEndDate = "";
            if (endDate.length > 1) {
                validEndDate = endDate[2] + "" + endDate[1] + "" + endDate[0];
            }
            $('.pause-form').show();
            var post_data = {
                "idNumber": $("#idNumber").val(),
                "mobileNumber": $("#telephoneNumber").val(),
                "contactDetails": {
                    "emailDetails": [{
                        "type": "HOM",
                        "emailAddress": $("#email").val(),
                        "confirmEmailAddress": $("#email").val()

                    }],
                    "phoneNumberDetails": [{
                        "type": "MOB",
                        "countryCode": "27", // find method to access a contry code
                        "areaCode": area_code,
                        "telephoneNumber": tel,
                        "confirmTelephoneNumber": tel,
                        "confirmAreaCode": area_code
                    }],
                },
                "personalDetails": {
                    "idNumber": $("#idNumber").val(),
                    "clientType": "MAS",
                    "idType": "01",
                    "passportNumber": "",
                    "title": $("#title").val(),
                    "surname": $("#surname").val(),
                    "firstName": $("#firstName").val(),
                    "knownName": ""
                },
                "employments": {
                    "reference": empRef || 'UNKNOWN',
                    "wageType": $("#wageType").val(),
                    "salaryDepositDay": "",
                    "employmentStartDate": res[2] + "" + res[1] + "" + res[0],
                    "occupationType": "",
                    "employmentType": $("#employeeType").val(),
                    "occupationStatus": $("#occupationStatus").val(),
                    "contractEndDate": validEndDate,
                    "employerName": empName || 'UNKNOWN',
                    "calenderId": "",
                    "employeeNumber": "",
                    "switchBoardNumber": "",
                    "switchBoardAreacode": ""
                },
                "finances": {
                    "applicationIncomeList": [
                        { "incomeType": "NETT", "incomeValue": $("#NetIncomeInput").val() },
                        { "incomeType": "GROSS", "incomeValue": $("#GrossSalaryBeforeTaxInput").val() }
                    ],
                    "applicationExpensesList": [
                        { "expenseType": "TRANSPRT", "expenseValue": parseInt($("#transporation").val()) || 0 },
                        { "expenseType": "FOOD", "expenseValue": parseInt($("#foodGroceries").val()) || 0 },
                        { "expenseType": "EDUCATION", "expenseValue": parseInt($("#education").val()) || 0 },
                        { "expenseType": "RENT", "expenseValue": parseInt($("#rentAccomodation").val()) || 0 },
                        { "expenseType": "MEDICAL", "expenseValue": parseInt($("#medicalExpense").val()) || 0 },
                        { "expenseType": "CHILD1", "expenseValue": parseInt($("#ChildMaintenanceExpensesInput").val()) || 0 },
                        { "expenseType": "OTHER", "expenseValue": parseInt($("#other").val()) || 0 },
                        { "expenseType": "EXPENSES", "expenseValue": $("#livingExpense").val() }
                    ]
                },
                "bank": {
                    "applicationBankingDetails": [{
                        "id": null,
                        "bankCode": bankRef,
                        "branchCode": bankBranch,
                        "accountType": "",
                        "accountNumber": "",
                        "accountHolder": ""
                    }]
                }
            };
            resendValidate = post_data;
			var token = $('input[name="__RequestVerificationToken"]')[1].value;
            $.ajax({
                headers: { '__RequestVerificationToken': token },
                url: '/umbraco/surface/QuickLoans/ValidateClient',
                type: "POST",
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({ form: post_data }),
                success: function (data) {

                    $(".pause-form").hide();
                    
                    var jsonValue = data.data;
                    if (typeof (jsonValue) !== "undefined") {
                        var result_code = JSON.parse(jsonValue).results.serviceHeaderResponse.resultCode;
                        if ((result_code === 500) || (result_code === 504)) {
                            console.log("Validate Client returned results - Error Network interrupted (500, 502, 504 error reported). DONE!");
                            // Unable to process your request right now - please leave us with your details ; we will call you back
                            $('.pause-form').hide();
                            instance.terminate_process(jsonValue);
                            return;
                        }
                    }
                    var results = JSON.parse(data.data).results;

                    if (results.serviceHeaderResponse.resultCode === 200) {
                        qqSession.otpSession = results.securedServiceResponse.decisionRequestIdentifier;
                        
                        instance.promote_next_step("process");
                        instance.logic_control();
                    } else if (results.serviceHeaderResponse.resultCode === 400) {
                        $('.pause-form').hide();
                        instance.terminate_process(results.serviceHeaderResponse);
                    } else if (results.serviceHeaderResponse.resultCode === 500) {
                        $('.pause-form').hide();
                        instance.terminate_process(results.serviceHeaderResponse);
                    } else if (results.serviceHeaderResponse.resultCode === 502) {
                        $('.pause-form').hide();
                        instance.terminate_process(results.serviceHeaderResponse);
                    } else {
                        $('.pause-form').hide();
                        instance.terminate_process("process");
                    }
                },
                error: function (error) {
                    $('.pause-form').hide();
                    instance.terminate_process("process");
                }
            });
	  // }
        },
        this.frmStep_3 = function () {

            $("#form-preloader").show();

            if (validateGrossNet() === true) {
                $('.pause-form').show();
                $('.loading-message').text("Saving employment information...");
                var res = $("#start-date").val().split("/");

                qqSession.employment.clientReference = $("#employerReference").val();
                qqSession.employment.clientWageType = $("#wageType").val();
                qqSession.employment.clientSalaryDepositDay = "";
                qqSession.employment.clientEmploymentStartDate = res[2] + "" + res[1] + "" + res[0];
                qqSession.employment.clientOccupationType = "";
                qqSession.employment.clientEmploymentType = $("#employeeType").val();
                qqSession.employment.clientOccupationStatus = $("#occupationStatus").val();
                qqSession.employment.clientContractEndDate = "";
                qqSession.employment.clientEmployerName = $("#quickLoanEmployerSearch").val();
                qqSession.employment.clientCalenderId = "";
                qqSession.employment.clientEmployeeNumber = "";
                qqSession.employment.clientSwitchBoardNumber = "";
                qqSession.employment.clientSwitchBoardAreacode = "";

                $("#form-preloader").hide();
                instance.promote_next_step("process");
	    }
        },
        this.frmStep_4 = function () {
            // Get Offer by supplying OTP
            $('.pause-form').show();
            if (qqSession.clientNumber !== 0) {

                $("#form-preloader").show();

                var post_data = {

                    "idNumber": $("#idNumber").val(),

                    "clientNumber": qqSession.clientNumber,
                    "mobileNumber": $("#telephoneNumber").val(),
                    "applicationId": "0", // qqSession.applicationId,
                    "uniqueId": qqSession.otpSession,
                    "otpEntered": $("#oneTimePIN").val(),
                    "activityName": ""
                };
                
				var token = $('input[name="__RequestVerificationToken"]')[1].value;
                $.ajax({
                    headers: { '__RequestVerificationToken': token },
                    url: '/umbraco/surface/QuickLoans/GetOffers',
                    type: "POST",
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ form: post_data }),
                    success: function (data) {
                     
                        $("#form-preloader").hide();
                        $(".pause-form").hide();
                        qqSession.step_process = instance;
                        var jsonValue = data.data;
                        if ((jsonValue.includes('(500)')) || (jsonValue.includes('(504)'))) {
                            console.log("Validate Client returned results - Error Network interrupted (500, 502, 504 error reported). DONE!");
                            $('.pause-form').hide();
                            instance.terminate_process(jsonValue);
                            return;
                        }
                        
                        
                    
                        var results = JSON.parse(data.data).results;
                        
                        
                            $('#desk-view-blue').css(
                            {
                                'cssText': 'display: block !important'
                            }
                           );
                        //-->check if validation was succesful
                        if (results.serviceHeaderResponse.resultCode === 400) {
							if (results.serviceHeaderResponse.notifications != null) {
								if (results.serviceHeaderResponse.notifications.length > 0) {
									if ((results.serviceHeaderResponse.notifications[0].code === 400) &&
										(results.serviceHeaderResponse.notifications[0].message === "Invalid value")) {
										// $(".wrong-otp-error-message.incorrect-otp").show();
										//-->retry otp
										if (opt_retry === 3) {
											instance.terminate_process("process");
										}
										else {
											$("#form-preloader").hide();
											$(".wrong-otp-error-message.incorrect-otp").show();
											$(".wrong-otp-error-message.incorrect-otp").html("Please enter the correct OTP! (" + (3 - opt_retry) + " left)");
											opt_retry++;
										}
									}
								} else {
									$('.pause-form').hide();
									instance.terminate_process(results.serviceHeaderResponse);
								}
							} else {
								$('.pause-form').hide();
								instance.terminate_process(results.serviceHeaderResponse);
							}
                        } else if (results.serviceHeaderResponse.resultCode === 502) {
                            $('.pause-form').hide();
                            request_config.terminate_process(results.serviceHeaderResponse);
                        } else if (results.serviceHeaderResponse.resultCode === 200) {
                            if (typeof (results.reasonCodes) !== "undefined") {
                                if (results.reasonCodes.length > 0) {
                                    instance.load_rejection_offer(results.reasonCodes);
                                }
                 
                            }
                            else {
                                qqSession.clientNumber = results.clientNumber;
                                qqSession.applicationId = results.applicationId;
                                instance.load_offer(results.offerResponse);
                            }

                        } else {
                            $('.pause-form').hide();
                            $('.loading-message').text("");
                            instance.terminate_process("process");
                        }
                    },
                    error: function (error) {
                        instance.terminate_process("process");
                    }
                });
            }
        },
        this.frmStep_5 = function () {

            $("#form-preloader").show();
            var post_data = {

                "idNumber": $("#idNumber").val(),
                "mobileNumber": $("#telephoneNumber").val(),

                "offerId": stepData.offerId,
                "uniqueId": stepData.uniqueId,
                "clientNumber": qqSession.clientNumber,
                "applicationId": qqSession.applicationId,
            };
			var token = $('input[name="__RequestVerificationToken"]')[1].value;
            $.ajax({
                headers: { '__RequestVerificationToken': token },
                url: '/umbraco/surface/QuickLoans/SaveOffer',
                type: "POST",
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({ form: post_data }),
                success: function (data) {
                    $('.pause-form').hide();

                    var jsonValue = data.data;
                    if ((jsonValue.includes('(500)')) || (jsonValue.includes('(504)'))) {
                        $('.pause-form').hide();
                        instance.terminate_process(jsonValue);
                        return;
                    }
                    var results = JSON.parse(data.data).results;
                    if (results.serviceHeaderResponse.resultCode === 200) {
                        //-->Quick loan ends
                        $("#index_acceptId").css("display", "none");
                        $(".sw-btn-cancel").hide();
                        $(".terms_and_conditions").show();

                        instance.promote_next_step("process");
                    } else if (results.serviceHeaderResponse.resultCode === 400) {
                        $('.pause-form').hide();
                        instance.terminate_process(results.serviceHeaderResponse);
                    } else if (results.serviceHeaderResponse.resultCode === 500) {
                        $('.pause-form').hide();
                        instance.terminate_process(results.serviceHeaderResponse);
                    } else if (results.serviceHeaderResponse.resultCode === 502) {
                        $('.pause-form').hide();
                        request_config.terminate_process(results.serviceHeaderResponse);
                    } else {
                        $('.pause-form').hide();
                        instance.terminate_process("process");
                    }
                },
                error: function (error) {
                    instance.terminate_process("process");
                }
            });
        },
        this.create_app = function (id) {
            $('.pause-form').show();
            var post_data = { "clientNumber": id };

            $.ajax({
                url: '/umbraco/surface/QuickLoans/CreateApplication',
                type: "POST",
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({ form: post_data }),
                success: function (data) {
                    var results = JSON.parse(data.data).results;
                    if (results.serviceHeaderResponse.resultCode === 200) {
                        qqSession.clientNumber = id;
                        qqSession.applicationId = results.applicationID;

                        //alert("ApplicationId : " + results.applicationID); // for testing
                        post_data = { "clientNumber": qqSession.clientNumber, "applicationId": qqSession.applicationId };
                        $.ajax({
                            url: '/umbraco/surface/QuickLoans/OtpClientNumber',
                            type: "POST",
                            dataType: 'json',
                            contentType: 'application/json; charset=utf-8',
                            data: JSON.stringify({ form: post_data }),
                            success: function (data) {

                                var results = JSON.parse(data.data).results;

                                //-->check if validation was succesful
                                if (results.serviceHeaderResponse.resultCode === 200) {
                                    qqSession.otpSession = results.securedServiceResponse.decisionRequestIdentifier;
                                    $('.pause-form').hide();
                                    instance.promote_next_step("process");
                                    instance.logic_control();
                                } else if (results.serviceHeaderResponse.resultCode === 400) {
                                    $('.pause-form').hide();
                                    instance.terminate_process(results.serviceHeaderResponse);
                                } else if (results.serviceHeaderResponse.resultCode === 500) {
                                    $('.pause-form').hide();
                                    instance.terminate_process(results.serviceHeaderResponse);
                                } else {
                                    $('.pause-form').hide();
                                    instance.terminate_process("process");
                                }
                            },
                            error: function (error) {
                                $('.pause-form').hide();
                                instance.terminate_process("process");
                            }
                        });


                    } else if (results.serviceHeaderResponse.resultCode === 400) {
                        $('.pause-form').hide();
                        if ((results.applicationID === null) && (results.accountNumber === null)) {
                            $("#frmStep_1_1 .row.form-field-hide").removeClass("form-field-hide");
                            $("#frmStep_1_1 .form-field.row").addClass("form1_1");
                            instance.frmStep_1_1();
                        } else {
                            instance.terminate_process(results.serviceHeaderResponse);
                        }
                    } else {
                        $('.pause-form').hide();
                        instance.terminate_process("process");
                    }
                },
                error: function (error) {
                    $('.pause-form').hide();
                    instance.terminate_process("process");
                }
            });

        },
        this.resend_otp = function () {
            opt_retry = 0;
            $(".wrong-otp-error-message.incorrect-otp").html("");
            $(".wrong-otp-error-message.incorrect-otp").hide();
            requestOTP(qqSession.applicationId);
        },
        this.load_offer = function (offer_data) {
            var default_selection = null;
            var card_selection = null;
            var _capitalLoan = 0;
        
            /* Start New QQ Combo Offers */

        $('.body_qq').append("<div class='container' style='width: inherit'>'" +
            "<div class='row'>" +
            "   <div class='combo-card carousel-container' style='padding-left:27%;max-width: 800px;'>" +
            "       <div class='mobi-spacer'></div>" +
            "       <div class='button-carousel' style='transform: translateX(0px);'>" +
            "           <button id='btnALL' class='button-style carousel-button' type='button'>ALL</button>" +
            "           <button id='btnLOANS' class='button-style carousel-button' type='button'>LOANS</button>" +
            "           <button id='btnCC' class='button-style carousel-button' type='button'>CREDIT CARDS</button>" +
            "           <button id='btnCMBS' class='button-style carousel-button'>COMBOS</button>" +
            "       </div > " +
            "       <button class='prev-button hidden-lg hidden-md hidden-sm visible-xs'>Previous</button>" +
            "       <button class='next-button hidden-lg hidden-md hidden-sm visible-xs'>Next</button>" +
            "   </div>" +
            "</div></div>" +
            "<div class='container datainer'>");
        for (var w = 0; w < offer_data.offers.length; w++) {
            if (offer_data.offers[w].offerDetails.products.length > 1) 
            {
                $('.datainer').append("   <div id='box' class='row box' onmouseup='getDetail(this)'>" +
                "       <div class='col-lg-12 col-md-12 col-sm-12'>" +
                "           <div id='cmb-card' class='combo-card' style='background:#ebebeb;padding-top:20px;padding-bottom:20px;'>" +
                "               <div class='row'>" +
                "                   <div class='col-lg-12 col-md-12 col-sm-12 col-xs-12'>" +
                "                       <div class='cmb' style='font-size: 10px;font-weight: 800;text-align:left'><span class='cmbTitle'>" + offer_data.offers[w].offerDetails.productDescription.toUpperCase() +  "</span></div>");
                                            for (var y = 0; y < offer_data.offers[w].offerDetails.products.length; y++) 
                                            {
                                                $('.cmb').append("<div class='blog-card'>" +
                "                               <div class='meta' style='background:#ebebeb'>" +
                "                                   <div class='photo'>" +
                "                                       <p class='mobi-font' style='position: relative;text-align: left;'>R " + formatAmountToZAR(offer_data.offers[w].offerDetails.products[y].cashToClient) + "</p>" +
                "                                       <p class='card-info faint-text' style='font-size: 10px;position: relative;top: -10px;text-align: left;'>" + offer_data.offers[w].offerDetails.products[y].productClassification + "</p>" +
                "                                   </div>" +
                "                                   <ul class='details'></ul>" +
                "                               </div>" +
                "                               <div class='description' style='background:#ebebeb'>" +
                "                                   <p style='font-size: 12px;color: gray;'>Repayment <span style='font-weight: 600;margin-left: 10px;'>" + offer_data.offers[w].offerDetails.products[y].interestRate + "&#37;</span></p>" +
                "                                   <p style='font-size: 12px;font-weight: 600;'>R " + formatAmountToZAR(offer_data.offers[w].offerDetails.products[y].instalment) + " pm</p>" +
                "                                   <p style='font-size: 12px;font-weight: 600;'>" + offer_data.offers[w].offerDetails.products[y].term + " months</p>" +
                "                               </div>" +
                "                           </div>");
                                            }
                                         $('.datainer').append("</div>" +
                "                   </div>" +
                "               </div>" +
                        "<label style='display: none>'" +
                        "<input class='cbx' type='radio' hidden data-offer='" + offer_data.offers[w].offerDetails.offerID +
                        "' data-id='" + offer_data.offers[w].offerDetails.uniqueID + 
                        "' name='offerRadioBTN' value='" + offer_data.offers[w].offerDetails.uniqueID +
                        "'></label>" +
                "           </div>" +
                "       </div>" +
                "   </div>"); 
            } else {
                for (var z = 0; z < offer_data.offers[w].offerDetails.products.length; z++) {
                    if (offer_data.offers[w].offerDetails.productDescription.toLowerCase().includes("card")) {
                        $('.datainer').append("<div id='box_cc' class='row box_cc' onmouseup='getDetail(this)'>" +
                        "   <div class='col-lg-12 col-md-12 col-sm-12 col-xs-12'>" +
                        "       <div class='blog-card'>" +
                        "           <div class='meta'>" +
                        "               <div class='photo'>" +
                        "                   <div style='font-size: 10px;font-weight: 800;text-align: left;'>" + offer_data.offers[w].offerDetails.productDescription.toUpperCase() + "</div>" +
                        "                       <p style='font-size: 18px;font-weight: 800;position: relative;text-align: left;'>R " + formatAmountToZAR(offer_data.offers[w].offerDetails.products[z].cashToClient) + "</p>" +
                        "                       <p class='card-info faint-text' style = 'font-size: 10px;position: relative;top: -10px;text-align: left;'>" + offer_data.offers[w].offerDetails.products[z].productClassification + "</p>" +
                        "                   </div>" +
                        "                   <ul class='details'></ul>" +
                        "               </div>" +
                        "               <div class='description'>" +
                        "                   <p style='font-size: 12px;color: gray;'>Repayment <span style='font-weight: 600;margin-left: 10px;'>" + offer_data.offers[w].offerDetails.products[z].interestRate + "&#37;</span></p>" +
                        "                   <p style='font-size: 12px;font-weight: 600;'>R " + formatAmountToZAR(offer_data.offers[w].offerDetails.products[z].instalment) + " pm</p>" +
                        "                   <p style='font-size: 12px;font-weight: 600;'>" + offer_data.offers[w].offerDetails.products[z].term + " months</p>" +
                        "               </div>" +
                        "           </div>" +
                        "       </div>" +
                        "<label style='display: none>'" +
                        "<input class='cbx' type='radio' hidden data-offer='" + offer_data.offers[w].offerDetails.offerID +
                        "' data-id='" + offer_data.offers[w].offerDetails.uniqueID + 
                        "' name='offerRadioBTN' value='" + offer_data.offers[w].offerDetails.uniqueID +
                        "'></label>" +
                        "   </div></div>");
                    } else if (offer_data.offers[w].offerDetails.productDescription.toLowerCase().includes("loan")) {
                        $('.datainer').append("<div id='box_lns' class='row box_lns' onmouseup='getDetail(this)'>" +
                        "   <div class='col-lg-12 col-md-12 col-sm-12 col-xs-12'>" +
                        "       <div class='blog-card'>" +
                        "           <div class='meta'>" +
                        "               <div class='photo'>" +
                        "                   <div style='font-size: 10px;font-weight: 800;text-align: left;'>" + offer_data.offers[w].offerDetails.productDescription.toUpperCase() + "</div>" +
                        "                       <p style='font-size: 18px;font-weight: 800;position: relative;text-align: left;'>R " + formatAmountToZAR(offer_data.offers[w].offerDetails.products[z].cashToClient) + "</p>" +
                        "                       <p class='card-info faint-text' style = 'font-size: 10px;position: relative;top: -10px;text-align: left;'>" + offer_data.offers[w].offerDetails.products[z].productClassification + "</p>" +
                        "                   </div>" +
                        "                   <ul class='details'></ul>" +
                        "               </div>" +
                        "               <div class='description'>" +
                        "                   <p style='font-size: 12px;color: gray;'>Repayment <span style='font-weight: 600;margin-left: 10px;'>" + offer_data.offers[w].offerDetails.products[z].interestRate + "&#37;</span></p>" +
                        "                   <p style='font-size: 12px;font-weight: 600;'>R " + formatAmountToZAR(offer_data.offers[w].offerDetails.products[z].instalment) + " pm</p>" +
                        "                   <p style='font-size: 12px;font-weight: 600;'>" + offer_data.offers[w].offerDetails.products[z].term + " months</p>" +
                        "               </div>" +
                        "           </div>" +
                        "       </div>" +
                        "<label style='display: none>'" +
                        "<input class='cbx' type='radio' hidden data-offer='" + offer_data.offers[w].offerDetails.offerID +
                        "' data-id='" + offer_data.offers[w].offerDetails.uniqueID + 
                        "' name='offerRadioBTN' value='" + offer_data.offers[w].offerDetails.uniqueID +
                        "'></label>" +
                        "   </div></div>");
                    }
                }
            }
        };
        $('.body_qq').append("</div>");
  
            /* End of the TBODY section */
            
            instance.initialiseControls();
            
            $(".sw-toolbar").show();
            //$(".sw-toolbar").show().append("<a id='index_offer' class='button primary' style='display: inline-block; float: right;'>Accept offer</a>" ).insertAfter( ".sw-btn-prev" );
            $("#index_offer").css("display", "block");
            $(".loan-offer").css("background", "white");
            
            $(".sw-container").css("overflow", "unset");
            $("#terminate-quick-loan").hide();
            $(".terms_and_conditions").hide();
            //-->embeding data to html - Offer Value
            instance.promote_next_step();
            instance.logic_control();
        },
        this.initialiseControls = function() {
            /* Start */
            const togglerALL = document.getElementById("btnALL");
        	
        	const toggler = document.getElementById("btnCMBS");
        	const toggleBox = document.getElementById("box");
        	
        	const togglerCC = document.getElementById("btnCC");
        	const toggleBox_cc = document.getElementById("box_cc");
        	
        	const togglerLNS = document.getElementById("btnLOANS");
        	const toggleBox_lns = document.getElementById("box_lns");
        	
        	 
        	const isHidden = () => toggleBox.classList.contains("box--hidden");
        	
        	const isHiddenCC = () => toggleBox_cc.classList.contains("box_cc--hidden");
        	
        	const isHiddenLNS = () => toggleBox_lns.classList.contains("box_lns--hidden");
        	
        	toggleBox.addEventListener("transitionend", function () {
        	  if (isHidden()) {
        		toggleBox.style.display = "none";
        	  }
        	});
        	
        	toggleBox_cc.addEventListener("transitionend", function () {
        	  if (isHiddenCC()) {
        		toggleBox_cc.style.display = "none";
        	  }
        	});
        
        	toggleBox_lns.addEventListener("transitionend", function () {
        	  if (isHiddenLNS()) {
        		toggleBox_lns.style.display = "none";
        	  }
        	});
        
        	togglerALL.addEventListener("click", function () {
        	    
        		toggleBox.style.removeProperty("display");
        		setTimeout(() => toggleBox.classList.remove("box--hidden"), 0);
        
        		toggleBox_cc.style.removeProperty("display");
        		setTimeout(() => toggleBox_cc.classList.remove("box_cc--hidden"), 0);
        		
        		toggleBox_lns.style.removeProperty("display");
        		setTimeout(() => toggleBox_lns.classList.remove("box_lns--hidden"), 0);
        		
        		for (var i=0; i< $('.datainer')[0].children.length; i++) {
        		    $('.datainer')[0].children[i].style.removeProperty("display");
        		    var classHandle = $('.datainer')[0].children[i].id + "--hidden";
        		    $('.datainer')[0].children[i].classList.remove(classHandle);
        		}
        		
        	});
        
        	toggler.addEventListener("click", function () {
        	 
        		toggleBox.style.removeProperty("display");
        		setTimeout(() => toggleBox.classList.remove("box--hidden"), 0);
        		
        	    for (var i=0; i< $('.datainer')[0].children.length; i++) {
        	        if ($('.datainer')[0].children[i].id != 'box') {
        	            var namedId = $('.datainer')[0].children[i].id + "--hidden";
        	            $('.datainer')[0].children[i].classList.add(namedId);
        	            $('.datainer')[0].children[i].style.display = "none";
        	            cmbOffers++;
        	        }
        	    }
        	    
        	    this.textContent  + ' (' + cmbOffers + ')';

        	});
        
        	togglerLNS.addEventListener("click", function () {
        	   
        		toggleBox_lns.style.removeProperty("display");
        		setTimeout(() => toggleBox_lns.classList.remove("box_lns--hidden"), 0);
        		
        	    for (var i=0; i< $('.datainer')[0].children.length; i++) {
        	        if ($('.datainer')[0].children[i].id != 'box_lns') {
        	            var namedId = $('.datainer')[0].children[i].id + "--hidden";
        	            $('.datainer')[0].children[i].classList.add(namedId);
        	            $('.datainer')[0].children[i].style.display = "none";
        	            lnsOffers++;
        	        }
        	    }
        	   this.textContent  + ' (' + lnsOffers + ')';

        	});
            
            
        	togglerCC.addEventListener("click", function () {
        	  
        		toggleBox_cc.style.removeProperty("display");
        		setTimeout(() => toggleBox_cc.classList.remove("box_cc--hidden"), 0);
        		
        	    for (var i=0; i< $('.datainer')[0].children.length; i++) {
        	        if ($('.datainer')[0].children[i].id != 'box_cc') {
        	            var namedId = $('.datainer')[0].children[i].id + "--hidden";
        	            $('.datainer')[0].children[i].classList.add(namedId);
        	            $('.datainer')[0].children[i].style.display = "none";
        	            ccOffers++;
        	        }
        	    }
        	    this.textContent + ' (' + ccOffers + ')';
        	});
            /* End */
        }
        this.load_rejection_offer = function (responseValues) {
            $(".quick-success").css("display", "none");
            $("#quick-drop-off").css("background-color", "rgb(0, 43, 96)")
            $("#quick-drop-off").show();
            $(".index_ImproveOffers").css("display", "none");
            
            
            
               $("body").css("pointer-events","none");
                $("body").css("background-color","rgba(0, 0, 0, 0.4)");
                $("#quick-drop-off").css("pointer-events","auto");
                $(".header-container").css("background-color","inherit");
                $(".new-navbar-ab").css("opacity","0.10");
            
            $("#terminate-process").hide();
            $("#terminate-to-call-me").hide();
            $("#terminate-offline").hide();
            $(".call-me-back-message").hide();

            $("#index_offer").css("display", "none");
            $(".acceptTandC").css("display", "none");
            
            /* DS-REJECTS - to be displayed at No, thank you => .ok-with-decline function*/
            $(".terminate-reason").html("");
            
            for (var i = 0; i < responseValues.length; i++) {
                $(".terminate-reason").append($("<br><span id='reasonDesc'><strong>" +
                    responseValues[i].reasonCode + "</strong></span><br><br><span id='reasonDesc'>" +
                    responseValues[i].reasonCodeDescription + " </span>")
                );
            }
            
            $(".survey-ds-title").html("");
            notifications = $("<p class='rejection-ds-message'>Thank you, " + qqSession.clientName + ".</p>");
                
            $(".survey-ds-title").append(notifications);
            $(".survey-ds-text2").html("");
            $(".survey-ds-text2").html("<br><p class='survey-text2'>We need more information <br>to continue with your application.</p>")
           
            $(".btn-toolbar").hide();
            $(".frontpage").css("background-color", "rgb(152 147 147)");
            
        },
        this.terminate_process = function (type) {
            $("#quick-drop-off").show();
            if (type === "process") {
                $("#terminate-process").show();
		        $("#smartwizard").text("");

                $("#terminate-to-call-me").hide();
                $(".call-me-back-message").hide();
                $("#terminate-offline").hide();
            } else if (type === "title") {
                $("#terminate-to-call-me").hide();
                $("#terminate-offline").hide();
                $("#terminate_process").hide();
                $(".call-me-back-message").hide();

                $(".terminate-reason").html("");

                notifications = $("<br><span id='reasonDesc'><strong>Wrong title selected</strong></span><br><br><span id='reasonDesc'>Please select the correct title that reflect your gender.</span>");
                $(".terminate-reason").append(notifications);
                $(".terminate-reason").show();

            } else if (type === "call_back") {
                if (!$.isEmptyObject($("#idNumber").val())) {
                    $("#SAIDInput").val($("#idNumber").val());
                }
                if (!$.isEmptyObject($("#call-number"))) {
                    $("#CellPhoneInput").val($("#telephoneNumber").val());
                }

                if (!$.isEmptyObject($("#firstName").val())) {
                    $("#FirstNameInput").val($("#firstName").val());
                }
                if (!$.isEmptyObject($("#surname"))) {
                    $("#LastNameInput").val($("#surname").val());
                }
                if (!$.isEmptyObject($("#email"))) {
                    $("#EmailInput").val($("#email").val());
                }

                $("#form_fields").css("display", "block");
                $("#terminate-to-call-me").show();
                $("#terminate-process").hide();
                $(".call-me-back-message").hide();
                $("#terminate-offline").hide();

                $(".sw-btn-prev").hide();
                $(".sw-btn-next").hide();

            } else if (type === "offline") {
                $("#terminate-offline").show();

                $("#terminate-to-call-me").hide();
                $("#terminate-offline").hide();
                $(".call-me-back-message").hide();

                $(".sw-btn-prev").hide();
                $(".sw-btn-next").hide();

            } else if ((type !== null) && (type.resultCode === 400)) {
                $("#terminate-to-call-me").hide();
                $("#terminate-offline").hide();
                $("#terminate_process").hide();
                $(".call-me-back-message").hide();

                $(".terminate-reason").html("");
                var htmlResultValue = "";
        		if (type.resultDescription === "no session data") {
        			htmlResultValue = $("<br><span id='reasonDesc'>Your OTP has expired. Please click on Resend OTP.</span>");
        		} else {
        			htmlResultValue = $("<br><span id='reasonDesc'>" + type.resultDescription + "</span>");
        		}
				
                var notifications = null;
                if (type.notifications !== null) {
                    if (type.notifications.length > 0) {
                        for (var i = 0; i < type.notifications.length; i++) {
                            if (type.notifications[i].field !== null) {
                                if (type.notifications[i].field.length > 0) {
                                    notifications = $("<br><span>" + type.notifications[i].message + ": " + type.notifications[i].field + "</span>");
                                }
                            } else {
                                notifications = $("<br><span>" + type.notifications[i].message + "</span>");
                            }
                            $(".terminate-reason").append(notifications);
                        }
                    }
                }
                $(".terminate-reason").append(htmlResultValue);
                $(".terminate-reason").show();

            } else if ((type !== null) && ((type.resultCode === 502) || (type.resultCode === 500))) {
                $("#terminate-to-call-me").hide();
                $("#terminate-offline").hide();
                $("#terminate_process").hide();
                $(".call-me-back-message").hide();
                
                $(".terminate-reason").html("");

               notifications = $("<br><span id='reasonDesc'>Unable to complete your request please contact the call center on 0860 333 004 or leave us your details and we will call you back.</span>"); $(".terminate-reason").append(notifications);
                $(".terminate-reason").show();

            } else if ((type !== null) && ((type.resultCode === 502) || (type.resultCode === 500))) {
                $("#terminate-to-call-me").hide();
                $("#terminate-offline").hide();
                $("#terminate_process").hide();
                $(".call-me-back-message").hide();
                
                $(".terminate-reason").html("");

               notifications = $("<br><span id='reasonDesc'>Unable to complete your request please contact the call center on 0860 333 004 or leave us your details and we will call you back.</span>"); $(".terminate-reason").append(notifications);
                $(".terminate-reason").show();

            } else if ((type !== null) && (type === "The remote server returned an error: (504) Gateway Timeout.")) {
                if (type.length > 0) {
                    $("#terminate-to-call-me").show();
                    $("#terminate-offline").hide();
                    $("#terminate_process").hide();

                    $(".terminate-reason").html("");
                    $(".call-me-back-message").html("");

                    notifications = $("<br><span id='reasonDesc'>Unable to complete your request please contact the call center on 0860 333 004 or leave us your details and we will call you back </span> ");
                    $(".call-me-back-message").append(notifications);
                    $("#form_fields").css("display", "block");

                    $("#SAIDInput").val($("#idNumber").val());
                    $("#CellPhoneInput").val($("#telephoneNumber").val());
                    $("#FirstNameInput").val($("#firstName").val());
                    $("#LastNameInput").val($("#surname").val());
                    $("#EmailInput").val($("#email").val());


                    $(".call-me-back-message").show();
                }

            } else {
                var result = JSON.parse(type);
                $("#terminate-to-call-me").hide();
                $("#terminate-offline").hide();
                $("#terminate_process").hide();
                $(".call-me-back-message").hide();

                $(".terminate-reason").html("");
                if (typeof (result) !== 'undefined') {
                     notifications = $("<br><span id='reasonDesc'>Unable to complete your request please contact the call center on 0860 333 004 or leave us your details and we will call you back</span> ");    } 
            	else {
                    notifications = $("<br><span id='reasonDesc'>An error response could not be formulated</span>");
                }

                $(".terminate-reason").append(notifications);
                $(".terminate-reason").show();
                // $("#quick-drop-off").show();
            }
        },
        this.process_resume = function () {
            $(".call-me-back-message").hide();
            $("#terminate-process").hide();
            $("#terminate-to-call-me").hide();
            $(".sw-btn-prev").show();
            $(".sw-btn-next").show();

        },
        this.promote_next_step = function () {
            validMove = true;
            $('#smartwizard').smartWizard("next");
        },
        this.logic_control = function () {

            //-->custom checks
            if ($('.nav-item.active a')[0].hash === "#step-2") {
                $('.quick-parallelogram').hide();
                $('.quick-parallelogram').hide();
                $(".sw-btn-prev").show();
            } else if ($('.nav-item.active a')[0].hash === "#step-4") {
                $('.sw-btn-next').hide();

            }
        };
};

function formatAmountToZAR(amount) {
  if (isNaN(amount)) {
    return "Invalid amount";
  }

  const formattedAmount = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return formattedAmount.replace("R", "");
}

/*
function getContextualQuestionnaire() {
    var result = "";
    $.ajax({
        url: '/umbraco/surface/QuickLoans/GetQuestionnaireForID',  
        type: "POST",
        async: false,  
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ number: qqSession.clientIdnumber }),
        success: function (data, x, y) {
            if (x === "success") {
                 qqSession.iaURL = JSON.parse(data.data).data.questionnaireUrl;
                 result = qqSession.iaURL;
                 
            } else {
                return result;
            }
        },
        error: function (error) {
            return result;
        }
    });
   return result;
}
*/
function IsValidID(idNumber, title) {
    var gender = parseInt(idNumber.substring(6, 10), 10) > 5000 ? "M" : "F";

    if (gender.toLowerCase() === "f") {
        if ((title.toLowerCase() === "mrs") || (title.toLowerCase() === "ms") || (title.toLowerCase() === "miss")) {
            return true;
        }
    } else if (gender.toLowerCase() === "m") {
        return true;
    }
    else {
        return false;
    }
}
/*
function saveIAurl() {
    var url = '/umbraco/surface/QuickLoans/saveIAurl';
    var postdata = {
        "PhoneNumber": $("#telephoneNumber").val(),
        "isGeneratedURL": qqSession.iaURL,
    };
    $.ajax({
        url: url,
        type: "POST",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ form: postdata }),
        success: function () { 
            return;
        },
        error: function (error) {
            return;
        }
    });
}
function beginIA() {
    var _urlValue = "";
    _urlValue = '/umbraco/surface/QuickLoans/beginIA';
    var postdata = {
        "PhoneNumber": $("#telephoneNumber").val(),
    };
    $.ajax({
        url: _urlValue,
        type: "POST",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ form: postdata }),
        success: function () { // data
           return;
        },
        error: function (error) {
            return;
        }
    });
}
*/
function requestOTP(applicationId) {

    $('.pause-form').show();
    post_data = resendValidate;
    var request_config = new quick_quote_steps();
    var token = $('input[name="__RequestVerificationToken"]')[0].value;
    
    $(".otpMessage")[0].innerText = "A new OTP has been sent to your device";

    $.ajax({
        headers: { '__RequestVerificationToken': token },
        url: '/umbraco/surface/QuickLoans/ValidateClient',
        type: "POST",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ form: post_data }),
        success: function (data) {
            var jsonValue = data.data;
            if (typeof (jsonValue) !== "undefined") {
                if ((jsonValue.includes('500')) || (jsonValue.includes('502')) || (jsonValue.includes("504")) || (jsonValue.includes("504"))) {
                    console.log("Validate Client returned results - Error Network interrupted (500, 502, 504 error reported). DONE!");
                    $('.pause-form').hide();
                    request_config.terminate_process(jsonValue);
                    return;
                }
            }
            var results = JSON.parse(data.data).results;

            if (results.serviceHeaderResponse.resultCode === 200) {

                qqSession.otpSession = results.securedServiceResponse.decisionRequestIdentifier;
                $('.pause-form').hide();
            } else if (results.serviceHeaderResponse.resultCode === 400) {
                $('.pause-form').hide();
                request_config.terminate_process(results.serviceHeaderResponse);
            } else if (results.serviceHeaderResponse.resultCode === 502) {
                $('.pause-form').hide();
                request_config.terminate_process(results.serviceHeaderResponse);
            } else {
                $('.pause-form').hide();
                request_config.terminate_process("process");
            }
        },
        error: function (error) {
            $('.pause-form').hide();
            request_config.terminate_process("process");
        }
    });

}

function getEmploymentType() {
    var _urlValue = "";
    _urlValue = '/umbraco/surface/QuickLoans/GetEmploymentTypes';

    $.ajax({
        url: _urlValue,
        type: "GET",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (data) {
            var results = data.results;
            if (results.serviceHeaderResponse.resultCode === 200) {
                for (var i = 0; i < results.parameters.length; i++) {
                    $("#employeeType").append("<option value=" + results.parameters[i].code + ">" + results.parameters[i].description + "</option >");
                }
                // getOccupationForEmploymentType(results.parameters[0].description);
            }
        },
        error: function (error) {

        }
    });
}

function getOccupationForEmploymentType(_occType) {

    if (_occType !== null) {
        var _urlValue = "";
        _urlValue = '/umbraco/surface/QuickLoans/GetOccupationTypes/?occType=' + _occType;

        $.ajax({
            url: _urlValue,
            type: "GET",
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                if (data !== null) {
                    var results = data.results;
                    if (results.serviceHeaderResponse.resultCode === 200) {
                        $("#occupationStatus").html("");
			// $("#occupationStatus").append("<option value=''>Select occupation</option >");
                        for (var i = 0; i < results.parameters.length; i++) {
                            $("#occupationStatus").append("<option value=" + results.parameters[i].code + ">" + results.parameters[i].description + "</option >");
                        }
                    }
                }
            },
            error: function (error) {
                alert("Error occured");
            }
        });
    } else {
        // alert the occType is null
    }

}

function bankSearch(bankNameString) {

    var _urlValue = "";
    _urlValue = '/umbraco/surface/QuickLoans/SearchBank/?_bankName=' + bankNameString;

    $.ajax({
        url: _urlValue,
        type: "GET",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (data) {
            var results = data.results;

            if (results.serviceHeaderResponse.resultCode === 200) {
                $(".bank-not-found").css("display", "none");
                handleBankResults(results, bankNameString);
                // employer_selection(results);
            } else {
                $(".bank-not-found").val(results.serviceHeaderResponse.resultDescription);
                $(".bank-not-found").css("display", "block");
            }
        },
        error: function (error) {

        }
    });

}

function handleEmploymentTypeResults(response) {
    if (null === response) {
        alert("There was no response from the server");
    } else {
        $(".bank-selector").modal("hide");
    }
}

function BindControls(response) {
	
	var banks = [];
        var resultRows = response.universalBankBranches.map(function (bank) {
            banks.push({label: bank.bankName, value: bank.bankCode, branch: bank.branchName, branchCode: bank.branchCode, bankId: bank.bankID } ); 
        });
        var resultRows = response.bankBranches.map(function (bank) {
            banks.push({label: bank.bankName + ", " + bank.branchName, value: bank.bankCode, branch: bank.branchName, branchCode: bank.branchCode, bankId: bank.bankID } );  
        });
	_banks = banks;
            $('#tbBanks').autocomplete({
                source: banks,
                minLength: 0,
                scroll: true,
		open: function(e) {
       		   valid = false;
     		},
  		select: function(event, ui) {
        	      valid = true;
		      event.preventDefault();

    			$(".bank-group")[0].children[2].innerText = "";
    			if ($(".bank-group")[0].children[1].children[2].classList.contains("glyphicon-remove")) {
        			$(".bank-group")[0].children[1].children[2].classList.remove("glyphicon-remove");
        			$(".bank-group")[0].children[1].children[2].classList.add("glyphicon-ok");
   			 }
    			if ($(".bank-group")[0].classList.contains("has-error")) {
        			$(".bank-group")[0].classList.remove("has-error");
        			$(".bank-group")[0].classList.add("has-success");
    			}
            		$("#bankReference").val(ui.item.value);
            		bankRef = ui.item.value;
            		$("#bankBranch").val(ui.item.branchCode);
            		bankBranch = ui.item.branchCode;
            		$("#tbBanks").val(ui.item.label);
 		 },
     		close: function(e){
        	  if (!valid) $("#tbBanks").val('');
	     	},
            }).focus(function() {
                $(this).autocomplete("search", "");
            });
        }

function handleBankResults(response, searchedBank) {
   
    if (null === response) {
        alert("There was no response from the server");
    } else {
	    BindControls(response);
    }
}

function handleEmployerResults(response) {
	
    if (null === response) {
        alert("There was no response from the server");
    } else {
        BindEmployerControls(response);
    }


}

function clearBankSearchResults() {
    $('#bankSearchResults tbody').empty();
}

function clearSearchResults() {
    $('#employerSearchResults tbody').empty();
}

function selectBank(bankName, bankRef, bankBranch) {
    $("#bankSearchString").val(bankName);
    $("#bankReference").val(bankRef);
    $("#bankBranch").val(bankBranch);
    $("#bankSearchModal").modal("hide");

    $(".bank-group")[0].children[2].innerText = "";
    if ($(".bank-group")[0].children[1].children[1].classList.contains("glyphicon-remove")) {
        $(".bank-group")[0].children[1].children[1].classList.remove("glyphicon-remove");
        $(".bank-group")[0].children[1].children[1].classList.add("glyphicon-ok");
    }

}
$("#end-date").on("change", function () {
    if ($(".enddate-group")[0].classList.contains("has-error")) {
        $(".enddate-group")[0].classList.remove("has-error");
        $(".enddate-group")[0].classList.add("has-success");
    }
    $(".enddate-group")[0].children[4].innerText = "";
    if ($(".enddate-group")[0].children[2].classList.contains("glyphicon-remove")) {
        $(".enddate-group")[0].children[2].classList.remove("glyphicon-remove");
        $(".enddate-group")[0].children[2].classList.add("glyphicon-ok");
    }

});
$("#start-date").on("change", function () {
    if ($(".startdate-group")[0].classList.contains("has-error")) {
        $(".startdate-group")[0].classList.remove("has-error");
        $(".startdate-group")[0].classList.add("has-success");
    }
    $(".startdate-group")[0].children[4].innerText = "";
    if ($(".startdate-group")[0].children[2].classList.contains("glyphicon-remove")) {
        $(".startdate-group")[0].children[2].classList.remove("glyphicon-remove");
        $(".startdate-group")[0].children[2].classList.add("glyphicon-ok");
    }

});



function selectEmployer(employer, employerRef) {
    $("#quickLoanEmployerSearch").val(employer);
    $("#employerReference").val(employerRef);

	empName = employer;
	empRef = employerRef;

    $("#employerSearchModal").modal("hide");

    $(".employer-group")[0].children[2].innerText = "";
    if ($(".employer-group")[0].children[1].children[1].classList.contains("glyphicon-remove")) {
        $(".employer-group")[0].children[1].children[1].classList.remove("glyphicon-remove")
        $(".employer-group")[0].children[1].children[1].classList.add("glyphicon-ok")
    }


}

function employer_selection(e) {
    //-->embed selection into input

    var embed_data = JSON.parse(e.target.dataset.embed);
    $("#employerName").val(embed_data.name);
    $("#employerReference").val(embed_data.reference);

    //-->embed same data set to input
    $("#employerName").attr("embed-selection", e.target.dataset.embed);

    //-->clear and close drop down
    //$("#employer-search").hide();
}

function bank_selection(e) {
    //-->embed selection into input
    var embed_data = JSON.parse(e.target.dataset.embed);
    $("#bank").val(embed_data.bankName);
    $("#bankCode").val(embed_data.bankCode);
    $("#branchCode").val(embed_data.branchCode);

    //-->embed same data set to input
    $("#bank").attr("embed-selection", e.target.dataset.embed);
}

function addCallBackControl() {
    var call_me_button = "<div id='terminate-quick-loan'><a  id='call_me_back' class='button secondary'>Call me back</a><span></span></div>";
    
    $(".mr-2").append(call_me_button);

    $("#childMaintenanceAmountDiv").hide();
    $("#generic").addClass("expense-modal");
    $("#modal-title").text("Monthly Living Expenses");

    //-->preventing keyboard left,right 
    $(document).off('keypress');
    $(document).off('keyup');

    var cancelBtn = null; 
    var callMeBtn = null;
    for(var i=0; i< $(".mr-2")[0].children.length; i++) {
        if ($(".mr-2")[0].children[i].className === 'sw-btn-cancel') {
            cancelBtn = $(".mr-2")[0].children[i];
        }
        if ($(".mr-2")[0].children[i].id === 'terminate-quick-loan') {
            callMeBtn = $(".mr-2")[0].children[i];
        }
    }
    if ((callMeBtn !== null) && (cancelBtn !== null)) {
        callMeBtn.parentNode.insertBefore(callMeBtn, cancelBtn);
    }
    
    $("#call_me_back").click(function () {
        var request_config = new quick_quote_steps();
        request_config.terminate_process("call_back");

    });
}

function validateGrossNet() {
    var netValue = $("#NetIncomeInput").val();
    var grossValue = $("#GrossSalaryBeforeTaxInput").val();

    if ((parseInt(netValue) > 0) && (parseInt(grossValue) > 0)) {
        if (parseInt(netValue) > parseInt(grossValue)) {
            $(".invalid-gross-feedback").show();
            return false;
        } else {
            $(".invalid-gross-feedback").hide();
            return true;
        }
    }
}

function validateEmployer() {
    var employerValue = $(".searchEmployer").val();

    if (employerValue.length === 0) {
          $(".invalid-employer-feedback").show();
          return false;
    } else {
         $(".invalid-employer-feedback").hide();
         return true;
    }
}

function initSelection() {
    
    for (var i=0; i<$('.datainer')[0].children.length; i++) {
        if (typeof($('.datainer')[0].children[i].children[0]) != "undefined") {
            if (typeof($('.datainer')[0].children[i].children[0].children[0]) != "undefined") {
                if (typeof($('.datainer')[0].children[i].children[0].children[0].children[0]) != "undefined") {
                    $('.datainer')[0].children[i].children[0].children[0].children[0].style.color = "unset";
                    $('.datainer')[0].children[i].children[0].children[0].children[0].style.background = "unset";
                }  
            } 
        }

    }
    // $('#cmb-card')[0].style.background ='#ebebeb'; // '#ebebeb !important';
    $('#cmb-card')[0].style.color = "unset";
    
    $('.box')[0].children[0].children[0].children[0].children[0].children[0].children[1].children[0].style.color = "unset";
    $('.box')[0].children[0].children[0].children[0].children[0].children[0].children[1].children[0].style.background = "unset";
    
    $('.box')[0].children[0].children[0].children[0].children[0].children[0].children[2].children[0].style.color = "unset";
    $('.box')[0].children[0].children[0].children[0].children[0].children[0].children[2].children[0].style.background = "unset";
    
    return true;
}
function restoreBackground() {
    $('#cmb-card')[0].style.background='#ebebeb'; // '#ebebeb !important';
}

function getDetail(e) {
    
    if (initSelection()) {
        
        restoreBackground();
        
        if (e.nextElementSibling !== null) {
            if (e.nextElementSibling.classList[0].toString() == 'cbx') {
                stepData.offerId = e.nextElementSibling.dataset.offer;
                stepData.uniqueId = e.nextElementSibling.dataset.id;
            
                e.children[0].children[0].children[0].children[0].children[0].children[1].children[0].style.color = "white";
                e.children[0].children[0].children[0].children[0].children[0].children[1].children[0].style.background = "linear-gradient(90deg, #c0c0c7, #ebebeb)";
                
                e.children[0].children[0].children[0].children[0].children[0].children[2].children[0].style.color = "white";
                e.children[0].children[0].children[0].children[0].children[0].children[2].children[0].style.background = "linear-gradient(90deg, #c0c0c7, #ebebeb)";
                
                $('#cmb-card')[0].style.color = "white";
                $('#cmb-card')[0].style.background = "linear-gradient(90deg, #c0c0c7, #ebebeb)";
                
            } else if (e.childNodes[2].classList[0].toString() == 'cbx') {
                stepData.offerId = e.childNodes[2].dataset.offer;
                stepData.uniqueId = e.childNodes[2].dataset.id;
            
                e.childNodes[1].childNodes[1].childNodes[1].style.color = "white";
                e.childNodes[1].childNodes[1].childNodes[1].style.background = "linear-gradient(90deg, #c0c0c7, #ebebeb)";
    
            }
        } else if (e.children[1].classList[0].toString() == 'cbx') {
            debugger;
            stepData.offerId = e.children[1].dataset.offer;
            stepData.uniqueId = e.children[1].dataset.id;
            
            e.children[0].children[0].children[0].style.color = "white";
            e.children[0].children[0].children[0].style.background = "linear-gradient(90deg, #c0c0c7, #ebebeb)";
        }
        

        $(".index_accept").css("display", "inline-block").css("float", "right");
        $(".sw-btn-next").css("display", "none"); 
    }
}

$("#terms").change(function () {
    if ($(this).is(':checked')) {
        $("#index_offer").css("cursor", "pointer");
        $("#credit_card_offer").css("cursor", "pointer");
        $("#button1").css("cursor", "pointer");
        $("#button2").css("cursor", "pointer");
    } else {
        $("#index_offer").css("cursor", "default");
        $("#credit_card_offer").css("cursor", "default");
        $("#button1").css("cursor", "default");
        $("#button2").css("cursor", "default");
    }
});

/*
$(".IA-begin").click(function() {
   $(".pause-form").show();
   $("#terminate-IA").css("margin-top", "0px");
   $("#survey-tab").hide();
   var output = getContextualQuestionnaire();
    
    $(".survey-questionnaire").attr('src', output);
    $(".pause-form").hide();
});

$(".IA-begin-ds").click(function() {
    $(".pause-form").show();
    $("#survey-tab-ds").hide();
    var output = getContextualQuestionnaire();
    
    $(".survey-questionnaire-ds").attr('src', output);
    $(".pause-form").hide();
});
*/

$(".ok-with-decline").click(function () {
    $(".terminate-reason").show();
});

/*
$(".ia-close").click(function () {
    $(".frontpage").css("background-color", "unset");
    $("#form-preloader").hide();
    $("#quick-drop-off").hide();
    $(".ia-controls").hide();
    //take the user to the end of the QQ step
    $("#step-4").hide();
    $("#smartwizard")[0].children[0].children[3].children[0].style.color = "white"; // step text to blend in with the background

    $("body").css("pointer-events","auto");
    $(".new-navbar-ab").css("opacity","1");
    $("#step-5").show();

    $("#smartwizard")[0].children[1].children[3].style.display = "none";
    $("#smartwizard")[0].children[1].children[4].style.display = "block";
});
*/

$(".close").click(function () {
    
    
        $('#desk-view-blue').css(
        {
            'cssText': 'display: none !important'
        }
       );
    $(".frontpage").css("background-color", "unset");
    if ($("#iframeHolder-ds").is(":visible") == true) {
        
        $("#smartwizard")[0].children[1].children[3].style.display = "none";
        $("#smartwizard")[0].children[1].children[4].style.display = "block";
    $("body").css("pointer-events","auto");
        $(".frontpage").css("background-color", "unset");
        $("#quick-drop-off").hide();
        location.reload();
        return;
    }
    location.reload();
    $("#form-preloader").hide();
    $("#quick-drop-off").hide();
    $(".sw-btn-next").show();
    $(".sw-btn-prev").show();

    if ($("#reasonDesc")[0].innerText.includes("You cannot apply for another credit application while")) {
        location.reload();
    }

});



$(".index_offer").click(function () {
    if ($("#terms").is(':checked')) {

        var request_config = new quick_quote_steps();
        stepData.offerId = loanStepOffer;
        stepData.uniqueId = loanUniqueId;

        request_config.frmStep_5();
    }
});

$("#button2").on("click", function () {
    if ($("#terms").is(':checked')) {
        var request_config = new quick_quote_steps();
        stepData.offerId = $("#button2")[0].className.split(" ")[2];
        stepData.uniqueId = $("#button2")[0].className.split(" ")[3];

        request_config.frmStep_5();
    }
});

$("#button1").click(function () {
    if ($("#terms").is(':checked')) {
        var request_config = new quick_quote_steps();

        stepData.offerId = $("#button1")[0].className.split(" ")[2];
        stepData.uniqueId = $("#button1")[0].className.split(" ")[3];

        request_config.frmStep_5();
    }
});

$("#credit_card_offer").click(function () {
    if ($("#terms").is(':checked')) {
        var request_config = new quick_quote_steps();
        stepData.offerId = creditStepOffer;
        stepData.uniqueId = creditUnique;

        request_config.frmStep_5();
    }
});

$(document).ready(function () {
     bankSearch();

    $(".survey-questionnaire").on( 'load', function() {
        $(".pause-form").hide();
    });

    $(".survey-questionnaire-ds").on( 'load', function() {
        $(".pause-form").hide();
    });


    // Test new Empls $('#tbEmployer').val(), $('#employeeType').val()
    $('#tbEmployer').autocomplete({
        source: function (request, response) {
            $.ajax({
                async: true,
                type: "GET",
                contentType: "application/json; charset=utf-8",
                url: '/umbraco/surface/QuickLoans/SearchEmployer?employerName=' + $('#tbEmployer').val() + '&employeeType=' + $('#employeeType').val(),
                dataType: "json",
                success: function (data) {
                var results = data.results;
                    if (results .employee != null) {
                        $(".employer-not-found").text("");
                        $(".employerCheck").text("");
                        $(".employerCheck").css("display", "none");
                        $(".employer-not-found").css("display", "none");
                        $('#chkUnknownEmployer').css("display", "none");
                        var employers = [];
                        var resultRows = results.employee.map(function (emp) {
                            employers.push({ label: emp.employerName, value: emp.reference });
                        });

          response($.map(employers, function(item) {
            return {
              label: item.label,
              value: item.value
            }
          }));
         }
         else{
             
             $(".employer-not-found").text("I can't find my employer");
             $(".employer-not-found").css("display", "block");
             $(".employerCheck").css("display", "none");
             $('#chkUnknownEmployer').css("display", "block");
	     $(".employer-group")[0].classList.add("has-error");
             $(".employer-group")[0].classList.remove("has-success");
             $(".employer-group")[0].children[1].children[2].classList.add("glyphicon-remove");
             $(".employer-group")[0].children[1].children[2].classList.remove("glyphicon-ok");
         }
		},
		error: function(e) {

		}
	});
	},
	minLength: 3,
        scroll: true,
        open: function (e) {
            valid = false;
        },
        select: function (event, ui) {
             valid = true;
             event.preventDefault();
             $(".employer-group")[0].children[2].innerText = "";
             if ($(".employer-group")[0].children[1].children[2].classList.contains("glyphicon-remove")) {
                   $(".employer-group")[0].children[1].children[2].classList.remove("glyphicon-remove");
                   $(".employer-group")[0].children[1].children[2].classList.add("glyphicon-ok");
             }
             if ($(".employer-group")[0].classList.contains("has-error")) {
                   $(".employer-group")[0].classList.remove("has-error");
                   $(".employer-group")[0].classList.add("has-success");
              }
            	empName = ui.item.label;
            	empRef = ui.item.value;
               $("#tbEmployer").val(ui.item.label);
               $('#chkUnknownEmployer').css('display','none');
         },
         close: function (e) {
              if (!valid) $("#tbEmployer").val('');
	     // $('#chkUnknownEmployer').css('display','block');
         } 
});
//End Test new Empls

     $('#livingExpense').val('');
    // Step show event
    $("#smartwizard").on("showStep", function (e, anchorObject, stepNumber, stepDirection, stepPosition) {
        //alert("You are on step "+stepNumber+" now");
        if (stepPosition === 'first') {
            $("#prev-btn").addClass('disabled');
        } else if (stepPosition === 'final') {
            $("#next-btn").addClass('disabled');
        } else {
            $("#prev-btn").removeClass('disabled');
            $("#next-btn").removeClass('disabled');
        }
    });



    var request_config = new quick_quote_steps();

    // Smart Wizard
    $('#smartwizard').smartWizard({
        selected: 0,
        theme: 'arrows',
        transitionEffect: 'fade',
        showStepURLhash: false,
        anchorSettings: {
            anchorClickable: true, // Enable/Disable anchor navigation
            enableAllAnchors: false, // Activates all anchors clickable all times
            markDoneStep: true, // Add done css
            markAllPreviousStepsAsDone: true, // When a step selected by url hash, all previous steps are marked done
            removeDoneStepOnNavigateBack: false, // While navigate back done step after active step will be cleared
            enableAnchorOnDoneStep: true // Enable/Disable the done steps navigation
        }
    });

    $("#smartwizard").on("leaveStep", function (e, anchorObject, stepNumber, stepDirection) {
        var elmForm = $("#form-step-" + stepNumber);
        // stepDirection === 'forward' :- this condition allows to do the form validation
        // only on forward navigation, that makes easy navigation on backwards still do the validation when going next
        if (stepDirection === 'forward' && elmForm) {

        }

        if (validMove) {
            validMove = false;
            return true;
        }

        return false;
    });

/*
    $(".index_ImproveOffers").on("click", function () {

        //remove the normal close and use the ia-close
        $(".close").hide();
        $(".ia-close").show();
        
        $(".survey-tab").hide();
        
        $("body").css("pointer-events","none");
        $("body").css("background-color","rgba(0, 0, 0, 0.4)");
        $("#quick-drop-off").css("pointer-events","auto");
        $(".header-container").css("background-color","inherit");
        $(".new-navbar-ab").css("opacity","0.10");
        
        $("#quick-drop-off").show();
        $("#terminate-IA").css("margin-top", "90px");
        $("#terminate-IA").css("display", "block");
        $("#ds-terminate-IA").css("display", "none");
        $("#terminate-offline").hide();
        $("#GetYourOffer").hide();
        $(".btn-toolbar").hide();
        $(".frontpage").css("background-color", "rgb(152 147 147)");
        
        request_config.logBeginIA();
    });
*/
    $("#index_acceptId").on("click", function () {
        if ((stepData.offerId > 0) && (stepData.uniqueId > 0)) {
            var request_config = new quick_quote_steps();
            request_config.frmStep_5();
        }
    });

    $(".sw-btn-cancel").on("click", function () {
        // Navigate previous
        $("#terminate-to-call-me").show();
        // $('#smartwizard').smartWizard("reset");
        window.location.href = "/en/home";
        return true;
    });

    //-->Showing expense dialog
    $("#livingExpense").on("focus", function () {
        $('#generic').modal('show');
    });

    //-->closng expense dialog
    $("#quick-save").on("click", function () {

	var expense = parseInt($('#quick-total').text().replace("R ", ""));

	if (expense > 0) {
	    $("#para").css("display", "none");
            $('#livingExpense').val(expense);

    if ($(".livingexpense-group")[0].classList.contains("has-error")) {
        $(".livingexpense-group")[0].classList.remove("has-error");
        $(".livingexpense-group")[0].classList.add("has-success");
    }
    $(".livingexpense-group")[0].children[4].innerText = "";
    if ($(".livingexpense-group")[0].children[2].classList.contains("glyphicon-remove")) {
        $(".livingexpense-group")[0].children[2].classList.remove("glyphicon-remove");
        $(".livingexpense-group")[0].children[2].classList.add("glyphicon-ok");
    }

            $('#generic').modal('hide');
        } else {
	    $('#livingExpense').val('');
            $("#para").css("display", "block");
        }

    });

    //-->accepting offer
    $("#resend-otp").on("click", function () {
        request_config.resend_otp();
    });

    // onclick can't find employer
    $('#employerNotFound').on('click', function () {
        var employer = "UNKNOWN", employerRef = "UNKNOWN";
        selectEmployer(employer, employerRef);
    });

    $("#employerSearchButton").on("click", function () {
        employerSearch($('#employerSearchName').val(), $('#employeeType').val());
    });

    $("#quick-loan-bank-search-button").on("click", function () {
        // bankSearch();
    });

    $("#employerSearchCancel").on("click", function () {
        clearSearchResults();
    });

    $("#bankSearchButton").on("click", function () {
        bankSearch($("#bankSearchName").val());
    });

    $("#bankNotFound").on("click", function () {
        $('.bankNotOnList').css("display", "blocK");
    });

    $("#bankNotOnListCallMeBackRather").on("click", function () {
        var request_config = new quick_quote_steps();
        request_config.terminate_process("call_back");
    });

    $("#bankResultCancel").on("click", function () {
        clearBankSearchResults();
    });

    $('.sw-btn-prev', this.main).on("click", function (e) {
        e.preventDefault();

        $('#smartwizard').smartWizard("reset");
        addCallBackControl();

    });

    $("#ChildMaintenanceInput").change(function () {

        if ($("#ChildMaintenanceInput").find("option:selected").text().toUpperCase() === 'YES') {
            $("#childMaintenanceAmountDiv").show();
            $("#ChildMaintenanceExpensesInput").focus();
        }
        else {
            $("#childMaintenanceAmountDiv").hide();
        }
    });

    $("#employeeType").change(function () {
        getOccupationForEmploymentType($("#employeeType option:selected").text());
       
    });

    $("#occupationStatus").change(function () {
        if ($("#occupationStatus option:selected").val() === 'PAR') {
            $("#emp-end-date").show();
        } else if ($("#occupationStatus option:selected").val() === 'CON') {
            $("#emp-end-date").show();
        } else if ($("#occupationStatus option:selected").val() === 'SEA') {
            $("#emp-end-date").show();
        } else {
            $("#emp-end-date").hide();
        }
    });
    //--> steps validation fields

    $("input[name='idNumber']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9]/g, ''));
    });

    $("input[name='telephoneNumber']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9]/g, ''));
    });

   $("input[name='netIncome']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });

    $("input[name='grossSalaryBeforeTax']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });

    $("input[name='netIncome']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
    $("input[name='grossSalaryBeforeTax']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
   $("input[name='rentAccomodation']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
    $("input[name='education']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
    $("input[name='foodGroceries']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
    $("input[name='transporation']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
    $("input[name='medicalExpense']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });
    $("input[name='other']").on('input', function (e) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
    });


    var step =
    {
        frmStep1:
            [
                { name: "id", control: "idNumber" },
                { name: "decision_tile", control: "title" }
           
            ],
        frmStep_1_1:
            [
                { name: "name", control: "firstName" },
                { name: "surname", control: "surname" },
                { name: "mobile", control: "telephoneNumber" },
                { name: "email", control: "email" },
                { name: "howmuch", control: "howMuchYoureLookingFor" }
            ],
        frmStep3:
            [
                { name: "decision_employment", control: "employeeType" },
                { name: "employer", control: "tbEmployer" },
		{ name: "decision_bank", control: "tbBanks" }, 
                { name: "date", control: "employmentStartDate" },
                { name: "compare_date", control: "employmentEndDate" },
                { name: "amount", control: "childMaintenanceExpenses" },
                { name: "expense_amount", control: "livingExpense" },
                { name: "income", control: "netIncome" },
                { name: "gross", control: "grossSalaryBeforeTax" },
                { name: "decision_wage", control: "wageType" },
                { name: "string", control: "bank" },
                { name: "decision", control: "bankStatement" },
                { name: "decision_occupation", control: "occupationStatus" }
            ],
        frmStep2_2:
            [
                { name: "amount", control: "rentAccomodation" },
                { name: "amount", control: "education" },
                { name: "amount", control: "foodGroceries" },
                { name: "amount", control: "transporation" },
                { name: "amount", control: "medicalExpense" },
                { name: "amount", control: "other" }
            ],
        frmStep2:
            [
                { name: "opt", control: "oneTimePIN" }
            ]
    };

    Object.keys(step).forEach(function (form) {
        var fields = form_validation_setup(step[form]);
        initialize_form_validation("#" + form, fields);
    });

    //-->detect next step click 

    $('.sw-btn-next', this.main).on("click", function (e) {
       
        //-->Get step data
        var all_steps = $(".tab-pane");
        for (var x = 0; x < all_steps.length; x++) {
            last = x;
            last_obj = all_steps[x].attributes;
            if (all_steps[x].attributes.hasOwnProperty("style")) {

                if (all_steps[x].attributes.style.value === "display: block;" || all_steps[x].attributes.style.value === "display: block; opacity: 1;") {
                    //-->get step fields

                    var form_function = "frmStep" + (x + 1);
                    if (form_function === "frmStep4") {
                        request_config.frmStep_1();
                    }
                    if (form_function === "frmStep1") {
			if (form_validation_revalidate("#frmStep1")) {
				request_config.frmStep_1();
			}

                        if (form_validation_revalidate("#frmStep_1_1")) {
                            request_config.frmStep_1_1();
                        }
                    }
                    else if (form_function === "frmStep2") {
                        if (form_validation_revalidate("#frmStep2")) {

                            request_config.frmStep_4();
                        }
                    } else if (form_function === "frmStep3") {
                         if (form_validation_revalidate("#frmStep3")) {
                            // Employment detail posted
                            request_config.frmStep_2();
                         }
                    } else if (form_function === "frmStep4") {
                        if (form_validation_revalidate("#frmStep4")) {

                            request_config.frmStep_4();
                        }
                    } else if (form_function === "frmStep5") {
                        request_config.frmStep_5();
                    }
                }
            }
        }

    });

    var calendar = [{ selector: "#start-date", format: "DD/MM/YYYY" }, { selector: "#end-date", format: "DD/MM/YYYY" }];
    initialze_date_only(calendar);

    //-->adding call me back button

    setTimeout(function () {
        addCallBackControl();

    }, 3000);

});


function validatePersonalDetailsField() {
	if ($("#idNumber").val() === "") {
		return false;
	}
	if ($("#title").val() === "") {
		return false;
	}
	if ($("#firstName").val() === "") {
		return false;
	}
	if ($("#surname").val() === "") {
		return false;
	}
	if ($("#telephoneNumber").val() === "") {
		return false;
	}
	if ($("#email").val() === "") {
		return false;
	}
	else {
		return true;
	}
}
function BindEmployerControls(response) {
    var employers = [];
    var resultRows = response.employee.map(function (emp) {
        employers.push({ label: emp.employerName, value: emp.employerCode});
    });
	$('.pause-form').hide();
	$('.pause-form').css("background", "#002b60");
    $('#tbEmployer').autocomplete({
        source: _banks, // employers,
        minLength: 0,
        scroll: true,
        open: function (e) {
            valid = false;
        },
        select: function (event, ui) {
            valid = true;
            event.preventDefault();
            $(".employer-group")[0].children[2].innerText = "";
            if ($(".employer-group")[0].children[1].children[2].classList.contains("glyphicon-remove")) {
                $(".employer-group")[0].children[1].children[2].classList.remove("glyphicon-remove");
                $(".employer-group")[0].children[1].children[2].classList.add("glyphicon-ok");
            }
            if ($(".employer-group")[0].classList.contains("has-error")) {
                $(".employer-group")[0].classList.remove("has-error");
                $(".employer-group")[0].classList.add("has-success");
            }
            //$("#bankReference").val(ui.item.value);
            //$("#bankBranch").val(ui.item.branch);

	    $('.pause-form').hide();
	    $('.pause-form').css("background", "#002b60");
            $("#tbEmployer").val(ui.item.label);
        },
        close: function (e) {
            // if (!valid) $("#tbEmployer").val('');
        },
    }).focus(function () {
        $(this).autocomplete("search", "");
	$('.ui-autocomplete').css("display", "block");
    });
}
$("#tbEmployer").keyup(function (e) {
    employerSearch($('#tbEmployer').val(), $('#employeeType').val());
});  
function employerSearch(description, employmentType) {
    if (employmentType === null) {
        $(".employerCheck").text("Please select Employment Sector before searching for Employer");
        $(".employerCheck").css("display", "block");
        $(".employer-not-found").css("display", "none");
        $('#chkUnknownEmployer').css('display','none');
	$('#tbEmployer').val('');
        $(".employer-group")[0].classList.add("has-error");
        $(".employer-group")[0].classList.remove("has-success");
        $(".employer-group")[0].children[1].children[2].classList.add("glyphicon-remove");
        $(".employer-group")[0].children[1].children[2].classList.remove("glyphicon-ok");
        return;
    }
if(description ==""){
        $(".employer-group")[0].classList.add("has-error");
        $(".employer-group")[0].classList.remove("has-success");
        $(".employer-not-found").text("");
        $(".employer-not-found").css("display", "none");
        $(".employerCheck").css("display", "none");
        $('#chkUnknownEmployer').css("display", "none")
        return;
}
    else {
        $(".employer-not-found").text("");
        $(".employer-not-found").css("display", "none");
        $(".employerCheck").css("display", "none");
        $('#chkUnknownEmployer').css('display','none');
        $(".employer-group")[0].classList.add("has-error");
        $(".employer-group")[0].classList.remove("has-success");
        $(".employer-group")[0].children[1].children[2].classList.remove("glyphicon-remove");
        $(".employer-group")[0].children[1].children[2].classList.add("glyphicon-ok");
    }
    
}
 $('#chkUnknownEmployer').change(function() {
        if(this.checked) {
            $('#tbEmployer').val('UNKNOWN');

		empName = 'UNKNOWN';
		empRef = 'UNKNOWN';

            $(".employer-group")[0].children[1].children[2].classList.remove("glyphicon-remove");
            $(".employer-group")[0].children[1].children[2].classList.add("glyphicon-ok");
            if ($(".employer-group")[0].classList.contains("has-error")) {
                   $(".employer-group")[0].classList.remove("has-error");
                   $(".employer-group")[0].classList.add("has-success");
              }
        }
        else{
           $('#tbEmployer').val('');
        }      
    });

function SaveMarketingConsentDetails(token) {
    var isSubscription = 0;
    if ($("input[type='radio'].myRadio").is(':checked')) {
        isSubscription = $("input[type='radio'].myRadio:checked").val();
    }
    var marketingObj = new Object();
        marketingObj.IdNumber = $("#idNumber").val(),
        marketingObj.Title = $("#title").val(),
        marketingObj.Name = $("#firstName").val(),
        marketingObj.Surname = $("#surname").val(),
        marketingObj.Email = $('#email').val(),
        marketingObj.Cellphone = $("#telephoneNumber").val(),
        marketingObj.isOptIn = isSubscription,
        marketingObj.AlternativeNumber = $("#telephoneNumber").val(),
        marketingObj.isInvestmentSelected = 0,
        marketingObj.isInsuranceSelected = 0,
        marketingObj.isLoanAndCreditCardSelected = 0,
        marketingObj.isTransactionBankingSelected = 0,
        marketingObj.isAlternativeNumberContactable = 0
        marketingObj.isCellphoneContactable = 0,
        marketingObj.isMailContactable = 0,
        marketingObj.consentSource = "QQ"
    var jsonObj = JSON.stringify(marketingObj);
    // alert(jsonObj);

    $.ajax({
        headers: { '__RequestVerificationToken': token },
        url: '/umbraco/surface/Custom/SaveConsent',
        type: "POST",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(marketingObj),
        success: function (data) {
        },
        error: function (error) {
        }
    });

}
 