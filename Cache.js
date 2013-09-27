define([
	"dojo/_base/lang",
	"dojo/when",
	"dojo/_base/declare",
	"./util/QueryResults"],
function(lang, when, declare, QueryResults){

// module:
//		dstore/Cache

function isEmpty(object){
	// will return true for empty objects, or empty strings
	for(var i in object){
		return false;
	}
	return true;
}
return declare(null, {
	cachingStore: null, 
	filter: function(query, directives){
		var canQueryFromCache = this.canQueryFromCache(query, directives);
		var cachingStore = this.cachingStore;
		if(canQueryFromCache){
			// we can use the cache for the query 
			if(canQueryFromCache.then){
				// wait for the cache to be ready, and then we have to rewrap the query 
				return new QueryResults(canQueryFromCache.then(function(){
					return cachingStore.query(query, directives);
				}));
			}
			return cachingStore.query(query, directives);
		}
		// can't use cache, go to master store
		var results = this.inherited(arguments);
		if(!query || isEmpty(query)){
			// a non-filtered query, we will assume that we are getting everything
			this.allLoaded = results;
		}
		results.forEach(function(object){
			if(!options.isLoaded || options.isLoaded(object)){
				cachingStore.put(object);
			}
		});
		return results;
	},
	canQueryFromCache: function(query){
		// this function can be overriden to provide more specific functionality for 
		// determining if a query should go to the master store or the caching store
		return this.allLoaded;
	},
	
	allLoaded: false,
	get: function(id, directives){
		var cachingStore = this.cachingStore;
		return when(cachingStore.get(id), function(result){
			return result || when(masterStore.get(id, directives), function(result){
				if(result){
					cachingStore.put(result, {id: id});
				}
				return result;
			});
		});
	},
	add: function(object, directives){
		var cachingStore = this.cachingStore;
		return when(masterStore.add(object, directives), function(result){
			// now put result in cache
			cachingStore.add(object && typeof result == "object" ? result : object, directives);
			return result; // the result from the add should be dictated by the masterStore and be unaffected by the cachingStore
		});
	},
	put: function(object, directives){
		// first remove from the cache, so it is empty until we get a response from the master store
		var cachingStore = this.cachingStore;
		cachingStore.remove((directives && directives.id) || this.getIdentity(object));
		return when(masterStore.put(object, directives), function(result){
			// now put result in cache
			cachingStore.put(object && typeof result == "object" ? result : object, directives);
			return result; // the result from the put should be dictated by the masterStore and be unaffected by the cachingStore
		});
	},
	remove: function(id, directives){
		var cachingStore = this.cachingStore;
		return when(masterStore.remove(id, directives), function(result){
			return cachingStore.remove(id, directives);
		});
	},
	evict: function(id){
		return this.cachingStore.remove(id);
	}
});
});
