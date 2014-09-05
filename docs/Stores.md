# Included Stores

The dstore package includes several store implementations that can be used for the needs of different applications. These include:

* `Memory` - This is simple memory-based store that takes an array and provides access to the objects in the array through the store interface.
* `Rest` - This is a server-based store that sends HTTP requests following REST conventions to access and modify data requested through the store interface.
* `Request` - This is a simple server-based store, like Rest, that provides read-only access to data from the server.
* `RequestMemory` - This is a Memory based store that will retrieve its contents from a server/URL.
* `Cache` - This is an aggregate store that combines a master and caching store to provide caching functionality.
* `Trackable` - This a mixin store that adds track array changes and add index information to events of tracked store instances. This adds a track() method for tracking stores.
* `Store` - This is a base store, with the base methods that are used by all other stores.

## Constructing Stores

All the stores can be instantiated with an options argument to the constructor, to provide properties to be copied to the store. This can include methods to be added to the new store.

## Memory

The Memory store is a basic client-side in-memory object store, that can be created from a simple JavaScript array. When creating a memory store, the data (which should be an array of objects) can be provided in the `data` property to the constructor, or by calling `store.setData(data)`. The data should be an array of objects, and all the objects are considered to be existing objects and must have identities (this is not "creating" new objects, no events are fired for the objects that are provided, nor are identities assigned).

For example:

    myStore = new Memory({
        data: [{
            id: 1,
            aProperty: ...,
            ...
        }]
    });

The `Memory` store provides synchronous equivalents of standard asynchronous store methods, including `getSync(id)`, `addSync(object, options)`, `putSync(object, options)`, and `removeSync(id)`. These methods directly return objects or results, without a promise.

## Request

This is a simple store for accessing data by retrieval from a server (typically through XHR). The target URL path to use for requests can be defined with the `target` property.

## Rest

This store extends the Request store, to add functionality for adding, updating, and removing objects. All modifications, trigger HTTP requests to the server, using the corresponding RESTful HTTP methods.

For example:

    myStore = new Memory({
        target: '/PathToData/'
    });

All modification or retrieval methods (except `getIdentity()`) on `Request` and `Rest` execute asynchronously, returning a promise.

## Store

This is the base class used for all stores, providing basic functionality for tracking collection states and converting objects to be model instances. This (or any of the other classes above) can be extended for creating custom stores.

## Validating

This mixin adds functionality for validating any objects that are saved through `put()` or `add()`. The validation relies on the Model for the objects, so any property constraints that should be applied should be defined on the model's schema. If validation fails on `put()` or `add()` than a validation TypeError will be thrown, with an `errors` property that lists any validation errors.

## RequestMemory

This store provides client-side querying functionality, but will load its data from the server, using the provided URL. This is
an asynchronous store since queries and data retrieval may be made before the data has been retrieved from the server.

## Cache

This is a mixin that can be used to add caching functionality to a store. This can also be used to wrap an existing store, by using the static `create` function:

    var cachedStore = Cache.create(existingStore, {
        cachingStore: new Memory()
    });

This store has the following properties:

Name | Description
---- | -----------
`cachingStore` | This can be used to define the store to be used for caching the data. By default a Memory store will be used.
`isValidFetchCache` | This is a flag that indicates if the data fetched for a collection/store can be cached to fulfill subsequent fetches. This is false by default, and the value will be inherited by downstream collections.
`canCacheQuery(method, args)' | This can be a boolean or a method that will indicate if a collection can be cached (if it should have `isValidFetchCache` set to true), based on the query method and arguments used to derive the collection.
`isLoaded(object)` | This can be defined to indicate if a given object in a query can be cached (by default, objects are cached).

## Resource Query Language

[Resource Query Language (RQL)](https://github.com/persvr/rql) is a query language specifically designed to be easily embedded in URLs (it is a compatible superset of standard encoded query parameters), as well as easily interpreted within JavaScript for client-side querying. Therefore RQL is a query language suitable for consistent client and server-delegated queries. The dstore packages includes an alternate query engine for using
RQL as the query language. This can be enabled by setting the <code>queryEngine</code> property:

    require(['dstore/extensions/rqlQueryEngine'], function (rqlQueryEngine) {
        var rqlStore = new Memory({
            queryEngine: rqlQueryEngine,
            ...
        });

        rqlStore.filter('price<10|rating>3').forEach(function (product) {
            // return each product that has a price less than 10 or a rating greater than 3
        });
    }};

Make sure you have installed/included the [rql](https://github.com/persvr/rql) package if you are using the RQL query engine.
