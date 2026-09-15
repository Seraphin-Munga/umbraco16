/**
 * Call to action component
 */
$(document).ready(function () {
    $(function (ab, $) {
        /**
         * Exit this script if there is no #userDetailsForm on the page
         */
        if (!$('#GenericContactFormContainer').length > 0) { return; }
        /**
         * Variables State
         */

        var $userDetailsForm = $('#GenericContactFormContainer'),
            $userDetailsFormForm = $('#GenericContactFormContainer').find("form"),
            $userDetailsFormElement = $userDetailsForm.closest('.call-to-action'),
            $openFormButton = $userDetailsFormElement.find('.input-group-btn button'),
            $userEmailInputContainer = $userDetailsFormElement.find('.user-email-input'),
            $userEmailError = $userDetailsFormElement.find('.alert-danger-email'),
            $userEmailInput = $userDetailsFormElement.find('#EmailContextInput'),
            $userEmail = $userDetailsFormElement.find('#formEmail'),
            $userEmailAddress = $userDetailsFormElement.find('#EmailInput'),
            $acceptFormButton = $userDetailsFormElement.find('.accept-button'),
            $cancelFormButton = $userDetailsFormElement.find('.cancel-button');
        $inputEmail = $userDetailsFormElement.find('#email');
        //
        $openFormButton.on('click', function () {
            if (matchUserEmail()) {
                copyUserEmail();
                openForm();

                $userEmailInput.removeClass("haserror_input");
                $(".error_email").hide();
                $userEmailInput.addClass("hascorrect_input");
                $(".error_email").hide();
            } else {
                $userEmailInput.addClass("haserror_input");
                $(".error_email").show();
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
            if (matchUserEmail()) {
                $userEmailInput.addClass("hascorrect_input");
                $(".error_email").hide();
            } else {
                //  $userEmailError.slideDown();

                $userEmailInput.addClass("haserror_input");
                $(".error_email").show();
            }
        }

        function validateInputEmail() {
            if (matchUserEmail2()) {
                $inputEmail.addClass("hascorrect_input");
                $(".error_email").hide();
            } else {
                //  $userEmailError.slideDown();

                $inputEmail.addClass("haserror_input");
                $(".error_email").show();
            }
        }

        function openForm() {
            $userDetailsForm.slideDown();
            $userEmailInputContainer.slideUp();
        }

        function closeForm() {
            $userDetailsFormForm.bootstrapValidator('resetForm', true);

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

        // Match the email address regex
        function matchUserEmail2() {
            return ab.utilities.formValidation.matchEmailAddress($inputEmail.val());
        }
    }(window.ab = window.ab || {}, jQuery));
});

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