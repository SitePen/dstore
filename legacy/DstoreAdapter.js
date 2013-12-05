define([
	'dojo/_base/declare',
	'dojo/_base/lang'
	/*=====, "dojo/store/api/Store" =====*/
], function(declare, lang /*=====, Store =====*/){
// module:
//		An adapter mixin that makes a dstore store object look like a dojo/store object.

	// No base class, but for purposes of documentation, the base class is dojo/store/api/Store
	var base = null;
	/*===== base = Store; =====*/

	var DstoreAdapter = declare(base, {

		query: function(query, options){
			// summary:
			//		Queries the store for objects. This does not alter the store, but returns a
			//		set of data from the store.
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// options: dojo/store/api/Store.QueryOptions
			//		The optional arguments to apply to the resultset.
			// returns: dojo/store/api/Store.QueryResults
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
			var results = this.filter(query);

			if(options){
				// Apply sorting
				var sort = options.sort;
				if(sort){
					if(Object.prototype.toString.call(sort) === '[object Array]'){
						var sortOptions;
						while((sortOptions = sort.pop())){
							results = results.sort(sortOptions.attribute, sortOptions.descending);
						}
					}else{
						results = results.sort(sort);
					}
				}
				// Apply a range
				var start = options.start;
				var end = start != null && options.count && (start + options.count);
				results = results.range(start, end);
			}
			return results.map(function(object){
				return object;
			});
		}
	});

	DstoreAdapter.adapt = function(obj, config){
		// summary:
		//		Adapts an existing dstore object to behave like a dojo/store object.
		// obj: Object
		//		A dstore object that will have an adapter applied to it.
		// config: Object?
		//		An optional configuration object that will be mixed into the adapted object.
		//
		obj = declare.safeMixin(obj, new DstoreAdapter());
		if(config){
			obj = lang.mixin(obj, config);
		}
		return obj;
	};

	return DstoreAdapter;
});
