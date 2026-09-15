
/*  function nextStep(stepNumber) {
// Complete the current step
document.getElementById('tab' + stepNumber).classList.add('completed');

}*/
const params = new URLSearchParams(window.location.search);

const utm_source = params.get("utm_source");
const utm_medium = params.get("utm_medium");
const utm_campaign = params.get("utm_campaign");

bankSearch();

$("#otpModal").hide();
document.addEventListener("DOMContentLoaded", function () {
    const isStep1Active = document.getElementById('step1').classList.contains('active');
    const tabBar = document.querySelector('.qqheader');

    if (isStep1Active && tabBar) {
        tabBar.style.display = 'none';
    }
});

function parseNumber(value) {

    if (!value) return null;

    

    // Remove commas & spaces

    const cleaned = value.replace(/[,\s]+/g, '');



    // If cleaned string is not digits → invalid input

    if (!/^\d+$/.test(cleaned)) return null;



    return BigInt(cleaned);

}

const productGrid = document.getElementById("productGrid");



let filterCards;
let originalOffers;
let tokenAffiliate;
let sourname ="";




let $idnumber         = $('#idnumber');
let $mobile           = $('#mobile');
let $fullname         = $('#fullname');
let $surname          = $('#surname');
let $income           = $('#income');
let $expenses         = $('#expenses');
let $grosssalary      = $('#grosssalary');
let $yourbank         = $('#yourbank');
let $youremployer     = $('#youremployer');
let $occupationstatus = $('#occupationstatus');
let $occupationtype   = $('#occupationtype');
let $startdate        = $('#datetimeInput');
let $title            = $('#title');
let $email            = $('#email-id');
let $employeeType     = $('#employeeType');
let $grosssalaryWage  = $('#frequencytype');



let logEntry  = 0;





//$("#existingCustomer").hide();
//$("#newCustomer").hide();



let offers = [

];



async function searchClientById(idNumber) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "https://cxappuat.stg.africanbankdmz.net/businessBanking/client-search",
            type: "POST",
            headers: {
                "x-api-key": "QWRtaW5pc3RyYXRvcjptYW5hZ2U=",
                "Content-Type": "application/json"
            },
            data: JSON.stringify([
                {
                    "fieldName": "idnumber",
                    "operator": "=",
                    "value": idNumber
                }
            ]),
            success: function (response) {
                resolve(response);   // <-- FIXED
            },
            error: function (xhr, status, error) {
                reject(error);
            }
        });
    });
}


$("#idnumber").on("keyup", async function () {

    let idNumber = $(this).val();

    if (idNumber.length === 13) {

        try {

            const response = await searchClientById(idNumber);
            
            // Access returned data
            let apps = response?.clientDetails?.data || [];
            let objRegister = response?.searchResult?.data || [];
            
            // Safely get registration object
            const registration = objRegister[0]?.registration ??  apps;
            
            // Determine if registration is an empty object
            const isEmptyRegistration = 
                typeof registration === "object" &&
                registration !== null &&
                Object.keys(registration).length === 0;
            
            // Toggle UI
      //  if (isEmptyRegistration) {
    //$("#existingCustomer").hide();
    //$("#newCustomer").show();
//} else {
 //   $("#existingCustomer").show();
  //  $("#newCustomer").hide();
//}

            

            // find if CRE + NEW exists
            let found = apps.find(app =>
                app.applicationType === "CRE" &&
                app.applicationStatus === "NEW"
            );

            if (found) {
                console.log("CRE + NEW application found:", found);
                 var name = document.getElementById("fullname").value.trim();
                 if (name) {
                      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
                    }
                         document.querySelector("#thankyoumodal .fullname").textContent = name ? ", " + name : "";
                openDialog('thankyoumodal');
               $('#thankyouclose, #callmeclose').one('click', function() {
                    location.reload();
                });
                return;
            } else {
                console.log("No CRE + NEW application exists.");
            }

        } catch (err) {
            console.error("API Error:", err);
        }
    }
});













function launchConfetti() {

    const duration = 2 * 1100; // Duration of confetti (2 seconds)

    const end = Date.now() + duration;



    // go Buckeyes!

    var colors = ['#007bff', '#52AD00'];



    (function frame() {

        confetti({

            particleCount: 2,

            angle: 60,

            spread: 55,

            origin: { x: 0, y: 1 }, // Bottom left

            colors: colors

        });

        confetti({

            particleCount: 2,

            angle: 120,

            spread: 55,

            origin: { x: 1, y: 1 }, // Bottom right

            colors: colors

        });



        if (Date.now() < end) {

            requestAnimationFrame(frame);

        }

    }());



}



function renderOffers(filteredOffers, filter) {
    


    productGrid.innerHTML = ""; // Clear existing offers
    const configEl = document.getElementById("unsuccessful-config");

const closeUrl = configEl?.dataset.closeUrl;
const branchUrl = configEl?.dataset.branchUrl;

    if (filteredOffers?.length === 0) {
          productGrid.style.display = "contents";
        productGrid.innerHTML = `
       <div class="unsuccessful-container">
            <img src="/media/ej0bzq20/process-completed-icon.svg" alt="Unsuccessful icon" class="unsuccessful-icon" style="
    text-align: flex-start;
">
            <h2 class=" color-brand-1 mb-20 text-center">Unsuccessful!</h2>
            <p class=" color-brand-1 mb-20 text-center">
                At this stage, you don’t meet African Bank’s credit policy requirements.<br>
                Don’t worry — you can always try again in future when your circumstances improve.
            </p>
            <div class="unsuccessful-buttons">
               <button class="btn btn-secondary" onclick="'${closeUrl}'">Close</button>

                 <button class="btn btn-primary" onclick="'${branchUrl}'">Branch locator</button>
            </div>
        </div>
    `;

        return;

    }

    const parsedData = filteredOffers;

    if (parsedData?.results?.reasonCodes && parsedData?.results?.reasonCodes.length > 0) {
        parsedData.results.reasonCodes.forEach(reason => {
            productGrid.innerHTML = `<p>${reason.reasonCodeDescription}</p>`
        });
        
             setTimeout(() => {
            closeDialog("creditBureauCheckModal"); // Close the modal
            nextStep(3); // Move to step 3
        }, 1500);
    }
    



    const results = filteredOffers?.results?.offerResponse?.offers ? filteredOffers?.results?.offerResponse?.offers : filteredOffers;
    const filterResult = originalOffers?.results?.offerResponse?.offers ? originalOffers?.results?.offerResponse?.offers : results || [];
    
    let uniqueClassifications = []

   // const classifications = filterResult?.map(offer => offer.offerDetails.productClassification   productDescription );
   
   
     if(filterResult === null ){
         
         $("#text-error").text(originalOffers?.results?.reasonCodes[0]?.reasonCodeDescription)
                      
                        return
     }
   
   
    

        
        if(filterResult && filter === undefined  &&  filterResult !== null){
            
              const classifications = filterResult?.map(offer => {
                  const { productClassification, productDescription } = offer.offerDetails;
                  return { productClassification, productDescription };
                });
                
                 uniqueClassifications = Array.from(
                  new Map(classifications.map(item => [`${item.productClassification}-${item.productDescription}`, item])).values()
                );
          
            
    $('#filterData').empty();

    $('#filterData').append(
        '<div class="filter-card active" onclick="filterOffers(\'all\', this)">' + 'ALL' + '</div>'
    );
    
        }

    offers = results;
    
    var post_data = {
        
                    "Offers": JSON.stringify(offers)
                };
       
   logOffersDetails(post_data)
    

    uniqueClassifications?.forEach(function (classification, index) {
        let displayText = classification || 'Unknown';

        $('#filterData').append(
            '<div class="filter-card" onclick="filterOffers(\'' + classification.productClassification + '\', this)">' + displayText.productDescription + '</div>'
        );
    });

    filterCards = document.querySelectorAll(".filter-card");

    results?.forEach(offer => {
        filteredOffers
        const card = document.createElement("div");

        card.className = "product-card";

const capital = offer?.offerDetails?.cashToClient || 0;




card.innerHTML = `
<div class="card-header">
  <h4 class="cardheading mb-10">R ${offer?.offerDetails?.productClassification === "OVLI" || offer?.offerDetails?.productClassification === "OVER"  ? offer?.offerDetails?.overdraftLimit  : capital}</h4>
  <p class="cardheading1">${offer?.offerDetails?.productDescription}</p>
</div>
<div class="card-body">
 <p class="font-sm-2 color-brand-1 tooltip" data-tooltip="This is not a loan offer. It’s an indication of what you may qualify for based on the information you’ve provided. Final approval depends on a full credit assessment.">Interest Rate  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#002B60"></circle>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M9.33789 7.06494H10.7329V14.9999H9.33789V7.06494ZM10.6507 4.15502C10.8157 4.32503 10.8982 4.54002 10.8982 4.80002C10.8982 5.06003 10.8157 5.27502 10.6507 5.44502C10.4857 5.61503 10.2782 5.70002 10.0282 5.70002C9.7782 5.70002 9.5707 5.61503 9.4057 5.44502C9.2407 5.27502 9.1582 5.06003 9.1582 4.80002C9.1582 4.54002 9.2407 4.32503 9.4057 4.15502C9.5707 3.98502 9.7782 3.90002 10.0282 3.90002C10.2782 3.90002 10.4857 3.98502 10.6507 4.15502Z" fill="white"></path>
    </svg></p>
  <h4 class="color-brand-1 mb-10">${offer?.offerDetails?.interestRate}%</h4>

  <p class="font-sm-2 color-brand-1">Monthly Installment</p>
  <h4 class="color-brand-1 mb-10">R ${offer?.offerDetails?.instalment}</h4>

  <p class="font-sm-2 color-brand-1">Repayment Term</p>
  <h4 class="color-brand-1 mb-10">${offer?.offerDetails?.term} Month(s)</h4>
</div>
`;

//<div class="card-footer">
//  <button class="btn btn-primary" onclick="onclick="acceptOffer()">Accept this offer</button>
//</div>
        productGrid.appendChild(card);

    });
}



