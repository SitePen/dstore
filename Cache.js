define([
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/json',
	'dojo/when',
	'dojo/_base/declare',
	'./Store',
	'./Memory'
], function (lang, arrayUtil, JSON, when, declare, Store, Memory) {

	// module:
	//		dstore/Cache

	return declare(Store, {
		cachingStore: null,
		constructor: function (options) {
			for (var i in options) {
				// mixin the options
				this[i] = options[i];
			}
			if (!this.cachingStore) {
				this.cachingStore = new Memory();
			}
			if (!this.queryEngine) {
				this.queryEngine = this.cachingStore.queryEngine;
			}
			this.cachingStore.model = this.model;
			this.cachingStore.idProperty = this.idProperty;
			this._collectionCache = {};
		},
		_tryCacheForResults: function (method, serialized, args) {
			serialized = method + ':' + serialized;

			var cacheable = !this.canCacheQuery || this.canCacheQuery(method, args);

			if (cacheable && this._collectionCache[serialized]) {
				return this._collectionCache[serialized];
			} else {
				var self = this,
					subCollection;

				if (this.allLoaded) {
					subCollection = this._createSubCollection({});

					// if we have loaded everything, we can go to the caching store
					// for quick client side querying

					// wait for it to finish loading
					subCollection.allLoaded = subCollection.data = when(this.allLoaded, function () {
						var cachingStore = self.cachingStore,
							subCachingStore = cachingStore[method].apply(cachingStore, args);
						subCollection.cachingStore = subCachingStore;

						var data = subCachingStore.fetch();
						subCollection.total = subCachingStore.total;

						return data;
					});
				} else {
					// nothing in the cache, have to use the inherited method to perform the action
					subCollection = this.inherited(args);
				}

				if (cacheable) {
					this._collectionCache[serialized] = subCollection;
				}

				return subCollection;
			}
		},
		_createSubCollection: function (kwArgs) {
			kwArgs = lang.delegate(kwArgs);
			// each sub collection should have it's own collection cache and caching store
			kwArgs._collectionCache = {};
			if (!('cachingStore' in kwArgs)) {
				kwArgs.cachingStore = new this.cachingStore.constructor();
			}
			return this.inherited(arguments, [ kwArgs ]);
		},
		sort: function (property, descending) {
			return this._tryCacheForResults('sort',
				JSON.stringify(property) + (descending ? '-' : '+'), arguments);
		},
		filter: function (query) {
			return this._tryCacheForResults('filter',
				JSON.stringify(query), arguments);
		},
		range: function (start, end) {
			return this._tryCacheForResults('range',
				start + '-' + end, arguments);
		},
		fetch: function () {
			var cachingStore = this.cachingStore;
			var store = this;
			/* jshint boss: true */
			return this.allLoaded || (this.allLoaded = when(this.inherited(arguments), function (results) {
				// store each object before calling the callback
				arrayUtil.forEach(results, function (object) {
					// store each object before calling the callback
					if (!store.isLoaded || store.isLoaded(object)) {
						cachingStore.put(object);
					}
				});

				return results;
			}));
		},
		// canCacheQuery: Function
		//		This function can be overriden to provide more specific functionality for
		// 		determining if a query should go to the master store or the caching store.
		//		This will be called with the query method (sort, filter, or range), and the
		//		arguments, and should return true or false indicating if the query is cacheable.

		// isLoaded: Function
		//		This function can be overriden to specify if individual objects can be cached
		//		(if they are a fully loaded representation, that can be cached for later retrieval through
		//		get()). This is called with an object, and can return true or false to indicate
		//		if it is fully loaded cacheable object.

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
			return when((this.store && this.store !== this) ? // check to see if we need to delegate to store
					this.store.add(object, directives) : this.inherited(arguments), function (result) {
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
			return when((this.store && this.store !== this) ? // check to see if we need to delegate to store
					this.store.put(object, directives) : this.inherited(arguments), function (result) {
				// now put result in cache
				cachingStore.put(object && typeof result === 'object' ? result : object, directives);
				// the result from the put should be dictated by the master store and be unaffected by the cachingStore
				return result;
			});
		},
		remove: function (id, directives) {
			var cachingStore = this.cachingStore;
			return when((this.store && this.store !== this) ? // check to see if we need to delegate to store
					this.store.remove(id, directives) : this.inherited(arguments), function (result) {
				return when(cachingStore.remove(id, directives), function () {
					return result;
				});
			});
		},
		evict: function (id) {
			return this.cachingStore.remove(id);
		}
	});
});
