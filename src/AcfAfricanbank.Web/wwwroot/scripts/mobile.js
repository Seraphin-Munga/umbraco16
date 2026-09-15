var AJAX = (function () {
    var obj = {};
    obj.rootPath = '';
    obj.url = '';
    obj.headers = '';
    // AJAX Request
    obj.request = function (url, opts) {
        var info = {
            data: null,
            beforeSend: function () { },
            success: function () { },
            failure: function () { },
            error: function (req, txt, err) {
                alert('AJAX.request - Error occurred.' + txt);
            },
            type: "POST"
        };
        if (!url || typeof url != 'string') {
            alert('AJAX.request - url missing/invalid');
        } else {
            obj.url = url;
        }
        if (opts) {
            if (opts.data) {
                info.data = opts.data;
            }
            if (opts.success) {
                info.success = opts.success;
            }
            if (opts.failure) {
                info.failure = opts.failure;
            }
            if (opts.error) {
                info.error = opts.error;
            }
            if (opts.beforeSend) {
                info.beforeSend = opts.beforeSend;
            }
            if (opts.type) {
                info.type = opts.type;
            }
        }

        $.ajax({
            url: obj.rootPath + obj.url,
            data: info.data,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            dataType: 'json',
            type: info.type,
            beforeSend: info.beforeSend,
            success: info.success,
            error: info.error,
            headers: obj.headers
        });
    }
    return obj;
} ());