(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", 'dojo-core/Promise', './query-results'], function (require, exports) {
    var Promise_1 = require('dojo-core/Promise');
    var query_results_1 = require('./query-results');
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
    function promised(method, query) {
        return function () {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var promise = new Promise_1.default(function (resolve, reject) {
                resolve(_this[method](args));
            });
            if (query) {
                // need to create a QueryResults and ensure the totalLength is
                // a promise.
                var queryResults = query_results_1.default(promise);
                queryResults.totalLength = when(queryResults.totalLength);
                return queryResults;
            }
            return promise;
        };
    }
    exports.get = promised('getSync');
    exports.put = promised('putSync');
    exports.add = promised('addSync');
    exports.remove = promised('removeSync');
    exports.fetch = promised('fetchSync', true);
    exports.fetchRange = promised('dddd', false);
});
