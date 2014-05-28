define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/store/util/QueryResults'
	/*=====, "dstore/api/Store" =====*/
], function (declare, arrayUtil, QueryResults /*=====, Store =====*/) {
// module:
//		An adapter mixin that makes a dstore store object look like a legacy Dojo object store.

	// No base class, but for purposes of documentation, the base class is dstore/api/Store
	var base = null;
	/*===== base = Store; =====*/

	var adapterPrototype = {

		// store:
		//		The dstore store that is wrapped as a Dojo object store
		store: null,

		constructor: function (kwArgs) {
			declare.safeMixin(this, kwArgs);
		},

		query: function (query, options) {
			// summary:
			//		Queries the store for objects. This does not alter the store, but returns a
			//		set of data from the store.
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// options: dstore/api/Store.QueryOptions
			//		The optional arguments to apply to the resultset.
			// returns: dstore/api/Store.QueryResults
			//		The results of the query, extended with iterative methods.
			//
			// example:
			//		Given the following store:
			//
			//	...find all items where "prime" is true:
			//
			//	|	store.query({ prime: true }).forEach(function(object){
			//	|		// handle each object
			//	|	});
			var results = this.store.filter(query);

			if (options) {
				// Apply sorting
				var sort = options.sort;
				if (sort) {
					if (Object.prototype.toString.call(sort) === '[object Array]') {
						var sortOptions;
						while ((sortOptions = sort.pop())) {
							results = results.sort(sortOptions.attribute, sortOptions.descending);
						}
					} else {
						results = results.sort(sort);
					}
				}
				// Apply a range
				var start = options.start;
				var end = start != null && options.count && (start + options.count);
				results = results.range(start, end);
			}
			return new QueryResults(results.map(function (object) {
				return object;
			}));
		}
	};

	var delegatedMethods = [ 'get', 'put', 'add', 'remove', 'getIdentity' ];
	arrayUtil.forEach(delegatedMethods, function (methodName) {
		adapterPrototype[methodName] = function () {
			var store = this.store;
			return store[methodName].apply(store, arguments);
		};
	});

	return declare(base, adapterPrototype);
});
