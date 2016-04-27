(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    /**
     * The constructor for a dstore collection query method.  It encapsulates the following:
     * * Creating a new subcollection for the query results
     * * Logging the query in the collection's `queryLog`
     * * Normalizing query arguments
     * * Applying the query engine
     *
     * @param kwArgs The properties that define the query method
     * @return A function that takes query arguments and returns a new collection with the query associated with it
     */
    function QueryMethod(kwArgs) {
        var type = kwArgs.type;
        var normalizeArguments = kwArgs.normalizeArguments;
        var applyQuery = kwArgs.applyQuery;
        var defaultQuerierFactory = kwArgs.querierFactory;
        return function () {
            var originalArguments = Array.prototype.slice.call(arguments);
            var normalizedArguments = normalizeArguments ?
                normalizeArguments.apply(this, originalArguments) :
                originalArguments;
            var logEntry = {
                type: type,
                arguments: originalArguments,
                normalizedArguments: normalizedArguments
            };
            // TODO: coerce to Store<T> once that's converted
            // (though we'd need to expose _getQuerierFactory for this to work as-is... maybe there's a better way?)
            var store = this;
            var querierFactory = store._getQuerierFactory(type) || defaultQuerierFactory;
            if (querierFactory) {
                // Call the query factory in store context to support things like
                // mapping a filter query's string argument to a custom filter method on the collection
                logEntry.querier = querierFactory.apply(store, normalizedArguments);
            }
            var newCollection = store._createSubCollection({
                queryLog: store.queryLog.concat(logEntry)
            });
            return applyQuery ? applyQuery.call(store, newCollection, logEntry) : newCollection;
        };
    }
    exports.default = QueryMethod;
    ;
});
