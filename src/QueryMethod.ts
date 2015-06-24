import * as dstore from 'interfaces';

/**
 * Arguments passed to the QueryMethod constructor.
 * * applyQuery: Function receiving the query's new subcollection and log entry and applies it to the subcollection;
 *   useful for collections that need to both declare and implement new query methods
 * * normalizeArguments: Function that normalizes arguments for consumption by a query engine
 * * querierFactory: Factory function that provides a default querier implementation to use if a collection doesn't
 *   define its own querier factory method for this query type
 * * type: The type of query; corresponds to the query log entry's type and the name of the query engine method
 */
export interface QueryMethodArgs<T> {
	applyQuery?: (newCollection: dstore.Collection<T>, logEntry: dstore.QueryLogEntry<T>) => dstore.Collection<T>;
	normalizeArguments?: (...args: any[]) => any[];
	querierFactory?: dstore.QuerierFactory<T>;
	type: string;
}

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
export default function QueryMethod<T>(kwArgs: QueryMethodArgs<T>): (...args: any[]) => dstore.Collection<T> {
	var type = kwArgs.type,
		normalizeArguments = kwArgs.normalizeArguments,
		applyQuery = kwArgs.applyQuery,
		defaultQuerierFactory = kwArgs.querierFactory;

	return function () {
		var originalArguments = Array.prototype.slice.call(arguments);
		var normalizedArguments = normalizeArguments ? normalizeArguments.apply(this, originalArguments) :
			originalArguments;
		var logEntry = <dstore.QueryLogEntry<T>> {
			type: type,
			arguments: originalArguments,
			normalizedArguments: normalizedArguments
		};
		// TODO: coerce to Store<T> once that's converted
		// (though we'd need to expose _getQuerierFactory for this to work as-is... maybe there's a better way?)
		var store = <any> this;
		var querierFactory: dstore.QuerierFactory<T> = store._getQuerierFactory(type) || defaultQuerierFactory;

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
};
