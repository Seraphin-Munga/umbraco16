$(document).ready(function () {
    var provinces = [];
    $(function (ab, $) {

        if (!$('#branchForm').length > 0) {
            return;
        };
        AJAX.rootPath = 'https://mobile.africanbank.co.za';
        AJAX.headers = {"ITSAPP-DEVICE": "CMS","ITSAPP-LANG": 'en-GB' };
        var branchServiceUrl = "/public/branches/list"; // "/public/branches/list";
        $("#BranchPreloader").show(); $("#Branchloader").show();
        $("#branch-finder-form").hide();



        AJAX.request(branchServiceUrl, {
     
            data: "",
            beforeSend: function(xhr) {
                xhr.setRequestHeader('itsapp-device', 'CMS' , 'sec-fetch-dest', 'empty', 'sec-fetch-mode', 'cors');
               //  xhr.setRequestHeader('sec-fetch-dest', 'empty' );
               //  xhr.setRequestHeader('sec-fetch-mode', 'cors' );
              },
            success: function (e) {

                if (e.Status == "Ok") {
                    provinces = e.Result;
                    $("#BranchPreloader").hide(); $("#Branchloader").hide(); $("#branch-finder-form").slideDown();

                } else {
                    var baseErrorMsg = "An error occurred while trying to load the content for this section:unknown network error";
                   
                    showErrorMsg(baseErrorMsg)

                    $("#BranchPreloader").hide(); $("#Branchloader").hide(); $("#branch-finder-form").slideDown();
                }
                
            },
            error: function (req, textStatus, errorThrown) {
                var baseErrorMsg = "An error occurred while trying to load the content for this section:";
                var errorMsg = ab.utilities.isNull(
                    typeof errorThrown === "string" ? errorThrown
                        : textStatus, "unknown network error");
                showErrorMsg(baseErrorMsg + errorMsg)
               
                $("#BranchPreloader").hide(); $("#Branchloader").hide(); $("#branch-finder-form").slideDown();
            }, type: 'GET'
        });      

        function showErrorMsg(errorMsg) {

            $("#feedbackMsg")
                .removeClass('hidden')
                .text(errorMsg)
                .show();

            $(".area_input").hide();
                    }

    }(window.ab = window.ab || {}, jQuery));

    $(function (ab, $) {

        var $branch_list = $('#branch-list');
        if (!$branch_list.length > 0) {
            return;
        };

        var $form = $('#branchForm'),

            currentTowns = {},
            pointOfSales = [],
            branchesList = [],
            province,

            theTemplateScript = $('#address-template').html(),          // Grab the template script
            theTemplate = Handlebars.compile(theTemplateScript),  // Compile the template
            theCompiledHtml;

        hideErrorMsg();

        $("#townName")
            .unbind() // Unbind previous default bindings
            .bind("input", function (e) { // Bind for field changes
                // Search if enough characters, or search cleared with backspace
                if (this.value.length >= 3 || this.value == "") {
                    searchForBranch();

                    $('.branch-locator-map').css({ "background-color": "white", "background-image": "none" });
                    $('#load_map').hide();
                    $('#branch-locator-items').show();

                }
            })
            .bind("keydown", function (e) { // Bind for enter key press
                // Search when user presses Enter
                if (e.keyCode == 13) {

                    $('.branch-locator-map').css({ "background-color": "white", "background-image": "none" });
                    $('#load_map').hide();
                    $('#branch-locator-items').show();
                    searchForBranch();
                }
            });

        $form.submit(function (event) {
            event.preventDefault();
            searchForBranch();
        });

        function searchForBranch() {
            var townName = $("#townName").val(),
                isDisabled = false;

            townName = ab.utilities.capitalizeFirstLetterString(townName);

            if (townName && townName.length > 1) {

                ab.utilities.scrollToElem($("#townName"));
                hideErrorMsg();
                var filteredBranches = filterBranchesByTown(townName);
                if (filteredBranches.length > 0) {

                 //   console.log("branch count " +  JSON.stringify( filteredBranches));
                    displayBranches(filteredBranches);
                    reactivateBtn(isDisabled);
                } else {

                    reactivateBtn(isDisabled);
                    $(".branch-total-container").addClass('hidden');
                    $(".branch-total-container").slideUp();
                    $('.table-responsive').addClass('hidden');
                    showErrorMsgSecond('No results were found, please try another search');
                }

            } else {

                reactivateBtn(isDisabled);
                $('.table-responsive').addClass('hidden');
                showErrorMsgSecond(' Please provide a town name ');
            }
        }


        function reactivateBtn(isDisabled) {
            $(".findBranch").attr("disabled", isDisabled);
        }

        function filterBranchesByTown(search) {
            var allBranches = _.chain(provinces).value();
            return _.filter(allBranches, function (branch) {
                if (branch.BranchName.indexOf(search.toUpperCase())!=-1) {

                    //console.log("Area " + branch.Area + " match is ->" + (branch.Area.toUpperCase().indexOf(search.toUpperCase()) != -1));
                    //console.log("PhysicalAddress1 " + branch.PhysicalAddress1 + " match is ->" + (branch.PhysicalAddress1.indexOf(search.toUpperCase()) != -1));
                    //console.log("PhysicalAddress2 " + branch.PhysicalAddress1 + " match is ->" + (branch.PhysicalAddress2.indexOf(search.toUpperCase()) != -1));
                    //console.log("PhysicalAddress3 " + branch.PhysicalAddress1 + " match is ->" + (branch.PhysicalAddress3.indexOf(search.toUpperCase()) != -1));
                    //console.log("BranchName " + branch.BranchName + " match is ->" + (branch.BranchName.indexOf(search.toUpperCase()) != -1));
                    //console.log("Town " + branch.Town + " match is ->" + (branch.Town.indexOf(search.toUpperCase()) != -1));
                    //console.log("Province " + branch.Province + " match is ->" + (branch.Province.indexOf(search.toUpperCase()) != -1));
                    //console.log("++++++++++++++++++++++++++++++++");
              
                    return branch.Area.toUpperCase().indexOf(search.toUpperCase()) != -1 ||
                        branch.PhysicalAddress1.toUpperCase().indexOf(search.toUpperCase()) != -1 ||
                        branch.PhysicalAddress2.toUpperCase().indexOf(search.toUpperCase()) != -1 ||
                        branch.PhysicalAddress3.toUpperCase().indexOf(search.toUpperCase()) != -1 ||
                        branch.BranchName.toUpperCase().indexOf(search.toUpperCase()) != -1 ||
                        branch.Town.toUpperCase().indexOf(search.toUpperCase()) != -1 ||
                        branch.Province.toUpperCase().indexOf(search.toUpperCase()) != -1;
                }             
            });

            /*
            // Reset the temp collections
            currentTowns = {};
            branches = [];
    
            for (var i = 0; i < provinces.length; i++) {
    
                province = provinces[i];
    
    
                currentTowns = province.towns.filter(function (town) {
                    return town.town != null && town.town.indexOf(search) != -1;
                });
    
                if (currentTowns != null && currentTowns.length > 0) {
    
                    for (var j = 0; j < currentTowns.length; j++) {
    
                        branches.push(currentTowns[j]);
                    }
                }
            }
    
            return branches;
    
            */

        }

        function getBranches(pointOfSales) {

            if (pointOfSales.length == 0) {
                showErrorMsgSecond(' Please enter a town Name ');
                return;
            }

            branchesList = [];
            for (var i = 0; i < pointOfSales.length; i++) {
                branchesList.push(pointOfSales[i].branches);
            }
            return branchesList;
        }

        function displayBranches(provinceList) {
            var branchesList = _.flatten(provinceList, true);
            // Clean out previous search results
            $branch_list.empty();
            $('.table-responsive.hidden').removeClass('hidden');
            //var map;
            $.each(branchesList, function (index, branch) {
             //   console.log("bracnh-->" ,JSON.stringify(branch,null,2));
                // Add a temp ID so each more info has a unique ID
                // for targeting
                branch.tempID = index;

                // Add a tick icon if the pos / cam is set to 1
                // So the display isn't the default 0 or 1 values
                if (parseInt(branch.POS) === 0) { branch.POS = '-' }
                if (parseInt(branch.POS) === 1) { branch.POS = '<i class="glyphicon glyphicon-ok"></i>' }
                if (parseInt(branch.CAM) === 0) { branch.CAM = '-' }
                if (parseInt(branch.CAM) === 1) { branch.CAM = '<i class="glyphicon glyphicon-ok"></i>' }

                // Pass our data to the template
                theCompiledHtml = theTemplate(branch);

                // Add the compiled html to the page
                $branch_list.append(theCompiledHtml);

                var lat = branch.Latitude;
                var long = branch.Longitude;

                function initMap() {
                    var map = new google.maps.Map(document.getElementById("branchmap_" + index), {
                        zoom: 13,
                        center: { lat: parseFloat(lat), lng: parseFloat(long) },
                        scrollwheel: false,
                        mapTypeId: google.maps.MapTypeId.TERRAIN
                    });
                    var marker = new google.maps.Marker({
                        map: map,
                        position: { lat: parseFloat(lat), lng: parseFloat(long) },
                        title: branch.BranchName
                    });
                }

                $('#branch_' + index).on('click', function () {
                    var $moreInfoBlock = $("#branch_" + index + "_more");
                    $('[id^=branch_]:not([id$=_more])').removeClass('active-branch');
                    if ($moreInfoBlock.css('display') === "block") {
                        $('[id^=branch_]:not([id$=_more])').slideDown(300, function () {
                            $('[id$=more]').slideUp(300);
                        });

                        $(this).find('.more-info i').removeClass().addClass('glyphicon glyphicon-circle-arrow-down');

                    } else if ($("#branch_" + index + "_more").css('display') === "none") {
                        // Closes all branch moreInfoBlock blocks
                        $('[id$=more]:not([id="branch_' + index + '_more"])').slideUp(300);
                        $(this).addClass('active-branch');
                        $(this).find('.more-info i').removeClass().addClass('glyphicon glyphicon-circle-arrow-up');
                        // opens focused moreInfoBlock
                        $moreInfoBlock
                            .slideDown(function () {

                                // Scroll browser to branch focused on by user click
                                ab.utilities.scrollToElem($('#branch_' + index));
                                initMap();
                            });
                    }
                });
            });
        }
        
        function hideErrorMsg() {
            $("#feedbackMsg").hide();
                    }

        function isNullOrUndefined(val) {
            return val === undefined || val === null;        }

        function isNullOrEmpty(val) {
            return val === undefined || val === null || val.length === 0;
        }

        function isNull(value, nullValue) {
            if (isNullOrEmpty(value)) {

                return nullValue;
            }

            return value;
        }


        function showErrorMsgSecond(errorMsg) {

            $("#feedbackMsg")
                .removeClass('hidden')
                .text(errorMsg)
                .show();


        }


    }(window.ab = window.ab || {}, jQuery));
});


