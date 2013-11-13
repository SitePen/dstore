define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/when',
	'../Store'
], function(declare, lang, when, Store){
// module:
//		An adapter that allows a dojo/store object to be used as a dstore store object.

	function delegateMethod(methodName, thisObj){
		thisObj[methodName] = function(){
			var store = this.store;
			return store[methodName] && store[methodName].apply(store, arguments);
		};
	}

	return declare(Store, {
		// store:
		//		The dojo/store object to be converted to a dstore object
		store: null,

		_query: null,
		_queryOptions: null,

		constructor: function(options){
			lang.mixin(this, options);
			this._queryOptions = {};

			var store = this.store;
			if(store){
				this.idProperty = store.idProperty || 'id';
				this.queryEngine = store.queryEngine;
			}

			var methods = ['getIdentity', 'add', 'put', 'remove', 'transaction', 'getChildren', 'getMetadata'];
			for(var i = 0; i < methods.length; i++){
				delegateMethod(methods[i], this);
			}
		},

		get: function(id){
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
			var self = this;
			return when(this.store.get(id), function(object){
				return self.assignPrototype(object);
			});
		},

		filter: function(query){
			// summary:
			//		Filters the collection, returning a new subset collection
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// returns: StoreAdapter
			return lang.delegate(this, {
				query: query
			});
		},

		sort: function(property, descending){
			// summary:
			//		Sorts the collection, returning a new collection with the objects sorted
			// property: String|Function
			//		The property to sort on. Alternately a function can be provided to sort with
			// descending?: Boolean
			//		Indicate if the sort order should be descending (defaults to ascending)
			// returns: StoreAdapter
			var sort;
			if(typeof property === 'function'){
				sort = property;
			}else{
				var options = this.queryOptions;
				var fieldSort = {
					attribute: property,
					descending: descending != null && descending
				};
				if(options && Object.prototype.toString.call(options.sort) === '[object Array]'){
					sort = options.sort.slice(0);
					sort.unshift(fieldSort);
				}else{
					sort = [ fieldSort ];
				}
			}
			return lang.delegate(this, {
				queryOptions: lang.delegate(this.queryOptions, { sort: sort })
			});
		},

		range: function(start, end){
			// summary:
			//		Retrieves a range of objects from the collection, returning a new collection with the objects indicated by the range
			// start: Number
			//		The starting index of objects to return (0-indexed)
			// end?: Number
			//		The exclusive end of objects to return
			// returns: StoreAdapter
			var options = lang.delegate(this.queryOptions, { start: start });
			if(end){
				options.count = end - start;
			}
			return lang.delegate(this, {
				queryOptions: options
			});
		},

		forEach: function(callback, thisObj){
			// summary:
			//		Iterates over the query results, based on
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach.
			//		Note that this may executed asynchronously. The callback may be called
			//		after this function returns.
			// callback:
			//		Function that is called for each object in the query results
			// thisObject:
			//		The object to use as |this| in the callback.
			var self = this;
			var results = this.store.query(this.query, this.queryOptions);
			if(results){
				results.forEach(function(obj){
					callback.call(thisObj, self.assignPrototype(obj));
				}, thisObj);
			}
			return results;
		}
	});
});