function bankSearch(bankNameString) {

    var _urlValue = "";
    _urlValue = '/umbraco/surface/QuickLoans/SearchBank/?_bankName=' + '';

    $.ajax({
        url: _urlValue,
        type: "GET",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (data) {
            var results = data.results

       

            if (results.serviceHeaderResponse.resultCode === 200) {
                $(".bank-not-found").css("display", "none");
                $("#yourbank").empty();
                $("#yourbank").append('<option value="">Select here</option>');
                results?.universalBankBranches?.forEach(element => {
                    $("#yourbank").append(`<option value=${element.bankCode}%${element?.branchCode}>${element.bankName}</option>`)
                })



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


let validEmployerSelected = false;
let selectedEmployerName = '';

$('#youremployer').autocomplete({
    source: function (request, response) {
        $.ajax({
            async: true,
            type: "GET",
            contentType: "application/json; charset=utf-8",
            url: '/umbraco/surface/QuickLoans/SearchEmployer?employerName=' + $("#youremployer").val() + '&employeeType=' + $('#employeeType').val(),
            dataType: "json",
            success: function (data) {
                var results = data.results;
                if (results.employee != null) {
                    var employers = results.employee.map(function (emp) {
                        return { label: emp.employerName, value: emp.reference };
                    });

                    response(employers);
                } else {
                    $('#youremployer-error').css("display", "block").text("I can't find my employer");
                }
            },
            error: function (e) {
                console.error("Error fetching employers", e);
            }
        });
    },
    minLength: 3,
    select: function (event, ui) {
        event.preventDefault();
        $("#youremployer").val(ui.item.label);
        selectedEmployerName = ui.item.label;
        validEmployerSelected = true;
        $('#youremployer-error').hide();
        $('#youremployer').removeClass('invalid');
    },
    change: function (event, ui) {
        // If user types something not from list
        if (!ui.item) {
            validEmployerSelected = false;
        }
    }
});

// <button class="btn btn-primary" href="https://ib.africanbank.co.za/SignIn.aspx" onclick="nextStep(4)">Accept this offer</button>

function filterOffers(type, navDiv) {

    filterCards?.forEach(card => card.classList.remove("active"));
    
     if(navDiv){
         
       $(navDiv).addClass('active'); 
     }
     
    const copyOffer = originalOffers?.results?.offerResponse?.offers;

///document.querySelector(`.filter-card[onclick="filterOffers('${type}')"]`)?.classList.add("active");


    const filteredOffers = type === "all" ? originalOffers : copyOffer.filter(offer => offer?.offerDetails?.productClassification === type);

    renderOffers(filteredOffers, "filter");

}

  const urlParams = new URLSearchParams(window.location.search);

if(urlParams){
    



const affiliateData = {
    firstName: urlParams.get("FirstName"),
    lastName: urlParams.get("LastName"),
    phone: urlParams.get("Phone"),
    email: urlParams.get("Email"),
    amount: urlParams.get("Amount"),
    product: urlParams.get("Product"),
    affId: urlParams.get("AffId"),
    idNumber: urlParams.get("IdNumber"),
    income: urlParams.get("Income"),
    expenses: urlParams.get("Expenses"),
    grossSalary: urlParams.get("GrossSalary"),
    grossSalaryType: urlParams.get("GrossSalaryType"),
    province: urlParams.get("Province"),
    address: urlParams.get("Address"),
    postalCode: urlParams.get("PostalCode"),
    yourBank: urlParams.get("YourBank"),
    employeeType: urlParams.get("EmployeeType"),
    yourEmployer: urlParams.get("YourEmployer"),
    occupationStatus: urlParams.get("OccupationStatus"),
    occupationType: urlParams.get("OccupationType"),
    datetimeInput: urlParams.get("DatetimeInput")
};




      // Prepopulate fields if data exists
        if (affiliateData.firstName) {
            document.getElementById('fullname').value = affiliateData.firstName + (affiliateData.lastName ? ' ' + affiliateData.lastName : '');
        }

        if (affiliateData.phone) {
            document.getElementById('mobile').value = affiliateData.phone.replace(/\D/g, '').slice(0, 10);
        }

        if (affiliateData.email) {
            document.getElementById('email-id').value = affiliateData.email;
        }

        if (affiliateData.amount) {
            const numericAmount = parseInt(affiliateData.amount.replace(/\D/g, ''), 10);
            if (!isNaN(numericAmount)) {
                document.getElementById('input-Amount1').value = numericAmount;
                document.getElementById('slide-range1').value = numericAmount;
            }
        }

        //Gross Salary and Type
        if (affiliateData.grossSalary) {
            document.getElementById('grosssalary').value = affiliateData.grossSalary;
        }
        if (affiliateData.grossSalaryType) {
            document.getElementById('grosssalary-select').value = affiliateData.grossSalaryType;
        }

        //If ID number is provided
        if (affiliateData.idNumber) {
            document.getElementById('idnumber').value = affiliateData.idNumber;
        }

        //If income is provided
        if (affiliateData.income) {
            document.getElementById('income').value = affiliateData.income;
        }

        //If expenses is provided
        if (affiliateData.expenses) {
            document.getElementById('expenses').value = affiliateData.expenses;
        }

        //If address fields are provided
        if (affiliateData.province) {
            document.getElementById('province').value = affiliateData.province;
        }
        if (affiliateData.address) {
            document.getElementById('address').value = affiliateData.address;
        }
        if (affiliateData.postalCode) {
            document.getElementById('postalcode').value = affiliateData.postalCode;
        }

        //If employment fields are provided
        if (affiliateData.yourBank) {
            document.getElementById('yourbank').value = affiliateData.yourBank;
        }
        if (affiliateData.employeeType) {
            document.getElementById('employeeType').value = affiliateData.employeeType;
        }
        if (affiliateData.yourEmployer) {
            document.getElementById('youremployer').value = affiliateData.yourEmployer;
        }
        if (affiliateData.occupationStatus) {
            document.getElementById('occupationstatus').value = affiliateData.occupationStatus;
        }
        if (affiliateData.occupationType) {
            document.getElementById('occupationtype').value = affiliateData.occupationType;
        }
        if (affiliateData.datetimeInput) {
            document.getElementById('datetimeInput').value = affiliateData.datetimeInput;
        }
        
             filterOffers("all");

        // Auto-select product if specified
        if (affiliateData.product) {
            const product = affiliateData.product.toLowerCase();
            if (product.includes('loan')) {
                openDialog('amountModal');
            } else if (product.includes('investment')) {
                openDialog('investmentsModal');
            } else if (product.includes('account') || product.includes('world')) {
                applyForMyWorld();
            }
        }
  
}

const urlParms = new URLSearchParams(window.location.search);
const submissionId = urlParms.get("submissionId");

$.ajax({
    url: `https://cxappuat.stg.africanbankdmz.net/affiliate/api/data/${submissionId}`,
    method: "GET",
    dataType: "json",
    success: function (response) {
        if (!response || !response.data) {
            console.warn("No data found in response");
            return;
        }



        const affiliateData = response.data.data;

        // ===============================
        //      Prepopulate Fields
        // ===============================

        if (affiliateData.FirstName) {
            document.getElementById("fullname").value = affiliateData.FirstName;
        }

        if (affiliateData.LastName) {
            document.getElementById("surname").value = affiliateData.LastName;
        }

        if (affiliateData?.token) {
            tokenAffiliate = affiliateData.token;
        }
        
        
        
        
        sourname =affiliateData?.Source

        if (affiliateData.Phone) {
            document.getElementById("mobile").value = affiliateData.Phone;
        }

   

        if (affiliateData.Amount) {
            const numericAmount = parseInt(affiliateData.Amount.replace(/\D/g, ""), 10);
            if (!isNaN(numericAmount)) {
                document.getElementById("input-Amount1").value = numericAmount;
                document.getElementById("slide-range1").value = numericAmount;
            }
        }

        if (affiliateData.GrossSalary) {
            document.getElementById("grosssalary").value = affiliateData.GrossSalary;
        }

 

        if (affiliateData.IdNumber) {
            document.getElementById("idnumber").value = affiliateData.IdNumber;
        }

        if (affiliateData.Income) {
            document.getElementById("income").value = affiliateData.Income;
        }

        if (affiliateData.Expenses) {
            document.getElementById("expenses").value = affiliateData.Expenses;
        }

  

        if (affiliateData.YourBank) {
            document.getElementById("yourbank").value = affiliateData.YourBank;
        }

        if (affiliateData.EmployeeType) {
            document.getElementById("employeeType").value = affiliateData.EmployeeType;
        }

        if (affiliateData.YourEmployer) {
            document.getElementById("youremployer").value = affiliateData.YourEmployer;
        }

        if (affiliateData.OccupationStatus) {
            document.getElementById("occupationstatus").value = affiliateData.OccupationStatus;
        }

        if (affiliateData.OccupationType) {
            document.getElementById("occupationtype").value = affiliateData.OccupationType;
        }

        if (affiliateData.DatetimeInput) {
            document.getElementById("datetimeInput").value = affiliateData.DatetimeInput;
        }

        // ===============================
        //   Auto-set Title from ID Number
        // ===============================
        const id = affiliateData.IdNumber;
        const titleSelect = document.getElementById("title");

        if (/^\d{13}$/.test(id)) {
            const genderDigits = parseInt(id.slice(6, 10), 10);
            titleSelect.value = genderDigits >= 5000 ? "Mr" : "Ms";
        } else {
            titleSelect.value = "";
        }

        // ===============================
        //    Filter Offers & Open Dialog
        // ===============================
        filterOffers("all");
        openDialog("amountModal");

        // Auto-select product if specified
        if (affiliateData.product) {
            const product = affiliateData.product.toLowerCase();

            if (product.includes("loan")) {
                openDialog("amountModal");
            } else if (product.includes("investment")) {
                openDialog("investmentsModal");
            } else if (product.includes("account") || product.includes("world")) {
                applyForMyWorld();
            }
        }
    },

    error: function (xhr, status, error) {
        console.error("AJAX error:", error);
    }
});




// Initial load - show all offers

window.onload = () => filterOffers("all");

function showLoader() {
    document.getElementById('loader').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
    }, 800);
}

function nextStep(stepNumber) {
    console.log(`Moving to step ${stepNumber}`);
    showLoader();

    // Immediately hide or show the whole tab bar during loading
    const tabBar = document.querySelector('.qqheader');
    if (stepNumber === 1) {
        tabBar.style.display = 'none';
        tabBar.style.opacity = '0';
   } else {
        tabBar.style.display = 'flex'; // or 'block' based on your layout
       tabBar.style.opacity = '1';
   }

    setTimeout(() => {
        // Remove active class from all steps
        document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));

        // Remove all tab states and icons
        document.querySelectorAll('.header_tab').forEach(tab => {
            tab.classList.remove('active', 'completed');
            const icon = tab.querySelector('.completed-icon');
            if (icon) icon.remove();
        });

        // Add completed class + icon to previous steps
       // Add completed class + icon to previous steps
for (let i = 1; i < stepNumber; i++) {
    const prevTab = document.getElementById('tab' + i);
    if (!prevTab) continue;

    prevTab.classList.add('completed');

    // 🔥 Insert icon only inside the inner span that contains the main text (ignoring subtitle)
    const innerLabelSpan = prevTab.querySelector('span:not(.step-subtitle)');
    if (innerLabelSpan && !innerLabelSpan.querySelector('.completed-icon')) {
        innerLabelSpan.insertAdjacentHTML(
            'beforeend',
            '<i class="material-icons completed-icon">check_circle</i>'
        );
    }
}


        // Activate current step
        const currentStep = document.getElementById('step' + stepNumber);
        currentStep.classList.add('active');

        // Only mark tab active if not step 1
        if (stepNumber > 1) {
            const currentTab = document.getElementById('tab' + stepNumber);
            currentTab.classList.add('active');

            const activeIcon = currentTab.querySelector('.completed-icon');
            if (activeIcon) activeIcon.remove();

            currentTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
       //focusing cursor by defalut 
     if (stepNumber === 2) {
         
    const fullNameVal = $("#fullname").val().trim();

    // Check if the string length is 0 (empty)
    if (fullNameVal.length === 0) {
        $("#fullname").focus();
    }
    
}


        // Step-specific logic
        if (stepNumber === 3) {
            const step2Title = document.getElementById('step2').querySelector('h1').innerText;
            if (step2Title === 'Applying for MyWorld Bank Account.') {
                document.getElementById('personaloanoffers').classList.add('hidden');
                document.getElementById('myworldloanoffers').style.display = 'block';
            }
        }
        const cancelBtn = document.getElementById('cancelBtn');
        const continueBtn = document.getElementById('continueBtn');
        const buttonsDiv = document.querySelector('.buttons');
        if (stepNumber === 2) {
            // Show only Continue button
            buttonsDiv.classList.remove('hidden');
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (continueBtn) continueBtn.style.display = 'inline-block';
        } else {
            // Show both buttons on other steps
            buttonsDiv.classList.add('hidden');
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
            if (continueBtn) continueBtn.style.display = 'inline-block';
        }

    }, 800);
}




// Function to toggle the display
function toggleIcons() {
    // Select all elements with the class 'material-icons' inside elements with the class 'header_tab.completed'
    const icons = document.querySelectorAll('.header_tab.completed .material-icons');
    icons.forEach(icon => {
        // Toggle the display between 'none' and 'inline-block'
        if (icon.style.display === 'none') {
            icon.style.display = 'inline-block';
        } else {
            icon.style.display = 'none';
        }
    });
}
//checking the form validations
$(document).ready(function () {
    // Real-time ID number validation
    // Real-time validation for ID number or passport number

   // jQuery validation for South African ID
$('#idnumber').on('input blur', function () {
    const $input = $(this);
    const idNumber = $input.val().trim();
    const $error = $('#idnumber-error');

    if (idNumber === "") {
        $input.addClass('invalid');
        $error.text('ID number is required.').css('display', 'block');;
        return;
    }

    const validation = validateSAID(idNumber);

    if (!validation.valid) {
        $input.addClass('invalid');
        $error.text('invalid idnumber').css('display', 'block');;
    } else {
        $input.removeClass('invalid');
        $error.hide();
    }
});

// Function to validate SA ID
function validateSAID(id) {
    if (!/^\d{13}$/.test(id)) {
        return { valid: false, message: 'ID number must be 13 digits' };
    }

    // Birth date
    const yy = parseInt(id.substring(0, 2), 10);
    const mm = parseInt(id.substring(2, 4), 10) - 1;
    const dd = parseInt(id.substring(4, 6), 10);

    let fullYear = yy + 1900;
    const now = new Date();
    if (fullYear + 100 <= now.getFullYear()) fullYear += 100;

    const birthDate = new Date(fullYear, mm, dd);
    if (
        birthDate.getFullYear() !== fullYear ||
        birthDate.getMonth() !== mm ||
        birthDate.getDate() !== dd
    ) {
        return { valid: false, message: 'Invalid birth date in ID number' };
    }

    // Accurate age check
    let age = now.getFullYear() - fullYear;
    if (
        now.getMonth() < mm ||
        (now.getMonth() === mm && now.getDate() < dd)
    ) {
        age--;
    }

    if (age < 18 || age > 69) {
        return { valid: false, message: 'Your age must be between 18 and 69' };
    }

    // ✅ Correct SA ID checksum
    let sum = 0;

    // Odd positions (1,3,5...)
    for (let i = 0; i < 12; i += 2) {
        sum += parseInt(id.charAt(i));
    }

    // Even positions (2,4,6...) concatenated
    let even = '';
    for (let i = 1; i < 12; i += 2) {
        even += id.charAt(i);
    }

    let evenNumber = parseInt(even) * 2;
    let evenSum = evenNumber
        .toString()
        .split('')
        .reduce((a, b) => a + parseInt(b), 0);

    let total = sum + evenSum;
    let checkDigit = (10 - (total % 10)) % 10;

    if (checkDigit !== parseInt(id.charAt(12))) {
        return { valid: false, message: 'Invalid ID number checksum' };
    }

    return { valid: true };
}



 $('#fullname').on('input', function () {
    const fullname = $(this).val().trim();

    // ✅ Allow only letters and spaces
    const onlyLetters = /^[A-Za-z\s]+$/;

    const $error = $('#fullname-error'); // Correct selector

    // Validation
    if (fullname === "") {
        $('#fullname').addClass('invalid');
        $error.text('Full name is required.').css('display', 'block');
        return false;

    } else if (!onlyLetters.test(fullname)) {
        $('#fullname').addClass('invalid');
        $error.text('Name can only contain letters and spaces.').css('display', 'block');
        return false;

    } else {
        $('#fullname').removeClass('invalid');
        $error.hide();
        return true;
    }
 checkAllValid();
    // Update loan offer title
    if (fullname && !$error.is(':visible')) {
        $('#loanOfferTitle').text('Hi ' + fullname + ', Great News! You Qualify - view your <span class="dynamic-loan-amount">personalised loan quick quotes below.</span>');
    } else {
        $('#loanOfferTitle').text('Let’s find out what you qualify for');
    }
});

$('#surname').on('input', function () {
    const surname = $(this).val().trim();

    // ✅ Allow only letters and spaces
    const onlyLetters = /^[A-Za-z\s]+$/;

    const $error = $('#surname-error'); // Correct selector

    // Validation
    if (surname === "") {
        $('#surname').addClass('invalid');
        $error.text('Surname is required.').css('display', 'block');
        return false;

    } else if (!onlyLetters.test(surname)) {
        $('#surname').addClass('invalid');
        $error.text('Name can only contain letters and spaces.').css('display', 'block');
        return false;

    } else {
        $('#surname').removeClass('invalid');
        $error.hide();
        return true;
    }
    checkAllValid();
});
// Real-time Mobile Number validation (Basic validation for mobile number)

   $('#mobile').on('input', function () {
    const $input = $(this);
    const $error = $('#mobile-error');

    // Strip non-digits
    let cleaned = $input.val().replace(/\D/g, '');
    if ($input.val() !== cleaned) {
        $input.val(cleaned);
    }

    const mobileNumber = cleaned;

    // SA mobile prefixes: 060–069, 071–079, 081–089
    const saMobileRegex = /^0(6[0-9]|7[1-9]|8[1-9])/;

    // SA landline prefixes start with 01, 02, 03, 04
    const saLandlineRegex = /^0[1-4]/;

    // IMMEDIATE landline detection (even if only 2 digits typed)
    if (saLandlineRegex.test(mobileNumber)) {
        $input.addClass('invalid');
        $error.text('Provide a valid mobile number').css('display', 'block');
        checkAllValid();
        return;  // stop further validation
    }

    // Standard validation
    if (mobileNumber === "") {
        $input.addClass('invalid');
        $error.text('Mobile number is required.').css('display', 'block');
    } 
    else if (mobileNumber.length !== 10) {
        $input.addClass('invalid');
        $error.text('Mobile number must be exactly 10 digits').css('display', 'block');
    } 
    else if (!saMobileRegex.test(mobileNumber)) {
        $input.addClass('invalid');
        $error.text('Provide a valid mobile number').css('display', 'block');
    } 
    else {
        $input.removeClass('invalid');
        $error.hide();
    }

    checkAllValid();
});



/* $('#email-id').on('input', function () {
    const email = $(this).val();
    const $error = $('#email-error'); // Correct selector
    
    const isValidEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

    if (email === "") {
        $('#email-id').addClass('invalid');
        $error.text('Email is required.').show();
    } else if (!isValidEmail) {
        $('#email-id').addClass('invalid');
        $error.text('Please enter a valid email address.').show();
    } else {
        $('#email-id').removeClass('invalid');
        $error.hide();
    }
     checkAllValid();
});*/


let validatingIncome = false;

let validatingGross = false;



function validateIncome() {

    if (validatingIncome) return;

    validatingIncome = true;



    const $input = $('#income');

    const $error = $('#income-error');



    const incomeValue = parseNumber($input.val());

    const grossValue = parseNumber($('#grosssalary').val());



    if ($input.val().trim() === "" || incomeValue === 0n) {

        $input.addClass('invalid');

        $error.text('Field is required with some value.').show();

    }

    else if (grossValue !== null && incomeValue >= grossValue) {

        $input.addClass('invalid');

        $error.text(`Income must be less than ${grossValue}.`).show();

    }

    else {

        $input.removeClass('invalid');

        $error.hide();

    }



    validatingIncome = false;

}



function validateGross() {

    if (validatingGross) return;

    validatingGross = true;



    const $input = $('#grosssalary');

    const $error = $('#grosssalary-error');



    const grossValue = parseNumber($input.val());

    const incomeValue = parseNumber($('#income').val());



    if ($input.val().trim() === "" || grossValue === 0n) {

        $input.addClass('invalid');

        $error.text('Field is required with some value.').show();

    }

    else if (incomeValue !== null && grossValue <= incomeValue) {

        $input.addClass('invalid');

        $error.text(`Gross salary must be greater than ${incomeValue}.`).show();

    }

    else {

        $input.removeClass('invalid');

        $error.hide();

    }



    validatingGross = false;

}

// Input event listeners
$('#income').on('input', function () {
    validateIncome();
    validateGross();  // Check cross-condition
    checkAllValid();
});

$('#grosssalary').on('input', function () {
    validateGross();
    validateIncome(); // Check cross-condition
    checkAllValid();
});

 $('#frequencytype').on('change', function ()  {
        const $error = $('#frequencytype-error');
        if ($(this).val() === "") {
            $('#frequencytype').addClass('invalid');
              $error.text('Please select frequency type').css('display', 'block');
        } else {
            $('#frequencytype').removeClass('invalid');
             $error.hide();
        }
         checkAllValid();
    });
// Gross salary validation



    $('#expenses').on('input', function () {
        
       const $error = $('#expenses-error');
       const expense = $(this).val();
       
        if (expense === "") {
            $('#expenses').addClass('invalid');
             $error.text('Field is requied some value.').css('display', 'block');
        } else {
            $('#expenses').removeClass('invalid');
            $error.hide();
        }
         checkAllValid();
    });
     $('#yourbank').on('change', function ()  {
        const $error = $('#yourbank-error');
        if ($(this).val() === "") {
            $('#yourbank').addClass('invalid');
              $error.text('Please select bank').css('display', 'block');
        } else {
            $('#yourbank').removeClass('invalid');
             $error.hide();
        }
         checkAllValid();
    });
     $('#employeeType').on('change', function ()  {
        const $error = $('#employeeType-error');
        if ($(this).val() === "") {
            $('#employeeType').addClass('invalid');
              $error.text('Please select employeetype').css('display', 'block');
        } else {
            $('#employeeType').removeClass('invalid');
             $error.hide();
        }
         checkAllValid();
    });
   /*  $('#province').on('input', function () {
        const $error = $('#province-error');
         if ($(this).val() === "") {
            $('#province').addClass('invalid');
           // $error.text('Field is required.').show();
           $error.text('Field is required.').css('display', 'block');

        } else {
            $('#province').removeClass('invalid');
            $error.hide();
        }
         checkAllValid();
    });
    $('#address').on('input', function () {
        const $error = $('#address-error');
         if ($(this).val() === "") {
            $('#address').addClass('invalid');
           // $error.text('Field is required.').show();
           $error.text('Field is required.').css('display', 'block');

        } else {
            $('#address').removeClass('invalid');
            $error.hide();
        }
         checkAllValid();
    });
     $('#postalcode').on('input', function () {
        const $error = $('#postalcode-error');
         if ($(this).val() === "") {
            $('#postalcode').addClass('invalid');
            //$error.text('Field is required.').show();
            $error.text('Field is required.').css('display', 'block');

        } else {
            $('#postalcode').removeClass('invalid');
            $error.hide();
        }
         checkAllValid();
    });*/
   
// Validate on blur or input
$('#youremployer').on('blur input', function () {
    const $input = $(this);
    const $error = $('#youremployer-error');
    const inputVal = $input.val().trim();

    if (!inputVal || !validEmployerSelected || inputVal !== selectedEmployerName) {
        $input.addClass('invalid');
        $error.text('Please select a valid employer from the list.').css('display', 'block');
    } else {
        $input.removeClass('invalid');
        $error.hide();
    }
     checkAllValid();
});


    $('#occupationstatus').on('input', function () {
         const $error = $('#occupationstatus-error');
        if ($(this).val() === "") {
            $('#occupationstatus').addClass('invalid');
            $error.text('Field is required.').css('display', 'block');

        } else {
            $('#occupationstatus').removeClass('invalid');
            $error.hide();
        }
         checkAllValid();
    });
    $('#occupationtype').on('input', function () {
        const $error = $('#occupationtype-error');
        if ($(this).val() === "") {
            $('#occupationtype').addClass('invalid');
              $error.text('Please select occupation type').css('display', 'block');
        } else {
            $('#occupationtype').removeClass('invalid');
             $error.hide();
        }
         checkAllValid();
    });
    
    $('#datetimeInput').on('input change', function () {
    const $input = $(this);
    const $error = $('#datetimeInput-error');
    const value = $input.val().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (value === "") {
        // Error 1: Empty date
        $input.addClass('invalid');
        $error.text('A start date is required').css('display', 'block');
        return;
    }

    const selectedDate = new Date(value);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
        // Error 2: Future date not allowed
        $input.addClass('invalid');
        $error.text('Start date cannot be in the future').css('display', 'block');
        return;
    }

    // Error 3: Eligibility check – at least 5 months ago
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(today.getMonth() - 5);

    if (selectedDate > fiveMonthsAgo) {
        $input.addClass('invalid');
        $error.text('Eligibility begins after 5 months of employment').css('display', 'block');
    } else {
        $input.removeClass('invalid');
        $error.hide();
    }
    checkAllValid();
});

    
});
function checkAllValid() {
    const allValid =
        $('#fullname').val().trim() !== "" &&
        !$('#fullname').hasClass('invalid') &&
        $('#surname').val().trim() !== "" &&
        !$('#surname').hasClass('invalid') &&
        $('#mobile').val().trim() !== "" &&
        !$('#mobile').hasClass('invalid') &&
        $('#income').val().trim() !== "" &&
        !$('#income').hasClass('invalid') &&
        $('#grosssalary').val().trim() !== "" &&
        !$('#grosssalary').hasClass('invalid') &&
        $('#frequencytype').val().trim() !== "" &&
        !$('#frequencytype').hasClass('invalid') &&
        $('#expenses').val().trim() !== "" &&
        !$('#expenses').hasClass('invalid') &&
        $('#yourbank').val().trim() !== "" &&
        !$('#yourbank').hasClass('invalid') &&
        $('#youremployer').val().trim() !== "" &&
        !$('#youremployer').hasClass('invalid') &&
         $('#employeeType').val().trim() !== "" &&
        !$('#employeeType').hasClass('invalid') &&
        $('#occupationstatus').val().trim() !== "" &&
        !$('#occupationstatus').hasClass('invalid') &&
        $('#occupationtype').val().trim() !== "" &&
        !$('#occupationtype').hasClass('invalid') &&
        $('#datetimeInput').val().trim() !== "" &&
        !$('#datetimeInput').hasClass('invalid');

    if (allValid) {
        $('#continebtn').prop('disabled', false);
    } else {
        $('#continebtn').prop('disabled', true);
    }
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = message ? "block" : "none";
}
/*function addRealtimeValidation(inputId, errorId, validatorFn) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    input.addEventListener("input", () => {
        const result = validatorFn(input.value);
        if (result === true) {
            input.classList.remove("invalid");
            showError(error, "");
        }
    });
}*/
//adding validations for accordians

function validatePersonalDetails() {

    let isValid = true;



  /* const title = document.getElementById("title");
    const aadon = document.getElementById("basic-addon1");
    const titleError = document.getElementById("title-error");

    if (!title.value || title.value === "Title") {

        markAccordionError('personalDetailsAccordion', true);
        aadon.classList.add("invalid");
        showError(titleError, "Please select a title");

        isValid = false;

    }
    else {
        aadon.classList.remove("invalid");
        showError(titleError, "");
    }

*/

    const fullname = document.getElementById("fullname");
    const fullnameError = document.getElementById("fullname-error");
    const onlyLetters = /^[A-Za-z\s]+$/;
    if (!fullname.value.trim()) {

        fullname.classList.add("invalid");
        showError(fullnameError, "Full name is required");
        isValid = false;

    }
   else if (!onlyLetters.test(fullname.value.trim())) {
    fullname.classList.add("invalid");            // ✅ input
    showError(fullnameError, "Name can only contain letters and spaces.");
    isValid = false;

}
    else {

        fullname.classList.remove("invalid");
        showError(fullnameError, "");
    }

  const surname = document.getElementById("surname");
    const surnameError = document.getElementById("surname-error");
    const onlyLeters = /^[A-Za-z\s]+$/;
    if (!surname.value.trim()) {

        surname.classList.add("invalid");
        showError(surnameError, "Surname is required");
        isValid = false;

    } 
    else if (!onlyLeters.test(surname.value.trim())) {
    surname.classList.add("invalid");            // ✅ input
    showError(surnameError, "Surname can only contain letters and spaces.");
    isValid = false;

}
    else {

        surname.classList.remove("invalid");
        showError(surnameError, "");
    }


    const idnumber = document.getElementById("idnumber");
    const idnumberError = document.getElementById("idnumber-error");
    if (!(isSouthAfricanIDValid(idnumber.value) || isPassportNumberValid(idnumber.value))) {

        idnumber.classList.add("invalid");
        showError(idnumberError, "Invalid South African ID or Passport number");
        isValid = false;

    } else {

        idnumber.classList.remove("invalid");
        showError(idnumberError, "");
    }



    const mobile = document.getElementById("mobile");
    const mobileError = document.getElementById("mobile-error");

   if (!/^0\d{9}$/.test(mobile.value)) {

    mobile.classList.add("invalid");
    showError(mobileError, "Enter a 10-digit mobile number starting with 0");
    isValid = false;

}else {

        mobile.classList.remove("invalid");
        showError(mobileError, "");
    }



   /* const email = document.getElementById("email-id");
    const emailError = document.getElementById("email-error");
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email.value)) {

        email.classList.add("invalid");
        showError(emailError, "Please enter a valid email address");
        isValid = false;

    } else {

        email.classList.remove("invalid");
        showError(emailError, "");

    }

*/

    markAccordionError('personalDetailsAccordion', !isValid);

    return isValid;
 
}
function validateIncomeDetails() {

    let isValid = true;



    const grosssalary = document.getElementById("grosssalary");
    const incomes = document.getElementById("income");
    const grosssalaryError = document.getElementById("grosssalary-error");
    const grossValue = parseNumber(grosssalary.value.trim());
    const incomeValues = parseNumber(incomes.value.trim());
  if (!grosssalary.value.trim() || grossValue <= 0) {

        grosssalary.classList.add("invalid");
        showError(grosssalaryError, "The Gross salary must be greater than 0.0");
        isValid = false;

    } 
     else if (grossValue !== null && incomeValues >= grossValue) {

       grosssalary.classList.add("invalid");
        showError(grosssalaryError, ` The Gross salary must be greater ${incomeValues}.`);
        isValid = false;

        

    }
    else {

        grosssalary.classList.remove("invalid");
        showError(grosssalaryError, "");
    }



    const income = document.getElementById("income");
    const incomeError = document.getElementById("income-error");
     const grossValues = parseNumber(grosssalary.value.trim());
const incomeValue = parseNumber(income.value.trim());
    if (!income.value.trim() || incomeValue <= 0) {

        income.classList.add("invalid");
        showError(incomeError, "The Income must be greater than 0.0");

        isValid = false;

    }   else if (income !== null && incomeValue >= grossValue) {

       incomeError.classList.add("invalid");
        showError(incomeError, ` The income salary must be less than ${grossValues}.`);
        isValid = false;

        

    }
    else {

        income.classList.remove("invalid");
        showError(incomeError, "");
    }

const frequency = document.getElementById("frequencytype");
    const frequencyError = document.getElementById("frequencytype-error");

    if (!frequency.value.trim()) {

        income.classList.add("invalid");
        showError(frequencyError, "Please select the frequency");

        isValid = false;

    } else {

        frequency.classList.remove("invalid");
        showError(frequencyError, "");
    }

    const expenses = document.getElementById("expenses");
    const expensesError = document.getElementById("expenses-error");
    if (!expenses.value.trim()) {

        expenses.classList.add("invalid");
        showError(expensesError, "The Expenses must be greater than 0.0");
        isValid = false;

    } else {

        expenses.classList.remove("invalid");
        showError(expensesError, "");

    }
    markAccordionError('incomeExpenses', !isValid);



    return isValid;

}
/*function validateAddressDetails() {

    let isValid = true;



    const province = document.getElementById("province");
    const provinceError = document.getElementById("province-error");
    if (!province.value.trim()) {

        province.classList.add("invalid");
        showError(provinceError, "Province is required");
        isValid = false;

    } else {

        province.classList.remove("invalid");
        showError(provinceError, "");
    }



    const address = document.getElementById("address");
    const addressError = document.getElementById("address-error");
    if (!address.value.trim()) {

        address.classList.add("invalid");
        showError(addressError, "Address is required");
        isValid = false;

    } else {

        address.classList.remove("invalid");
        showError(addressError, "");
    }



    const postalcode = document.getElementById("postalcode");
    const postalcodeError = document.getElementById("postalcode-error");
    if (!postalcode.value.trim()) {

        postalcode.classList.add("invalid");
        showError(postalcodeError, "Postal code is required");
        isValid = false;

    } else {

        postalcode.classList.remove("invalid");
        showError(postalcodeError, "");
    }



    markAccordionError('addressDetails', !isValid); // Use 'addressDetails' as it's the ID of the content section

    return isValid;

}*/
function validateEmploymentDetails() {

    let isValid = true;

    const yourbank = document.getElementById("yourbank");
    const yourbankError = document.getElementById("yourbank-error");

    if (!yourbank.value.trim()) {

        yourbank.classList.add("invalid");
        showError(yourbankError, "Bank is required");
        isValid = false;

    } else {

        yourbank.classList.remove("invalid");
        showError(yourbankError, "");
    }




    const employeeType = document.getElementById("employeeType");
    const employeeTypeError = document.getElementById("employeeType-error");
    if (!employeeType.value.trim()) {

        employeeType.classList.add("invalid");
        showError(employeeTypeError, "Employee type is required");
        isValid = false;

    } else {

        employeeType.classList.remove("invalid");
        showError(employeeTypeError, "");
    }

    const youremployer = document.getElementById("youremployer");
const youremployerError = document.getElementById("youremployer-error");
isValid = true;

const inputVal = youremployer.value.trim();

if (!inputVal || !validEmployerSelected || inputVal !== selectedEmployerName) {
    youremployer.classList.add("invalid");
    showError(youremployerError, "Please select a valid employer from the list.");
    isValid = false;
} 
 else {
    youremployer.classList.remove("invalid");
    showError(youremployerError, "");
}


    const occupationstatus = document.getElementById("occupationstatus");
    const occupationstatusError = document.getElementById("occupationstatus-error");
    if (!occupationstatus.value.trim()) {

        occupationstatus.classList.add("invalid");
        showError(occupationstatusError, "Occupation status is required");
        isValid = false;

    } else {

        occupationstatus.classList.remove("invalid");
        showError(occupationstatusError, "");
    }




    const occupationtype = document.getElementById("occupationtype");
    const occupationtypeError = document.getElementById("occupationtype-error");
    if (!occupationtype.value.trim()) {

        occupationtype.classList.add("invalid");
        showError(occupationtypeError, "Occupation type is required");
        isValid = false;

    } else {

        occupationtype.classList.remove("invalid");
        showError(occupationtypeError, "");
    }


    /*
      const startdate = document.getElementById("datetimeInput");
      const startdateError = document.getElementById("datetimeInput-error");
      if (!startdate.value.trim()) {
    
        startdate.classList.add("invalid");
        showError(startdateError, "A start date is required, and eligibility begins after 5 months of employment.");
        isValid = false;
    
      } else {
    
        startdate.classList.remove("invalid");
        showError(startdateError, "");
      }*/
    const startdate = document.getElementById("datetimeInput");
    const startdateError = document.getElementById("datetimeInput-error");
    const selectedDate = new Date(startdate.value);
    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (!startdate.value.trim()) {
        // Error 1: Empty date
        startdate.classList.add("invalid");
        showError(startdateError, "A start date is required");
        isValid = false;

    } 
    else if (selectedDate > today) {
    // Error 2: Future date not allowed
    startdate.classList.add("invalid");
    showError(startdateError, "Start date cannot be in the future");
    isValid = false;

} 
    else {
        // Error 2: Eligibility check - at least 5 months ago
        const fiveMonthsAgo = new Date();
        fiveMonthsAgo.setMonth(today.getMonth() - 5);

        if (selectedDate > fiveMonthsAgo) {
            startdate.classList.add("invalid");
            showError(startdateError, "Eligibility begins after 5 months of employment");
            isValid = false;
        } else {
            startdate.classList.remove("invalid");
            showError(startdateError, "");
        }
    }



    markAccordionError('employmentDetailsAccordion', !isValid);

    return isValid;

}
/*document.addEventListener("DOMContentLoaded", function () {
    addRealtimeValidation("title", "title-error", value =>
        value && value !== "Title" ? true : "Please select a title"
    );

    addRealtimeValidation("fullname", "fullname-error", value =>
        value.trim() ? true : "Full name is required"
    );

    addRealtimeValidation("idnumber", "idnumber-error", value =>
        isSouthAfricanIDValid(value) || isPassportNumberValid(value)
            ? true
            : "Invalid ID or Passport number"
    );

    addRealtimeValidation("mobile", "mobile-error", value =>
        /^\d{9}$/.test(value) ? true : "Enter the 9-digit mobile number (without the 0)"
    );

    addRealtimeValidation("email-id", "email-error", value =>
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
            ? true
            : "Invalid email address"
    );

    addRealtimeValidation("province", "province-error", value =>
        value.trim() ? true : "Province is required"
    );

    addRealtimeValidation("address", "address-error", value =>
        value.trim() ? true : "Address is required"
    );

    addRealtimeValidation("postalcode", "postalcode-error", value =>
        value.trim() ? true : "Postal code is required"
    );

    addRealtimeValidation("grosssalary", "grosssalary-error", value =>
        value.trim() ? true : "The Gross salary must be greater than 0.0"
    );

    addRealtimeValidation("income", "income-error", value =>
        value.trim() ? true : "The Income salary must be greater than 0.0"
    );

    addRealtimeValidation("expenses", "expenses-error", value =>
        value.trim() ? true : "The Expenses must be greater than 0.0"
    );

    addRealtimeValidation("yourbank", "yourbank-error", value =>
        value.trim() ? true : "Bank is required"
    );

    addRealtimeValidation("employeeType", "employeeType-error", value =>
        value.trim() ? true : "Employee type is required"
    );

    addRealtimeValidation("youremployer", "youremployer-error", value =>
        value.trim() ? true : "Employer name is required"
    );

    addRealtimeValidation("occupationstatus", "occupationstatus-error", value =>
        value.trim() ? true : "Occupation status is required"
    );

    addRealtimeValidation("occupationtype", "occupationtype-error", value =>
        value.trim() ? true : "Occupation type is required"
    );

    addRealtimeValidation("datetimeInput", "datetimeInput-error", value =>
        value.trim() ? true : "Start date is required"
    );
});*/


// Helper to mark error border & toggle checkmark for accordions

function markAccordionError(accordionId, isError) {

    const accordionContent = document.getElementById(accordionId);

    if (!accordionContent) return;



    const headerDiv = accordionContent.previousElementSibling;

    const checkIcon = headerDiv.querySelector('.check-icon');

    const arrowIcon = headerDiv.querySelector('.material-icons');



    headerDiv.classList.remove('error-border', 'valid-border');



    if (isError) {

        headerDiv.classList.add('error-border');

        if (checkIcon) checkIcon.style.display = 'none';

        if (arrowIcon) arrowIcon.style.display = 'inline-block';

    } else {

        headerDiv.classList.add('valid-border');

        if (checkIcon) checkIcon.style.display = 'inline-block';

        if (arrowIcon) arrowIcon.style.display = 'none';

    }

}
function isPersonalObjectValid(obj) {
    return (
        obj.idNumber && obj.idNumber.trim() !== "" &&
        obj.firstName && obj.firstName.trim() !== "" &&
        obj.surname && obj.surname.trim() !== "" &&
       // obj.EmailAddress && obj.EmailAddress.trim() !== "" &&
        obj.PhoneNumber && obj.PhoneNumber.trim() !== "" &&
        obj.title && obj.title !== "Title"
    );
}


// Example: Call toggleIcons when you want to toggle the display (e.g., on a button click)

function toggleAccordion(id) {
    const content = document.getElementById(id);
    const header = content.previousElementSibling;
    const icon = header.querySelector('i.material-icons');
    
    
     
             var personObjs = {
                "idNumber":$idnumber.val(), 
                "title": $title.val(), 
                "surname": $fullname.val(), 
                "firstName":  tokenAffiliate ?   $fullname.val() + ";Affiliate-Token" +  tokenAffiliate :  $fullname.val(), 
                "EmailAddress": $email.val() ,
                "PhoneNumber":  $mobile.val(),
                "token": $('input[name="__RequestVerificationToken"]')[0]?.value
                }
                

    // Perform validation for this accordion
    let isValid = true;

    if (id === "incomeExpenses") {
        
        isValid = validatePersonalDetails();
    } else if (id === "employmentDetailsAccordion") {
        isValid = validatePersonalDetails() && validateIncomeDetails();
    }

    if (!isValid) {
        // Only keep the errored accordion open
        scrollToFirstInvalidAccordion();
        return; // stop further toggling
    }
    
    
     if (isPersonalObjectValid(personObjs) && validatePersonalDetails()) {
    quick_quote_steps(personObjs);
}


    // Toggle normally if valid
    const isOpen = content.style.display === "block";

    // Close all other accordions
    document.querySelectorAll('.accordion_content').forEach(item => {
        if (item !== content) {
            item.style.display = 'none';
            const otherHeader = item.previousElementSibling;
            otherHeader.classList.remove('active', 'error-border');
            const otherIcon = otherHeader.querySelector('i.material-icons');
            if (otherIcon) otherIcon.innerText = 'expand_more';
        }
    });

    // Toggle clicked accordion
    content.style.display = isOpen ? 'none' : 'block';
    header.classList.toggle('active');
    icon.innerText = content.style.display === 'block' ? 'expand_less' : 'expand_more';
}




function openDialog(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
    $("body").css("overflow", "hidden");
    // document.getElementById(modalId).classList.add("display");
}

function closeDialog(modalId, event = null) {
    if (!event || event.target.id === modalId) {
        document.getElementById(modalId).classList.add("hidden");
        $("body").css("overflow", "auto");
    }
}

function syncInputWithTrackBar(value) {
    document.getElementById('loanAmount').value = value;
    document.getElementById('error-message').style.display = 'none';
}

document.getElementById('loanAmount').addEventListener('input', function () {
    let inputValue = this.value.replace(/\D/g, ''); // Remove non-numeric characters
    let min = 2000, max = 350000;

    if (inputValue === '') return;

    let numericValue = parseInt(inputValue, 10);

    if (numericValue < min || numericValue > max) {
        document.getElementById('error-message').style.display = 'block';
    } else {
        document.getElementById('loanRange').value = numericValue;
        document.getElementById('error-message').style.display = 'none';
    }
});

document.getElementById('loanRange').addEventListener('input', function () {
    let min = parseInt(this.min);
    let max = parseInt(this.max);
    let val = parseInt(this.value);
    let percent = ((val - min) / (max - min)) * 100;

    this.style.setProperty('--progress', percent + '%');
    document.getElementById('loanAmount').value = val;
    document.getElementById('error-message').style.display = 'none';
});

function submitLoanAmount(modalId) {
    // Get the loan amount from the input field
    let loanAmount = document.getElementById('input-Amount1').value;

    // If the user interacts with the slider, update the input value accordingly
    let sliderValue = document.getElementById('slide-range1').value;
    if (loanAmount !== sliderValue) {
        loanAmount = sliderValue;  // Update with the value from the slider if different
    }

    // Remove any spaces or special characters (like "R") and parse as integer
    loanAmount = loanAmount.replace(/\s/g, '').replace('R', '');
    loanAmount = parseInt(loanAmount, 10);  // Convert to integer

    // Set the minimum and maximum loan limits
    let min = 2000, max = 500000;

    // Validate the loan amount input
    if (loanAmount < min || loanAmount > max || isNaN(loanAmount)) {
        document.getElementById('error-message').style.display = 'block';  // Show error message if invalid
    } else {
        // Format the loan amount as a currency string
       let formattedLoanAmount = "R" + Number(loanAmount).toLocaleString("en-ZA").replace(/,/g, " ");


        // Update the loan amount in the next step/modal
        //  document.getElementById('step2').querySelector('h1').innerHTML = `You are applying for <span class="dynamic-loan-amount">${formattedLoanAmount}</span> Loan.`;
        document.getElementById('step2').querySelector('h1').innerHTML = `
        <span class="span-major-title1">Let’s find out what you qualify for</span>
          `;
          //<span class="dynamic-loan-amount">${formattedLoanAmount}</span>
        // Close the current modal and open the next modal for credit questions
        closeDialog(modalId);
        openDialog('creditQuestionsModal');
    }
}
// function showQuickDropOff() {
// Show the popup
//  document.getElementById('quick-drop-off').style.display = 'block';
//document.getElementById('quick-drop-off').style.display = 'block';
//    const element = document.getElementById('quick-drop-off'); // Replace 'myElement' with your element's ID

// Remove the class
//       element.classList.remove('hidden');
//      element.style.display = 'block';
//     document.getElementById('form_fields').style.display = 'block';
//    closeDialog('thankyoumodal');

// }


/*function openMyWorldStep() {
    document.getElementById('step2').querySelector('h1').innerHTML = `Applying for <span class="dynamic-loan-amount">MyWorld</span> Bank Account.`;
    document.getElementById('income_accordion').classList.add("hidden");
    document.getElementById('address_accordion').classList.remove("hidden");
    nextStep(2);
}*/

function verifyexpensive(modalId) {
    const rent = parseInt(document.getElementById('rent').value.replace(/[^\d]/g, '')) || 0;
    const transport = parseInt(document.getElementById('transport').value.replace(/[^\d]/g, '')) || 0;
    const groceries = parseInt(document.getElementById('groceries').value.replace(/[^\d]/g, '')) || 0;
    const others = parseInt(document.getElementById('others').value.replace(/[^\d]/g, '')) || 0;

    const total = rent + transport + groceries + others;

    const errorEl = document.getElementById('expenses-total-error');



    if (total === 0) {

        errorEl.style.display = 'block'; // Show error message

        return;

    } else {

        errorEl.style.display = 'none'; // Hide error if total is valid

    }
    const expensesInput = document.getElementById('expenses');
    expensesInput.value = total.toLocaleString(); // Insert formatted value
    formatCurrency(expensesInput);

    // **Clear validation error if previously shown**
    const expensesError = document.getElementById('expenses-error');
    expensesInput.classList.remove("invalid");
    showError(expensesError, "");

    closeDialog(modalId);
}
function updateLiveTotal() {
    const rent = parseInt(document.getElementById('rent').value.replace(/[^\d]/g, '')) || 0;
    const transport = parseInt(document.getElementById('transport').value.replace(/[^\d]/g, '')) || 0;
    const groceries = parseInt(document.getElementById('groceries').value.replace(/[^\d]/g, '')) || 0;
    const others = parseInt(document.getElementById('others').value.replace(/[^\d]/g, '')) || 0;

    const total = rent + transport + groceries + others;

    const summary = document.getElementById('expense-summary');
  summary.textContent = `Total Monthly Expences: R ${total.toLocaleString()}`;

}




function handleLoanResponse(apiResponse) {
    const results = apiResponse?.results;
    const offerResponse = results?.offerResponse;
    const reasonCodes = results?.reasonCodes || [];

    // If offers are missing → REJECT → return false
    if (!offerResponse?.offers || offerResponse.offers.length === 0) {

        const messages = reasonCodes
            .map(r => `${r.reasonCodeDescription}`)
            .join(", ");

        const displayMessage =
            messages || "No offers could be generated.";

   
       $('#errors').append(displayMessage);
     

        return false;    
    }

    // Otherwise → APPROVED
    return true;         // ✅ Continue processing
}






function verifyOTP(modalId) {

    var post_data = {
        "idNumber": $("#idnumber").val(),
        "clientNumber": "",
        "mobileNumber": $("#mobile").val(),
        "applicationId": "",
        "uniqueId": uniqueTransactionID,
        "otpEntered": $("#oneTimePIN").val(),
        "activityName": ""
    };

    $('#confirmButton').text('Loading...');
    var token = $('input[name="__RequestVerificationToken"]')[1].value;

  
    clearInterval(countdown); 
    // -------------------------------
    // Helper Functions
    // -------------------------------
    function clearTimer() {
        $("#timer").text("");
        $("#timer").empty();
    }
    
   $("#timer").text("We are processing your offers.");

    function sanitize(str) {
        return String(str)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function showError(msg) {
        clearTimer(); // clear timer on any error
        $('#errors').html(`<p class="notification">${sanitize(msg)}</p>`).show();
    }

    // -------------------------------
    // AJAX Call
    // -------------------------------
    $.ajax({
        headers: { 
            '__RequestVerificationToken': token 
        },
        url: '/umbraco/surface/QuickLoans/GetOffers',
        type: "POST",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ form: post_data }),
        
        success: function (data) {
            $('#confirmButton').text('Confirm');
            $('#errors').empty().hide();

            const raw = data?.data;
            
             var post_data = {
        
                    "Offers": JSON.stringify(raw)
                };
       
              logOffersDetails(post_data)

            if (!raw) {
                showError("Unexpected server response. Please try again.");
                 clearTimer();
                return;
            }

            if (typeof raw === "string" && (raw.includes('(500)') || raw.includes('(504)'))) {
                showError("A network error occurred. Please try again.");
                 clearTimer();
                return;
            }

            if (data.error === true) {
                $("#text-error").text("Something went wrong, please try again later");
                openDialog('thankyoumodal');
                closeDialog(modalId);
                clearTimer();
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (err) {
                showError("Invalid server response. Please contact support.");
                 clearTimer();
                return;
            }

            const reasonCodes = parsed?.results?.reasonCodes || [];
            handleLoanResponse(parsed);

            // Risk Criteria check
            const riskCriteriaError = reasonCodes.some(rc => rc.reasonCodeDescription === "Risk Criteria Not Met");
            if (riskCriteriaError) {
                $('#errors').append(`Risk Criteria Not Met`).show();
                clearTimer();
                return;
            }

            const header = parsed?.results?.serviceHeaderResponse;
            if (!header) {
                showError("Missing result details. Please try again.");
                 clearTimer();
                return;
            }

            const resultCode = header.resultCode;
            const notifications = header.notifications || [];

            // Result code logic
            if (![200, 400, 500].includes(resultCode)) {
                if (notifications.length === 0) {
                    showError("Something went wrong, please try again later.");
                } else {
                    notifications.forEach(n => {
                        const msg = sanitize(n.message || "Unknown error");
                        $('#errors').append(`<p class="notification">Error: ${msg}</p>`);
                    });
                    $('#errors').show();
                }
                 clearTimer();
                return;
            }

            if (resultCode === 500) {
                const desc = sanitize(header.resultDescription);
                showError(desc || "Internal server error.");
                 clearTimer();
                return;
            }

            if (resultCode === 200) {
                closeDialog(modalId);

                renderOffers(parsed);
                document.getElementById("offerLoader").style.display = "flex";
                originalOffers = parsed;
                startCreditCheck();

                document.getElementById("personalDetailsAccordion").style.display = "none";

                const personalAccordion = document.querySelector(".accordion[onclick*='personalDetailsAccordion']");
                if (personalAccordion) {
                    let checkIcon = personalAccordion.querySelector(".check-icon");
                    if (!checkIcon) {
                        checkIcon = document.createElement("i");
                        checkIcon.classList.add("material-symbols-outlined", "check-icon");
                        checkIcon.textContent = "check";
                        personalAccordion.insertBefore(checkIcon, personalAccordion.firstChild);
                    } else {
                        checkIcon.style.display = "inline-block";
                    }
                }

                toggleAccordion('incomeExpenses');

                document.getElementById("incomeExpenses")?.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "start" 
                });

                return;
            }

            if (resultCode === 400) {
                if (notifications.length === 0) {
                    showError(header.resultDescription);
                } else {
                    notifications.forEach(n => {
                        const msg = sanitize(n.message || "Invalid value");
                        $('#errors').append(`<p class="notification">Error: ${msg}</p>`);
                    });
                    $('#errors').show();
                    clearTimer();
                }
                return;
            }
        },

        error: function () {
            instance.terminate_process("process");
            showError("A network error occurred. Please try again.");
        }
    });
}




