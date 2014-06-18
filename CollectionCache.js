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
	//		dstore/CollectionCache
	// This module is responsible for caching the sub collections,
	// so multiple calls to a query method, like filter, with the same params
	// will yield the same collection object, and consequently, potentially the
	// same cached data

	return declare(Store, {
		cachingStore: null,
		constructor: function () {
			this._collectionCache = {};
		},
		canCacheQuery: function (method, args) {
			// summary:
			//		This can return whether or not a given query should
			//		be cached.
			return true;
		},
		_tryCacheForResults: function (method, serialized, args) {
			var cacheable = this.canCacheQuery(method, args);
			serialized = method + ':' + serialized;

			if (cacheable && this._collectionCache[serialized]) {
				return this._collectionCache[serialized];
			} else {
				// nothing in the cache, have to use the inherited method to perform the action
				var subCollection = this.inherited(args);

				if (cacheable) {
					subCollection.cachingStore = this.cachingStore[method].apply(this.cachingStore, args);
					this._collectionCache[serialized] = subCollection;
					subCollection._collectionId = serialized;
				}

				return subCollection;
			}
		},
		_createSubCollection: function () {
			var subCollection = this.inherited(arguments);
			subCollection._collectionCache = {};
			// TODO: Is this going to be added to Store.js?
			subCollection._parent = this;
			return subCollection;
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
		evictCollection: function () {
			return delete this._parent[this._collectionId];
		}
	});
});
