define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/when',
	'../Store'
], function (declare, lang, when, Store) {
// module:
//		An adapter mixin that makes a legacy Dojo object store look like a dstore object.

	var StoreAdapter = declare(Store, {

		constructor: function () {
			this._queryOptions = {};
		},

		get: function () {
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
			var self = this;
			return when(this.inherited(arguments), function (object) {
				return self._restore(object);
			});
		},

		filter: function (query) {
			// summary:
			//		Filters the collection, returning a new subset collection
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// returns: StoreAdapter
			return lang.delegate(this, {
				_query: query
			});
		},

		sort: function (property, descending) {
			// summary:
			//		Sorts the collection, returning a new collection with the objects sorted
			// property: String|Function
			//		The property to sort on. Alternately a function can be provided to sort with
			// descending?: Boolean
			//		Indicate if the sort order should be descending (defaults to ascending)
			// returns: StoreAdapter
			var sort;
			if (typeof property === 'function') {
				sort = property;
			} else {
				var options = this._queryOptions;
				var fieldSort = {
					attribute: property,
					descending: descending != null && descending
				};
				if (options && Object.prototype.toString.call(options.sort) === '[object Array]') {
					sort = options.sort.slice(0);
					sort.unshift(fieldSort);
				} else {
					sort = [ fieldSort ];
				}
			}
			return lang.delegate(this, {
				_queryOptions: lang.delegate(this._queryOptions, { sort: sort })
			});
		},

		range: function (start, end) {
			// summary:
			//		Retrieves a range of objects from the collection, returning a new collection
			//		with the objects indicated by the range
			// start: Number
			//		The starting index of objects to return (0-indexed)
			// end?: Number
			//		The exclusive end of objects to return
			// returns: StoreAdapter
			var options = lang.delegate(this._queryOptions, { start: start });
			if (end) {
				options.count = end - start;
			}
			return lang.delegate(this, {
				_queryOptions: options
			});
		},

		fetch: function () {
			// summary:
			//		Fetches the query results. Note that the fetch may occur asynchronously
			// returns: Array|Promise
			//		The results or a promise for the results
			var results = this.query(this._query, this._queryOptions);
			if (results) {
				results = results.map(this._restore, this);
			}
			return results;
		}
	});

	StoreAdapter.adapt = function (obj, config) {
		// summary:
		//		Adapts an existing dstore object to behave like a dstore object.
		// obj: Object
		//		A dstore object that will have an adapter applied to it.
		// config: Object?
		//		An optional configuration object that will be mixed into the adapted object.
		var adapter = new StoreAdapter();
		// we need to keep any the original store's own properties
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				adapter[i] = obj[i];
			}
		}
		// we now mixin adapter properties
		obj = declare.safeMixin(obj, adapter);
		if (config) {
			obj = lang.mixin(obj, config);
		}

		return obj;
	};

	return StoreAdapter;
});