function openAmountModal() {
    document.getElementById('amountMd').style.display = 'block';
}

function closeAmountModal() {
    document.getElementById('amountMd').style.display = 'none';
}
// Run this after the modal opens to set default state
/*window.addEventListener("DOMContentLoaded", () => {
    const lastCheckbox = document.getElementById('popiaPermission');
    if (lastCheckbox) {
        lastCheckbox.checked = true; // ✅ default checked
    }
});*/

function updateSliderText(checkbox) {
  /*  const slider = checkbox.nextElementSibling;
    const textSpan = slider.querySelector('.slider-text');

    if (checkbox.checked) {
        textSpan.textContent = 'Yes';
        textSpan.classList.remove('slider-no');
        textSpan.classList.add('slider-yes');
    } else {
        textSpan.textContent = 'No';
        textSpan.classList.remove('slider-yes');
        textSpan.classList.add('slider-no');
    }*/

    // ✅ Add this part to control the Confirm button
    const debtReview = document.getElementById('debtReview').checked;
    const insolvent = document.getElementById('insolvent').checked;
    const popiaConsent = document.getElementById('popiaConsent').checked;
   const popiaPermission = document.getElementById('popiaPermission').checked;
    
    const confirmBtn = document.querySelector("#creditQuestionsModal .modal_footer .btn-primary[onclick*='submitCreditQuestions']");
    const selectAllBtn = document.querySelector("#creditQuestionsModal .modal_footer .btn-link");
    
    confirmBtn.disabled = !(debtReview && insolvent && popiaConsent);
     if (debtReview && insolvent && popiaConsent && popiaPermission) {
        selectAllBtn.style.display = "none";
    } else {
        selectAllBtn.style.display = "inline-block";
    }
}

