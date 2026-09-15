/*
 Get the Azure endpoints
*/

$(function (ab, $) {
    ab.azureEndpoints = {};
    ab.getAzureEnpoints = function(callback){
        //Check if we already have the endpoints
        if (_.isEmpty(ab.azureEndpoints)) {
            var baseUrl = $('#logged-in-context-site').val(),
                endpoint = baseUrl + '/savings/azure-url'
            $.ajax({
                type       : "GET",
                url        : endpoint,
                success    : function (data) {
                    ab.azureEndpoints = data;
                    if (_.isFunction(callback)){
                        return callback();
                    }
                },
                error : function (error, xhr) {
                    ab.azureEndpoints = {
                        document: "https://africanbank.azureedge.net/documents.xml",
                        content: "https://africanbank.azureedge.net/content.xml"
                    }
                    if (_.isFunction(callback)){
                        return callback();
                    }
                }
            });
        }
    }
}(window.ab = window.ab || {}, jQuery));
