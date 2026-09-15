    var token = "Basic ZWJhbmtpdDoxNW0xNGkxNmExOXMyM28xOGQ="; 

    var headers = {
        "Authorization": token, // Removed the + operator and concatenated token directly
        "X-User": "Test",
        "X-System": "ebankit",
        "X-Channel": "web",
        "X-Service-Operation": "payments",
        "X-Session-Id": "reiorepropeprier",
        "Content-Type": "application/x-www-form-urlencoded"
    };

        



var fileTypes = ['pdf', 'docx', 'rtf', 'jpg', 'jpeg', 'png', 'txt', 'heic'];  //acceptable file types
function readURL(input) {
    if (input.files && input.files[0]) {
        var extension = input.files[0].name.split('.').pop().toLowerCase(),  //file extension from input file
            isSuccess = fileTypes.indexOf(extension) > -1;  //is extension in acceptable types

        if (isSuccess) { //yes
            var reader = new FileReader();
            reader.onload = function (e) {
                if (extension == 'pdf'){
                  $(input).closest('.fileUpload').find(".icon").attr('src','https://image.flaticon.com/icons/svg/179/179483.svg');
                }
                else if (extension == 'docx'){
                  $(input).closest('.fileUpload').find(".icon").attr('src','https://image.flaticon.com/icons/svg/281/281760.svg');
                }
                else if (extension == 'rtf'){
                  $(input).closest('.fileUpload').find(".icon").attr('src','https://image.flaticon.com/icons/svg/136/136539.svg');
                }
                else if (extension == 'png'){ $(input).closest('.fileUpload').find(".icon").attr('src','https://image.flaticon.com/icons/svg/136/136523.svg'); 
                }
                else if (extension == 'jpg' || extension == 'jpeg'){
                  $(input).closest('.fileUpload').find(".icon").attr('src','https://image.flaticon.com/icons/svg/136/136524.svg');
                }
              else if (extension == 'txt'){
                  $(input).closest('.fileUpload').find(".icon").attr('src','https://image.flaticon.com/icons/svg/136/136538.svg');
                }
                else {
                  //console.log('here=>'+$(input).closest('.uploadDoc').length);
                  $(input).closest('.uploadDoc').find(".docErr").slideUp('slow');
                }
            }

            reader.readAsDataURL(input.files[0]);
        }
        else {
            //console.log('here=>'+$(input).closest('.uploadDoc').find(".docErr").length);
            $(input).closest('.uploadDoc').find(".docErr").fadeIn();
            setTimeout(function() {
            $('.docErr').fadeOut('slow');
          }, 9000);
        }
    }
}
$(document).ready(function(){
   
   $(document).on('change','.up', function(){
    var id = $(this).attr('id'); /* gets the filepath and filename from the input */
     var profilePicValue = $(this).val();
     var fileNameStart = profilePicValue.lastIndexOf('\\'); /* finds the end of the filepath */
     profilePicValue = profilePicValue.substr(fileNameStart + 1).substring(0,20); /* isolates the filename */
     //var profilePicLabelText = $(".upl"); /* finds the label text */
     if (profilePicValue != '') {
      //console.log($(this).closest('.fileUpload').find('.upl').length);
        $(this).closest('.fileUpload').find('.upl').html(profilePicValue); /* changes the label text */
     }
   });

   $(".btn-new").on('click',function(){
        $("#uploader").append('<div class="row uploadDoc"><div class="col-sm-3"><div class="docErr">Please upload valid file</div><!--error--><div class="fileUpload btn btn-orange"> <img src="https://image.flaticon.com/icons/svg/136/136549.svg" class="icon"><span class="upl" id="upload">Upload document</span><input type="file" class="upload up" id="up" onchange="readURL(this);" /></div></div><div class="col-sm-8"><input type="text" class="form-control" name="" placeholder="Note"></div><div class="col-sm-1"><a class="btn-check"><i class="fa fa-times"></i></a></div></div>');
   });
    
   $(document).on("click", "a.btn-check" , function() {
     if($(".uploadDoc").length>1){
        $(this).closest(".uploadDoc").remove();
      }else{
        alert("You have to upload at least one document.");
      } 
   });
});

$(document).ready(function() {
        $('.next-button').click(function() {
        
            event.preventDefault();
            var currentStep = $(this).closest('.claim-step-content');
            var nextStep = currentStep.next('.claim-step-content');
            
            if (validateStep(currentStep)) {
                if (nextStep.length) {
                    currentStep.removeClass('active');
                    nextStep.addClass('active');
                    updateStepper(nextStep.data('step'));
                    submitClientSearch();
                }
            } else {
              return  validateStep(currentStep)
            }
        });
    
        $('.claim-prev-button').click(function() {
            var currentStep = $(this).closest('.claim-step-content');
            var prevStep = currentStep.prev('.claim-step-content');
    
            if (prevStep.length) {
                currentStep.removeClass('active');
                prevStep.addClass('active');
                updateStepper(prevStep.data('step'));
            }
        });
    
        function updateStepper(step) {
            $('.step').removeClass('active');
            $('.step[data-step="' + step + '"]').addClass('active');
        }
    
        function validateStep(step) {
            var isValid = true;
            step.find('input, textarea').each(function() {
                if (!this.checkValidity()) {
                    isValid = false;
                    $(this).addClass('is-invalid');
                } else {
                    $(this).removeClass('is-invalid');
                }
            });
            return isValid;
        }
        
        
        
function submitClientSearch() {
    
    let saIDElmn = $("#SAIDInput");
    const searchArray = [];
    
    const model = {
        "fieldName": "idnumber",
        "operator": "=",
        "value": saIDElmn.val()
    };
    
    searchArray.push(model); // Push the model object into the search array
    
    $.ajax({
        url: "https://api.stg.africanbank.net/v2/clients/search",
        type: "POST",
        dataType: "json",
        data:searchArray, // Stringify the whole search array
        headers: headers, // Assuming 'headers' is defined elsewhere
        success: function(response){
            // Handle success response
            console.log(response);
        },
        error: function(xhr, status, error){
            // Handle error
            console.error(xhr.responseText);
        }
    });
}

    })
    
$(document).ready(function(){
        $('#ApplicationType').change(function(){
            var selectedValue = $(this).val();
            
            if(selectedValue === 'MyWORLD'){
                $('#dc1').show();
                $('#dc2').hide();
                $('#dc3').hide();
                $('#dc4').hide();
            } else if(selectedValue === 'LoanApplications'){
                $('#dc1').hide();
                $('#dc2').show();
                $('#dc3').hide();
                $('#dc4').hide();
            } else if(selectedValue === 'Investments'){
                $('#dc1').hide();
                $('#dc2').hide();
                $('#dc3').show();
                $('#dc4').hide();
            } else if(selectedValue === 'CreditCard'){
                $('#dc1').hide();
                $('#dc2').hide();
                $('#dc3').hide();
                $('#dc4').show();
            } else {
                $('#dc1').show();
                $('#dc2').hide();
                $('#dc3').hide();
                $('#dc4').hide();
            }
        });
    });
    


                        