function selectAllCreditQuestions() {
    document.getElementById('debtReview').checked = true;
    document.getElementById('insolvent').checked = true;
    document.getElementById('popiaConsent').checked = true;
    document.getElementById('popiaPermission').checked = true;

    // Manually call updateSliderText for one checkbox to enable Proceed button
    updateSliderText(document.getElementById('debtReview'));
}

function submitCreditQuestions(modalId) {
    // Here you can handle the selected credit questions
    const isUnderDebtReview = document.getElementById('debtReview').checked;
    const isInsolvent = document.getElementById('insolvent').checked;
    const popiaConsentGiven = document.getElementById('popiaConsent').checked;
    const popiaPermissionGiven = document.getElementById('popiaPermission').checked;

    // Example of using the values (can be removed or replaced)
    console.log("Under Debt Review:", isUnderDebtReview ? 'Yes' : 'No');
    console.log("Insolvent:", isInsolvent ? 'Yes' : 'No');
    console.log("POPIA Consent:", popiaConsentGiven ? 'Yes' : 'No');
   console.log("popia Permission:", popiaPermissionGiven ? 'Yes' : 'No');
    // diplay the corresponding accordions
    document.getElementById('income_accordion').classList.remove("hidden");
   // document.getElementById('address_accordion').classList.remove("hidden");
    
    

    // Close the credit questions modal and proceed to the next step
    closeDialog(modalId);
    nextStep(2);
    
}

