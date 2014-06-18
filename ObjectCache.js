define([
	'dojo/_base/array',
	'dojo/when',
	'dojo/_base/declare',
	'./Store',
	'./Memory'
], function (arrayUtil, when, declare, Store, Memory) {

	// module:
	//		dstore/ObjectCache


	function cachingQuery(type) {
		// ensure querying creates a parallel caching store query
		return function () {
			var subCollection = this.inherited(arguments);
			var cachingCollection = this.cachingCollection || this.cachingStore;
			subCollection.cachingCollection = cachingCollection[type].apply(cachingCollection, arguments);
			return subCollection;
		};
	}

	return declare(Store, {
		cachingStore: null,
		constructor: function (options) {
			declare.safeMixin(options);

			if (!this.cachingStore) {
				this.cachingStore = new Memory();
			}
			if (!this.queryEngine) {
				this.queryEngine = this.cachingStore.queryEngine;
			}
			this.cachingStore.model = this.model;
			this.cachingStore.idProperty = this.idProperty;
		},
		isAvailableInCache: function () {
			return this.allLoaded || this._parent && this._parent.isAvailableInCache();
		},
		fetch: function () {
			// if the data is available in the cache (via any parent), we use fetch from the caching store
			var cachingStore = this.cachingStore;
			var cachingCollection = this.cachingCollection || cachingStore;
			if (this.isAvailableInCache()) {
				return cachingCollection.fetch();
			}
			var store = this;
			return when(this.allLoaded = this.inherited(arguments), function (results) {
				// store each object before calling the callback
				arrayUtil.forEach(results, function (object) {
					// store each object before calling the callback
					if (!store.isLoaded || store.isLoaded(object)) {
						cachingStore.put(object);
					}
				});

				return results;
			});
		},
		// TODO: for now, all forEach() calls delegate to fetch(), but that may be different
		// with IndexedDB, so we may need to intercept forEach as well (and hopefully not
		// double load elements.
		allLoaded: false,
		get: function (id, directives) {
			var cachingStore = this.cachingStore;
			var masterGet = this.getInherited(arguments);
			var masterStore = this;
			// if everything is being loaded, we always wait for that to finish
			return when(this.allLoaded, function () {
				return when(cachingStore.get(id), function (result) {
					if (result !== undefined) {
						return result;
					} else if (masterGet) {
						return when(masterGet.call(masterStore, id, directives), function (result) {
							if (result) {
								cachingStore.put(result, {id: id});
							}
							return result;
						});
					}
				});
			});
		},
		add: function (object, directives) {
			var cachingStore = this.cachingStore;
			return when(this.inherited(arguments), function (result) {
				// now put result in cache (note we don't do add, because add may have
				// called put() and already added it)
				cachingStore.put(object && typeof result === 'object' ? result : object, directives);
				// the result from the add should be dictated by the master store and be unaffected by the cachingStore
				return result;
			});
		},
		put: function (object, directives) {
			// first remove from the cache, so it is empty until we get a response from the master store
			var cachingStore = this.cachingStore;
			cachingStore.remove((directives && directives.id) || this.getIdentity(object));
			return when(this.inherited(arguments), function (result) {
				// now put result in cache
				cachingStore.put(object && typeof result === 'object' ? result : object, directives);
				// the result from the put should be dictated by the master store and be unaffected by the cachingStore
				return result;
			});
		},
		remove: function (id, directives) {
			var cachingStore = this.cachingStore;
			return when(this.inherited(arguments), function (result) {
				return when(cachingStore.remove(id, directives), function () {
					return result;
				});
			});
		},
		evict: function (id) {
			return this.cachingStore.remove(id);
		},
		_createSubCollection: function () {
			var subCollection = this.inherited(arguments);
			// TODO: Is this going to be added to Store.js?
			subCollection._parent = this;
			return subCollection;
		},

		sort: cachingQuery('sort'),
		filter: cachingQuery('filter'),
		range: cachingQuery('range')

	});
});
