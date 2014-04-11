define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/when',
	'../Store'
], function (declare, lang, arrayUtil, when, Store) {
// module:
//		An adapter mixin that makes a legacy Dojo object store look like a dstore object.

	var modifyDelegate = function (name) {
		return function () {
			var root = this.root;
			if (root && root !== this) {
				return root[name].apply(root, arguments);
			}
			return this.inherited(arguments);
		};
	};
	var StoreAdapter = declare(Store, {

		get: function () {
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
			var self = this;
			var root = this.root;
			if (root && root !== this) {
				return this.get.apply(root, arguments);
			}
			return when(this.inherited(arguments), function (object) {
				return self._restore(object);
			});
		},

		put: modifyDelegate('put'),
		add: modifyDelegate('add'),
		remove: modifyDelegate('remove'),

		fetch: function () {
			// summary:
			//		Fetches the query results. Note that the fetch may occur asynchronously
			// returns: Array|Promise
			//		The results or a promise for the results

			// create an object store query and query options based on current collection
			// information
			var queryOptions = {},
				queryLog = this.queryLog,
				getQueryArguments = function (type) {
					return arrayUtil.map(
						arrayUtil.filter(queryLog, function (entry) { return entry.type === type; }),
						function (entry) {
							return entry.argument;
						}
					);
				};

			// take the last sort since multiple sorts are not supported by dojo/store
			var sorted = getQueryArguments('sort').pop();
			if (sorted) {
				queryOptions.sort = sorted;

				if (sorted instanceof Array) {
					// object stores expect an attribute property
					for (var i = 0; i < sorted.length; i++) {
						var sortSegment = sorted[i];
						sortSegment.attribute = sortSegment.property;
					}
				}
			}

			var ranged = getQueryArguments('range');
			if (ranged.length > 1) {
				console.warn(
					'Chaining multiple ranges is not supported for dojo/store. Only the first range will be used.'
				);
			}
			ranged = ranged.shift();
			if (ranged) {
				// set the range
				queryOptions.count = ranged.end - ((queryOptions.start = ranged.start) || 0);
			}

			var filtered = getQueryArguments('filter');
			// TODO: It seems strange to just use the first filter without a warning we are discarding the others.
			//		Maybe we should try to compose multiple filters into a single filter?
			//		Though it may be an inaccurate composition if more than one filter mentions the same property.
			var results = (this.root || this).query(filtered[0] || {}, queryOptions);
			if (results) {
				var total = results.total;
				// apply the object restoration
				results = results.map(this._restore, this);
				results.total = total;
			}
			return results;
		},
		_createSubCollection: function() {
			var collection = Store.prototype._createSubCollection.apply(this, arguments);
			collection.root = this.root || this;
			return collection;
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