function startCreditCheck() {
    const statusBar = document.getElementById("creditCheckStatus");
    const verificationText = document.getElementById("verificationText");

    statusBar.classList.add("hidden");
 

    setTimeout(() => {
        statusBar.classList.remove("hidden"); // Show the black status bar
     //  verificationText.textContent = "Please wait, Your Offers"; // Update    verificationText.textContent = "Credit Bureau Check Checking . . ."; text

        setTimeout(() => {
            closeDialog("creditBureauCheckModal"); // Close the modal
            nextStep(3); // Move to step 3
             // Hide loader
        loader.style.display = "none";
        }, 1500);

    }, 2000);
}

function scrollToFirstInvalidAccordion() {
    const accordions = ['personalDetailsAccordion', 'incomeExpenses', 'employmentDetailsAccordion'];

    let errorFound = false;

    accordions.forEach(id => {
        const content = document.getElementById(id);
        if (!content) return;

        const header = content.previousElementSibling;
        const errorField = content.querySelector('.error-message:not(:empty)');

        if (errorField && !errorFound) {
            // Keep only the first errored accordion open
            content.style.display = 'block';
            header.classList.add('error-border');
            header.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorFound = true;
        } else {
            // Close other accordions
            content.style.display = 'none';
            header.classList.remove('error-border');
        }

        // Update accordion icon
        const icon = header.querySelector('i.material-icons');
        if (icon) {
            icon.innerText = content.style.display === 'block' ? 'expand_less' : 'expand_more';
        }

        // Update active class
        if (content.style.display === 'block') {
            header.classList.add('active');
        } else {
            header.classList.remove('active');
        }
    });
}


