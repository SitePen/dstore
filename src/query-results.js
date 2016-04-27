(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", 'dojo-core/lang', 'dojo-core/Promise'], function (require, exports) {
    var lang_1 = require('dojo-core/lang');
    var Promise_1 = require('dojo-core/Promise');
    // boodman/crockford delegation w/ cornford optimization
    var TMP = (function () {
        function TMP() {
        }
        return TMP;
    })();
    function delegate(obj, props) {
        TMP.prototype = obj;
        var tmp = new TMP();
        TMP.prototype = null;
        if (props) {
            lang_1.mixin(tmp, props);
        }
        return tmp; // Object
    }
    function when(valueOrPromise, callback) {
        var receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";
        if (!receivedPromise) {
            if (arguments.length > 1) {
                return callback ? callback(valueOrPromise) : valueOrPromise;
            }
            else {
                return new Promise_1.default(function (resolve, reject) {
                    resolve(valueOrPromise);
                });
            }
        }
        if (callback) {
            return valueOrPromise.then(callback);
        }
        return valueOrPromise;
    }
    function forEach(callback, instance) {
        return when(this, function (data) {
            for (var i = 0, l = data.length; i < l; i++) {
                callback.call(instance, data[i], i, data);
            }
        });
    }
    function default_1(data, options) {
        var hasTotalLength = options && 'totalLength' in options;
        if (data.then) {
            data = delegate(data);
            // a promise for the eventual realization of the totalLength, in
            // case it comes from the resolved data
            var totalLengthPromise = data.then(function (data) {
                // calculate total length, now that we have access to the resolved data
                var totalLength = hasTotalLength ? options.totalLength :
                    data.totalLength || data.length;
                // make it available on the resolved data
                data.totalLength = totalLength;
                // don't return the totalLength promise unless we need to, to avoid
                // triggering a lazy promise
                return !hasTotalLength && totalLength;
            });
            // make the totalLength available on the promise (whether through the options or the enventual
            // access to the resolved data)
            data.totalLength = hasTotalLength ? options.totalLength : totalLengthPromise;
            // make the response available as well
            data.response = options && options.response;
        }
        else {
            data.totalLength = hasTotalLength ? options.totalLength : data.length;
        }
        data.forEach = forEach;
        return data;
    }
    exports.default = default_1;
});
