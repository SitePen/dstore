define([
	'dojo/_base/declare',
	'dojo/_base/lang'
	/*=====, "dojo/store/api/Store" =====*/
], function(declare, lang /*=====, Store =====*/){
// module:
//		An adapter that allows a dstore store object to be used as a dojo/store object.

	// No base class, but for purposes of documentation, the base class is dojo/store/api/Store
	var base = null;
	/*===== base = Store; =====*/

	function delegateMethod(methodName, thisObj){
		thisObj[methodName] = function(){
			var store = this.store;
			return store[methodName] && store[methodName].apply(store, arguments);
		};
	}

	return declare(base, {
		// store:
		//		The dstore object to be converted to a dojo/store object
		store: null,

		constructor: function(options){
			lang.mixin(this, options);

			var store = this.store;
			if(store){
				this.idProperty = store.idProperty || 'id';
				this.queryEngine = store.queryEngine;
			}

			var methods = ['get', 'getIdentity', 'add', 'put', 'remove', 'transaction', 'getChildren', 'getMetadata'];
			for(var i = 0; i < methods.length; i++){
				delegateMethod(methods[i], this);
			}
		},

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
			var store = this.store;
			store = store.filter(query);

			if(options){
				// Apply sorting
				var sort = options.sort;
				if(sort){
					if(Object.prototype.toString.call(sort) === '[object Array]'){
						var sortOptions;
						while((sortOptions = sort.pop())){
							store = store.sort(sortOptions.attribute, sortOptions.descending);
						}
					}else{
						store = store.sort(sort);
					}
				}
				// Apply a range
				var start = options.start;
				var end = start != null && options.count && (start + options.count);
				store = store.range(start, end);
			}
			return store.map(function(object){
				return object;
			});
		}
	});
});