function isSouthAfricanIDValid(id) {
    const regex = /^\d{13}$/;
    return regex.test(id);
}

function isPassportNumberValid(passport) {
    const regex = /^[A-Za-z0-9]{8}$/; // Passport: alphanumeric, exactly 8 characters
    return regex.test(passport);
}
$(document).on('click', '.glyphicon-search', function () {
    $('#youremployer').focus();
});



const otpInput = document.getElementById('oneTimePIN');
const confirmButton = document.getElementById('confirmButton');
const errorMessage = document.getElementById('error-message');

otpInput.addEventListener('input', function () {

    this.value = this.value.replace(/\D/g, '').slice(0, 6);

    if (this.value.length === 6) {
        confirmButton.disabled = false;
        errorMessage.style.display = "none";
    } else {
        confirmButton.disabled = true;
        errorMessage.style.display = "block";
    }
});


errorMessage.style.display = "none";



document.getElementById('idnumber').addEventListener('input', function () {
    const id = this.value.trim();
    const titleSelect = document.getElementById('title');

    if (/^\d{13}$/.test(id)) {
        const genderDigits = parseInt(id.slice(6, 10), 10);
        titleSelect.value = genderDigits >= 5000 ? "Mr" : "Ms";
    } else {
        titleSelect.value = "";
    }
});


let countdown; 

function startTimer() {

    clearInterval(countdown); 

    let time = 60; 

    countdown = setInterval(function () {
        let minutes = Math.floor(time / 60);
        let seconds = time % 60;

        let formattedTime =
            (minutes < 10 ? "0" + minutes : minutes) + ":" +
            (seconds < 10 ? "0" + seconds : seconds);

        $('#timer').text(formattedTime);

        if (time <= 0) {
            clearInterval(countdown);
            $('#timer').text("Time's up!");
        }

        time--;
    }, 1000);

}






function SaveMarketingConsentDetails(person) {

    var marketingObj = new Object();
        marketingObj.IdNumber = person?.idNumber,
        marketingObj.Title =  person?.title,
        marketingObj.Name =  person?.surname,
        marketingObj.Surname = person?.firstName,
        marketingObj.Email =person?.EmailAddress,
        marketingObj.Cellphone = person?.PhoneNumber,
        marketingObj.AlternativeNumber =person?.PhoneNumber,
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
        headers: { '__RequestVerificationToken': person?.token },
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






function  quick_quote_steps (person) {
 
 const logEntryUser = localStorage.getItem('logEntry') || "0";
 
 
   if(logEntryUser !==  $mobile.val()){
   var person = {
                    "idNumber": person?.idNumber, 
                    "title": person?.title, 
                    "surname": person?.surname, 
                    "firstName":person?.firstName, 
                    "EmailAddress": person?.EmailAddress
                };
                var personalDetails = JSON.stringify(person);
                var post_data = {
                    "PersonalDetailsRequestString": personalDetails,
                    "PhoneNumber": $mobile.val(),
                    "FinancialDetails": null,
                    "OTPValue": null,
                    "Offers": null,
                    "SelectedOffer": null,
                    "utm_source": $("#utmSource").val() || utm_source, 
                    "utm_medium": $("#utmMedium").val() || utm_medium,
                    "utm_campaign": $("#utmCampaign").val()|| utm_campaign                
                };
               

                 $.ajax({
                    headers: { '__RequestVerificationToken':  person?.token },
                    url: '/umbraco/surface/QuickLoans/LogPersonalDetails',
                    type: "POST",
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ form: post_data }),
                    success: function (data) { 
                        $("#form-preloader").hide();
                        SaveMarketingConsentDetails(person);
                        logEntry  +=1;
                        
                        localStorage.setItem('logEntry', $mobile.val());
                     
                     },
                    error: function (error) {
                        $('.pause-form').hide();
                        instance.terminate_process("process");
                    }
                }); 
                // instance.promote_next_step("process");
       
       
   }
    
                
     
            
     
}








