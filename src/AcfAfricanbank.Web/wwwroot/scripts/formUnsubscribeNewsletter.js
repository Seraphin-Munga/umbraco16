/**
 * Call to action component
 */
$(document).ready(function () {
    $(function (ab, $) {
        /**
         * Exit this script if there is no #userDetailsForm on the page
         */
        if (!$('#UnsubscribeuserForm').length > 0) { return; }
        /**
         * Variables State
         */

        var $userDetailsForm = $('#UnsubscribeuserForm'),
            $userDetailsFormForm = $('#UnsubscribeuserForm').find("form"),
            $userDetailsFormElement = $userDetailsForm.closest('.call-to-action'),
            $openFormButton = $userDetailsFormElement.find('.input-group-btn button'),
            $userEmailInputContainer = $userDetailsFormElement.find('.user-email-input'),
            $userEmailError = $userDetailsFormElement.find('.alert-danger-email'),
            $userEmailInput = $userDetailsFormElement.find('#email'),
            $userEmail = $userDetailsFormElement.find('#formEmail'),
            $userEmailAddress = $userDetailsFormElement.find('#EmailInput'),
            $acceptFormButton = $userDetailsFormElement.find('.accept-button'),
            $cancelFormButton = $userDetailsFormElement.find('.cancel-button');
        $title = $(".content_unsubscribe");
        //
        $openFormButton.on('click', function () {
            if ($userEmailInput.val() != "") {
                if (validateEmail($userEmailInput.val())) {
                    $userEmailError.slideUp();
                    copyUserEmail();
                    openForm();
                    $userEmailInput.removeClass("haserror_input");
                    $(".error_email").hide();
                    $userEmailInput.addClass("hascorrect_input");
                    $(".error_email").hide();
                } else {
                    //  $userEmailError.slideDown();

                    $userEmailInput.addClass("haserror_input");
                    $(".error_email").show();
                }
            } else {
                openForm();
                $userEmailError.slideUp();
                $userEmailInput.removeClass("haserror_input");
                $(".error_email").hide();
            }
        });

        $userEmailInput.on('blur', function () {
            validateEmailInput();
        });

        //
        $cancelFormButton.on('click', function () {
            closeForm();
        });
        /**
         * UI controls
         */

        function validateEmailInput() {
            if (validateEmail($userEmailInput.val())) {
                $userEmailInput.addClass("hascorrect_input");
                $(".error_email").hide();
            } else {
                //  $userEmailError.slideDown();

                $userEmailInput.addClass("haserror_input");
                $(".error_email").show();
            }
        }

        function openForm() {
            $userDetailsForm.slideDown();
            $userEmailInputContainer.slideUp();
            $title.show();
        }

        function closeForm() {
            $userDetailsFormForm.bootstrapValidator('resetForm', true);
            $userEmailInput.val("");
            if (!$userDetailsForm.hasClass("generic")) {
                $userDetailsForm.slideUp();
                $userEmailInputContainer.slideDown();
            }
            ab.utilities.scrollToElem($userDetailsFormElement);
        }

        /**
         * Form Data manipulation
         */

        // Copy users email to form's email field
        function copyUserEmail() {
            // Funeral cover email input has different ID
            $userEmailAddress && $userEmailAddress.val($userEmailInput.val());

            $userEmail.val($userEmailInput.val());
        }

        // Match the email address regex
        function matchUserEmail() {
            return ab.utilities.formValidation.matchEmailAddress($userEmailInput.val());
        }
    }(window.ab = window.ab || {}, jQuery));
});

function validateEmail(email) {
    var emailReg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailReg.test(email);
}

function screenWidth() {
    if (window.screen) {
        return (screen.width);
    } else {
        return (0);
    }
}
function screenHeight() {
    if (window.screen) {
        return (screen.height);
    } else {
        return (0);
    }
}

function validateEmailInput2() {
    if (validateEmail($('#email').val())) {
        $('#email').addClass("hascorrect_input");
        $('#email').removeClass("haserror_input");
        $(".error_email").hide();
    } else {
        //  $userEmailError.slideDown();

        $('#email').removeClass("hascorrect_input");
        $('#email').addClass("haserror_input");
        $(".error_email").show();
    }
}

var AB = {};
AB.Forms = {
    init: function () {
        $(document).on("submit", "[data-method='ajax']", AB.Forms.doPost);
    },

    doPost: function (e) {
        e.preventDefault();
        var form = $(this);

        //AB.Forms.ensureFormHasCsrfToken(form);
        var contextPath = $("#loggedInContext").attr("href");
        var action = form.attr("action");

        var path = contextPath + action;

        var data = form.serialize();

        var url = path;
        var method = form.attr("method");

        AB.Forms.State.loading();
        AB.Forms.send(form, url, data, method);
    },

    send: function (form, url, params, method) {
        Unsubscribe.unsubscribe();
    },
    ensureFormHasCsrfToken: function (form) {
        if ($("input[name=CSRFToken]", form).length === 0) {
            var token = $("input[name=CSRFToken]").first().clone();
            if (token.length > 0) {
                form.append(token);
            }
        }
    },
    State: {
        loading: function (form) {
            $(".ajax-alert", form).slideUp();
        },
        success: function (form, data) {
            if (data.isSuccess) { //serviceSuccess
                $(".ajax-form-success", form).html(data.message).slideDown();
                $(".ajax-form-content", form).slideUp();
                $(".ajax-submit-button, .premiumFooterInfo").hide();
                $(".ajax-submit-success").show();
            } else { //serviceError
                $(".ajax-form-error", form).html(data.message).slideDown();
                $(".ajax-submit-button").removeProp('disabled');
                AB.Forms.State.error(form, data);
            }
        },
        error: function (form, data) {
            var message = "There was an issue with your request. Please try again later";

            if (data && data.message) {
                message = data.message;
            }

            $(".ajax-form-error", form).html(message).slideDown();
            $(".ajax-form-content", form).slideDown();
        },
        finished: function (form) {
        }
    },
    Validate: {
        // ...
    }
};

$(document).ready(function () {
    AB.Forms.init();

    $('#UnsubscribeuserForm').bootstrapValidator();
});