// Call startCreditCheck() when the modal opens
function openCreditCheckModal() {

    //  $("#creditBureauCheckModal").show()


        let idnumber         = $idnumber.val();
        let mobile           = $mobile.val();
        let fullname         = $fullname.val();
        let surname          = $surname.val();
        let income           = $income.val();
        let expenses         = $expenses.val();
        let grosssalary      = $grosssalary.val();
        let yourbank         = $yourbank.val();
        let youremployer     = $youremployer.val();
        let occupationstatus = $occupationstatus.val();
        let occupationtype   = $occupationtype.val();
        let startdate        = $startdate.val();
        let title            = $title.val();
        let email            = $email.val();
        let employeeType     = $employeeType.val();
        let grosssalaryWage  = $grosssalaryWage.val();
   /* const address = $("#address").val();
    const postalcode = $("#postalcode").val();*/

    const rent = parseInt(document.getElementById('rent').value.replace(/[^\d]/g, '')) || 0;
    const transport = parseInt(document.getElementById('transport').value.replace(/[^\d]/g, '')) || 0;
    const groceries = parseInt(document.getElementById('groceries').value.replace(/[^\d]/g, '')) || 0;
    const others = parseInt(document.getElementById('others').value.replace(/[^\d]/g, '')) || 0;
    
    
        

    const splitBank = yourbank?.split("%") || "";


    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    mobile = mobile;

    const mobileNumberCode = mobile.slice(0, 3);
    const mobileNumber = mobile.slice(3, mobile.length);


    const maskedMobile = mobile.replace(/\d(?=\d{4})/g, "*");
    const isPersonalValid = validatePersonalDetails();

    const isIncomeValid = validateIncomeDetails();

    const isEmploymentValid = validateEmploymentDetails();

    /*const isAddressValid = validateAddressDetails();*/



    const isValidacccordians = isPersonalValid && isIncomeValid && isEmploymentValid;
    
    





    if (isValidacccordians) {

        document.getElementById("creditBureauCheckModal").classList.remove("hidden");



    } else {

        scrollToFirstInvalidAccordion();
        isValid = false;
    }

    let isValid = true;



    // Check if the user selected a valid title
    if (title === "Select Title" || title === "") {
        // Invalid: mark the input as invalid and set isValid to false
        $('#basic-addon1').addClass('invalid');
        $('#basic-addon1').focus();
        $('#error-message').show();  // You can show a custom error message
        isValid = false;
    } else {
        // Valid: remove the invalid class and hide the error message
        $('#basic-addon1').removeClass('invalid');
        $('#error-message').hide();
    }
    if (email === "" || !emailRegex.test(email)) {
        // Mark as invalid
        $('#email-id').addClass('invalid');
        $('#error-message').show();  // Show error message
    } else {
        // Valid email, remove invalid class and hide error message
        $('#email-id').removeClass('invalid');
        $('#error-message').hide();
    }

    var checkIncomeDetails = document.getElementById('income_accordion').classList.contains('hidden');
    if (!checkIncomeDetails && !income) {

        $('#income').addClass('invalid');
        $('#income').focus();

        isValid = false;

    } else {
        $('#income').removeClass('invalid');

    }

    if (!checkIncomeDetails && !expenses) {

        $('#expenses').addClass('invalid');
        $('#expenses').focus();

        isValid = false;

    } else {
        $('#expenses').removeClass('invalid');

    }
    if (!checkIncomeDetails && !grosssalary) {

        $('#grosssalary').addClass('invalid');
        $('#grosssalary').focus();

        isValid = false;

    } else {
        $('#grosssalary').removeClass('invalid');

    }
    if (!checkIncomeDetails && !yourbank) {

        $('#yourbank').addClass('invalid');
        $('#yourbank').focus();

        isValid = false;

    } else {
        $('#yourbank').removeClass('invalid');

    }

    var checkEmploymentDetails = document.getElementById('employment_accordion').classList.contains('hidden');
    if (!checkEmploymentDetails && !youremployer) {

        $('#youremployer').addClass('invalid');
        $('#youremployer').focus();

        isValid = false;

    } else {
        $('#youremployer').removeClass('invalid');

    }

    if (!checkEmploymentDetails && !occupationstatus) {

        $('#occupationstatus').addClass('invalid');
        $('#occupationstatus').focus();

        isValid = false;

    } else {
        $('#occupationstatus').removeClass('invalid');

    }
    if (!checkEmploymentDetails && !occupationtype) {

        $('#occupationtype').addClass('invalid');
        $('#occupationtype').focus();

        isValid = false;

    } else {
        $('#occupationtype').removeClass('invalid');

    }
    if (!checkEmploymentDetails && !startdate) {

        $('#datetimeInput').addClass('invalid');
        $('#datetimeInput').focus();

        isValid = false;

    } else {
        $('#datetimeInput').removeClass('invalid');

    }
    /*var checkaddressDetails = document.getElementById('address_accordion').classList.contains('hidden');

    if (!checkaddressDetails && !province) {

        $('#province').addClass('invalid');
        $('#province').focus();

        isValid = false;

    } else {
        $('#province').removeClass('invalid');

    }
    if (!checkaddressDetails && !address) {

        $('#address').addClass('invalid');
        $('#address').focus();

        isValid = false;

    } else {
        $('#address').removeClass('invalid');

    }
    if (!checkaddressDetails && !postalcode) {

        $('#postalcode').addClass('invalid');
        $('#postalcode').focus();

        isValid = false;

    } else {
        $('#postalcode').removeClass('invalid');

    }*/
    if (!fullname) {

        $('#fullname').addClass('invalid');
        $('#fullname').focus();

        isValid = false;

    } else {
        $('#fullname').removeClass('invalid');

    }
    if (!surname) {

        $('#surname').addClass('invalid');
        $('#surname').focus();

        isValid = false;

    } else {
        $('#surname').removeClass('invalid');

    }

    if (!isSouthAfricanIDValid(idnumber)) {
        $('#idnumber').addClass('invalid');
        $('#idnumber').focus();

        isValid = false;

    } else {
        $('#idnumber').removeClass('invalid');
    }

    if (mobile.length !== 9 && isNaN(mobile)) {
        $('#mobile').addClass('invalid');
        $('#mobile').focus();

        isValid = false;

    } else {
        $('#mobile').removeClass('invalid');
    }

    // Only open the credit check modal if all fields are valid
    if (isValid) {
        // Proceed to open the credit check modal
        $('#creditBureauCheckModal').removeClass('hidden').css('display', 'flex');
    } else {
        return
    }

    var post_data = {
        "mobileNumber": mobile,
        "contactDetails": {
            "emailDetails": [
                {
                    "type": "HOM",
                    "emailAddress": email,
                    "confirmEmailAddress": ""
                }
            ],
            "phoneNumberDetails": [
                {
                    "type": "MOB",
                    "countryCode": "27",
                    "areaCode": mobileNumberCode,
                    "telephoneNumber": mobileNumber
                }
            ]
        },
        "personalDetails": {
            "idNumber": idnumber,
            "clientType": "MAS",
            "idType": "01",
            "passportNumber": "",
            "title": title.toUpperCase(),
            "surname": fullname,
            "firstName":  tokenAffiliate ?  fullname + ";Affiliate-Token" +  tokenAffiliate + "sourname" + sourname : fullname,
            "knownName": ""
        },
        "employments": {
            "reference": "UNKNOWN",
            "wageType": grosssalaryWage,
            "salaryDepositDay": "",
            "employmentStartDate": startdate.replace("-", "").replace("-", "").trim(),
            "occupationType": "",
            "employmentType": employeeType,
            "occupationStatus": occupationstatus,
            "contractEndDate": "",
            "employerName": youremployer,
            "calenderId": "",
            "employeeNumber": "",
            "switchBoardNumber": "",
            "switchBoardAreacode": ""
        },
        "finances": {
            "applicationIncomeList": [
                {
                    "incomeType": "NETT",
                    "incomeValue": income?.replace(",", "").trim()
                },
                {
                    "incomeType": "GROSS",
                    "incomeValue": grosssalary?.replace(",", "").trim()
                }
            ],
            "applicationExpensesList": [
                {
                    "expenseType": "TRANSPRT",
                    "expenseValue": transport
                },
                {
                    "expenseType": "FOOD",
                    "expenseValue": groceries
                },

                {
                    "expenseType": "RENT",
                    "expenseValue": rent
                },

                {
                    "expenseType": "OTHER",
                    "expenseValue": others
                },

            ]
        },
        "bank": {
            "applicationBankingDetails": [
                {

                    "bankCode": splitBank[0],
                    "branchCode": parseInt(splitBank[1]),

                }
            ]
        }
    }


    var token = $('input[name="__RequestVerificationToken"]')[0]?.value;
    
    
    
   

    $.ajax({
        headers: { '__RequestVerificationToken': token },
        url: '/umbraco/surface/QuickLoans/ValidateClient',
        type: "POST",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ form: post_data }),
        success: function (data) {

            
            $("#errors").hide();
            $("#errorsVerification").empty();
            $(".pause-form").hide();
            $('#loading').show();
           $('#verificationText').show();
           

           
          

            var jsonValue = data.data;
            if (typeof (jsonValue) !== "undefined") {
                var result_code = JSON.parse(jsonValue)?.results?.serviceHeaderResponse?.resultCode;
                // Parse the JSON value to get notifications
                var notifications = JSON.parse(jsonValue)?.results?.serviceHeaderResponse?.notifications;

                var serviceHeaderResponse = JSON.parse(jsonValue)?.results?.serviceHeaderResponse;

                // Check for network errors
                if (result_code === 500 || result_code === 502 || result_code === 504 || result_code !== 200) {
                    $("#creditBureauCheckModal").hide()
                    console.log("Validate Client returned results - Error Network interrupted (500, 502, 504 error reported). DONE!");

                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    
                    
                    $("#text-error").text(serviceHeaderResponse?.resultDescription);
                         var name = document.getElementById("fullname").value.trim();
                          if (name) {
                      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
                    }
                         document.querySelector("#thankyoumodal .fullname").textContent = name ? ", " + name : "";
                    openDialog('thankyoumodal')
                    
                   /// $("#globalError").text(serviceHeaderResponse?.resultDescription);

                    $('#loading').hide();
                    $('#verificationText').hide();

                    notifications?.forEach(function (notification) {

                        $('#errorsVerification').append('<p class="notification"> Error: ' + notification.message + '</p>');
                    });


                    if (notifications == null || notifications?.length === 0) {
                        $('#errorsVerification').append('<p class="notification"> Error: ' + serviceHeaderResponse?.resultDescription + '</p>');
                    }

                    return;
                } else {

                    $('#verificationText').remove();
                 // $('body').append('<p id="verificationText">Credit Bureau Check Checking . . .</p>');
                    $('#loading').show();
                }



            }
            var results = JSON.parse(data.data).results;

            if (results?.serviceHeaderResponse?.resultCode === 200) {
                document.getElementById("creditBureauCheckModal").classList.add("hidden");
               // $('#verificationText').remove();
                uniqueTransactionID = results?.serviceHeaderResponse?.uniqueTransactionID;
                $('#optNumberUser').html(`Please enter the OTP sent to your mobile number <span class="mobile-text">${maskedMobile}</span> <br/> Give it a few seconds....`);

                $("#otpModal").show().css("display", "flex");
            



                $(".modal_dialog").removeClass("hidden");
                $("#otpModal").removeClass("hidden");

startTimer();
             


            } else if (results.serviceHeaderResponse?.resultCode === 400) {


            } else if (results.serviceHeaderResponse?.resultCode === 500) {


            } else if (results.serviceHeaderResponse?.resultCode === 502) {


            } else {

            }
        },
        error: function (error) {
            $('.pause-form').hide();
            $("#creditBureauCheckModal").hide();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            $("#globalError").text("Something went wrong, please try again later!");
            instance.terminate_process("process");
        }
    });



    /// document.getElementById("creditBureauCheckModal").classList.remove("hidden");
    /// startCreditCheck();
}





/*api loan calc 332025*/
/*api loan calc 332025*/
function formatLoanAmount(val) {
    val = val.toString().replace(/\D/g, "");
    if (val === "") return "R";

    // Format with space thousands
    return "R" + val.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatInstallment(val) {
    return "R" +
        Number(val)
            .toLocaleString("en-US", { minimumFractionDigits: 2 })
            .replace(/,/g, " ");
}

var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ZAR',
});

/* =======================================================
   ON DOCUMENT READY
======================================================= */
jQuery(document).ready(function () {

    var curVal = $("#input-Amount1").val().replace(/\D/g, "");
    $("#input-Amount1").val(formatLoanAmount(curVal));

    updateLoanSlider(curVal);

    var loanterm = $('.li-hover').attr('data-value') || $('#term1').val();
    updateTermSlider(loanterm);

    installmentEstimator(curVal, loanterm);
});

/* -------------------------------------------------------
   Slider Gradient Helpers
------------------------------------------------------- */
function updateLoanSlider(amount) {
    let min = parseInt($('#slide-range1').attr('min'));
    let max = parseInt($('#slide-range1').attr('max'));
    let valPercent = (amount - min) / (max - min);

    $('#slide-range1').css('background-image',
        `-webkit-gradient(linear, 0% 0%, 100% 0%, 
        color-stop(${valPercent}, #5dc300), 
        color-stop(${valPercent}, #99aabf))`);
}

function updateTermSlider(term) {
    let min = parseInt($('#input-month1').attr('min'));
    let max = parseInt($('#input-month1').attr('max'));
    let valPercent = (term - min) / (max - min);

    $('#input-month1').css('background-image',
        `-webkit-gradient(linear, 0% 0%, 100% 0%, 
        color-stop(${valPercent}, #5dc300), 
        color-stop(${valPercent}, #99aabf))`);
}

/* =======================================================
   SLIDER — Loan Amount
======================================================= */
$('#slide-range1').on('input', function () {
    var newVal = $(this).val();

    $("#input-Amount1").val(formatLoanAmount(newVal));
    updateLoanSlider(newVal);

    installmentEstimator(newVal, $('#term1').val());
});

/* =======================================================
   USER TYPES LOAN AMOUNT — LIVE SPACING + LIMITS
======================================================= */
$('#input-Amount1').on('input', function () {
    const input = this;

    // Save cursor
    let cursor = input.selectionStart;

    let val = input.value;

    // Always force R
    if (!val.startsWith("R")) {
        val = "R" + val.replace(/[^0-9]/g, "");
    }

    // Extract digits only
    let raw = val.substring(1).replace(/\D/g, "");

    // LIMIT: max 6 digits
    raw = raw.substring(0, 6);

    // LIMIT: max 500000
    if (parseInt(raw) > 500000) raw = "500000";

    // Reapply thousands spacing
    let formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    // Put final text back
    input.value = "R" + formatted;

    // Cursor restore
    let newPos = cursor;

    // Cursor cannot go before R
    if (newPos < 1) newPos = 1;

    input.setSelectionRange(newPos, newPos);

    // If empty, allow user to continue
    if (raw === "") return;

    // Update slider + calculations
    $('#slide-range1').val(raw);
    updateLoanSlider(raw);
    installmentEstimator(raw, $('#term1').val());
});

/* Prevent deleting or moving before R */
$('#input-Amount1').on('keydown click', function (e) {
    const input = this;

    if (input.selectionStart < 1) {
        input.setSelectionRange(1, 1);
    }

    if (e.key === "Backspace" && input.selectionStart <= 1) {
        e.preventDefault();
    }
});

/* =======================================================
   BLUR — Pretty Format
======================================================= */
$('#input-Amount1').on('blur', function () {

    let raw = $(this).val().replace(/\D/g, "");

    if (raw === "" || parseInt(raw) < 2000) raw = "2000";
    if (parseInt(raw) > 500000) raw = "500000";

    $(this).val(formatLoanAmount(raw));
    $('#slide-range1').val(raw);
    updateLoanSlider(raw);

    installmentEstimator(raw, $('#term1').val());
});

/* =======================================================
   TERM SELECT / INPUT / SLIDER
======================================================= */
$('.li-hover').click(function () {
    var newVal = $(this).attr('data-value');

    $("#input-month1").val(newVal);
    $("#term1").val(newVal);

    let loan = $("#input-Amount1").val().replace(/\D/g, "");
    installmentEstimator(loan, newVal);

    updateTermSlider(newVal);
});

$('#term1').on('input', function () {
    var newVal = $(this).val();
    $("#input-month1").val(newVal);

    let loan = $("#input-Amount1").val().replace(/\D/g, "");
    installmentEstimator(loan, newVal);

    updateTermSlider(newVal);
});

$('#input-month1').on('input', function () {
    var t = $(this).val();
    var snap;

    if (t <= 7) snap = 7;
    else if (t <= 9) snap = 9;
    else if (t <= 12) snap = 12;
    else if (t <= 18) snap = 18;
    else if (t <= 24) snap = 24;
    else if (t <= 30) snap = 30;
    else if (t <= 36) snap = 36;
    else if (t <= 42) snap = 42;
    else if (t <= 48) snap = 48;
    else if (t <= 60) snap = 60;
    else snap = 72;

    $('#term1').val(snap);
    $('#ddSpanner').text(snap + " months");

    var loan = $("#input-Amount1").val().replace(/\D/g, "");
    installmentEstimator(loan, snap);

    updateTermSlider(t);
});

/* =======================================================
   RESET
======================================================= */
function resetCalc() {

    $('#input-Amount1').val("R2 000");
    $('#slide-range1').val(2000);
    $('#input-month1').val(7);
    $('#term1').val(7);

    updateLoanSlider(2000);
    installmentEstimator(2000, 7);
}

/* =======================================================
   INSTALLMENT CALCULATOR
======================================================= */
function installmentEstimator(loan, loanterm) {

    var loan_amount = parseInt(loan);
    var term = loanterm;

    var interest_rate = 0.2475;
    var insurance_premium = 0.0045;

    var initiation_fee = Math.max(
        Math.min(
            Math.min(165 + (loan_amount - 1000) * 0.1, 1050),
            loan_amount * 0.15
        ),
        0
    );

    var principal_debt = loan_amount + initiation_fee * 1.15;
    var service_fee = 60 * 1.15;

    var installment =
        (
            (principal_debt * interest_rate / 12) /
            (1 - 1 / Math.pow((1 + interest_rate / 12), term))
        ) +
        insurance_premium * principal_debt +
        service_fee;

    installment = installment.toFixed(2);

    $('#installment_calc1').val(formatInstallment(installment));
}


/*docupload script*/
// Initialize an array to store selected files
let allFiles = [];

function uploadFiles(fileInput) {
    const progressBarContainer = $(fileInput).closest('.upload-area');
    const bar = $('.progress-bar-container');
    bar.css('display', 'block');
    const progressBar = $('.progress-bar');
    const files = fileInput.files;
    const fileNames = Array.from(files).map(file => file.name);
    allFiles = [...allFiles, ...files];
    $('#status').html('<p class="font-md color-brand-1 mt-20 mb-20">Selected Files:</p><ul>' + allFiles.map((file, index) => `
        <li>
            ${file.name} 
            <span class="close" data-index="${index}">×</span>
            <hr style="border-color: #ccc;">
        </li>
    `).join('') + '</ul>');
    $('.close').click(function () {
        const index = $(this).data('index');
        removeFile(index);
    });
    $(fileInput).closest('.upload-area').hide();
    let progress = 0;
    // Check if "Uploading files..." is already added
    let uploadingTextAdded = false;

    let interval = setInterval(function () {
        progress += 10;
        progressBar.text(progress + '%');
        progressBar.css('width', progress + '%');

        // Show "Uploading files..." only once
        if (progress < 100 && !uploadingTextAdded) {
            $('#status').prepend('<p class="font-md color-brand-1 mt-20 mb-20">Uploading files...</p>');
            uploadingTextAdded = true; // Prevent adding the message again
        }


        if (progress >= 100) {
            clearInterval(interval);
            $('#status').find('p:contains("Uploading files...")').remove();
            $('#status').append('<p class="font-md color-brand-1 mt-20 mb-20">Files uploaded successfully!</p>');
            $('#submitBtn').prop('disabled', false); // Enable the submit button
        }
    }, 500);
}

function removeFile(index) {
    allFiles.splice(index, 1);
    $('#status').html('<p class="font-md color-brand-1 mt-20 mb-20">Selected Files:</p><ul>' + allFiles.map((file, index) => `
        <li>
            ${file.name} 
            <span class="close" data-index="${index}">×</span>
            <hr style="border-color: #ccc;">
        </li>
    `).join('') + '</ul>');
    $('.close').click(function () {
        const index = $(this).data('index');
        removeFile(index);
    });

    if (allFiles.length === 0) {
        $('.progress-bar-container').hide();
    }

    if (allFiles.length === 0) {
        $('#submitBtn').prop('disabled', true);
    }
}

function createFileInput() {
    const input = $('<input type="file" multiple />');
    input.on('change', function () {
        uploadFiles(input[0]);
    });
    return input;
}

$('.upload-area').click(function () {
    const input = createFileInput();
    input.trigger('click');
});

/*docupload end*/

/*rands script*/
function formatCurrency(input) {


    // Keep cursor position

    const cursorPos = input.selectionStart;


    // Remove everything except digits

    let value = input.value.replace(/[^\d]/g, '');


    if (!value) {

        input.value = '';

        return;

    }


    // Format using US locale (comma separator)

    input.value = Number(value).toLocaleString("en-US");


    // Restore cursor (basic handling)

    input.setSelectionRange(input.value.length, input.value.length);

}

/*animation script*/

document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll('.zoom-in');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // animate only once
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(el => observer.observe(el));
});

/*calander*/
const fp = flatpickr("#datetimeInput", {
    dateFormat: "Y-m-d",
    disableMobile: true, // Force Flatpickr to use the custom calendar even on mobile


});

// Trigger Flatpickr on icon click
document.getElementById("calendarIcon").addEventListener("click", function () {
    fp.open();
});


/*const provinces = [
    "Eastern Cape",
    "Free State",
    "Gauteng",
    "KwaZulu-Natal",
    "Limpopo",
    "Mpumalanga",
    "North West",
    "Northern Cape",
    "Western Cape"
];

const input = document.getElementById("province");
const listContainer = document.getElementById("autocomplete-list");

input.addEventListener("input", function () {
    const val = this.value.toLowerCase();
    listContainer.innerHTML = "";

    if (!val) return;

    const filtered = provinces.filter(p => p.toLowerCase().includes(val));

    filtered.forEach(province => {
        const item = document.createElement("div");
        item.classList.add("autocomplete-item");
        item.textContent = province;
        item.addEventListener("click", function () {
            input.value = province;
            listContainer.innerHTML = "";
        });
        listContainer.appendChild(item);
    });
});

document.addEventListener("click", function (e) {
    if (e.target !== input) {
        listContainer.innerHTML = "";
    }
});
*/
function logOffersDetails(person) {
 
    var post_data = {
                    "PhoneNumber": $mobile.val(),
                    "Offers": person.offers,
                    "utm_source": $("#utmSource").val() || utm_source, 
                    "utm_medium": $("#utmMedium").val() || utm_medium,
                    "utm_campaign": $("#utmCampaign").val()|| utm_campaign                
                };
 
    $.ajax({
        headers: { '__RequestVerificationToken':  person?.token },
        url: '/umbraco/surface/QuickLoans/LogOffersDetails',
        type: "POST",
        data: postData,
        success: function (response) {
            console.log(response);
        },
        error: function (xhr, status, error) {
            console.error(error);
        }
    });
}
/*var post_data = {
                    "PersonalDetailsRequestString": personalDetails,
                    "PhoneNumber": $mobile.val(),
                    "FinancialDetails": null,
                    "OTPValue": null,
                    "Offers": null,
                    "SelectedOffer": null,
                    "utm_source": $("#utmSource").val() || utm_source, 
                    "utm_medium": $("#utmMedium").val() || utm_medium,
                    "utm_campaign": $("#utmCampaign").val()|| utm_campaign                
                };
               

                 $.ajax({
                    headers: { '__RequestVerificationToken':  person?.token },
                    url: '/umbraco/surface/QuickLoans/LogPersonalDetails',
                    type: "POST",*/
 function handleBoxInput(el, index) {
        const inputs = document.querySelectorAll(".otp-input");

        // Move to next box on valid input
        if (el.value && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }

        // Combine values into hidden field
        let otp = '';
        inputs.forEach(input => {
            otp += input.value.replace(/\D/g, '');
        });

        document.getElementById('oneTimePIN').value = otp;

        // Trigger native 'input' event on hidden field to invoke your existing logic
        otpInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Optional: allow navigation with backspace/arrow keys
    document.querySelectorAll('.otp-input').forEach((input, idx, inputs) => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) {
                inputs[idx - 1].focus();
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                inputs[idx - 1].focus();
            } else if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
            }
        });
    });
     $('#consentCheckbox').on('change', function () {
        const isChecked = $(this).is(':checked');
        const $registerBtn = $('#registerBtn');

        if (isChecked) {
            $registerBtn.prop('disabled', false);
        } else {
            $registerBtn.prop('disabled', true);
        }
    });
    
/*function acceptOffer() {
  // Hide loan offers section
  document.getElementById('personaloanoffers').style.display = 'none';
  
  // Show congratulations screen
  document.getElementById('congratsScreen').classList.remove('hidden');
}

function goBackToOffers() {
  // Hide congrats screen
  document.getElementById('congratsScreen').classList.add('hidden');
  
  // Show loan offers section again
  document.getElementById('personaloanoffers').style.display = 'block';
}
*/