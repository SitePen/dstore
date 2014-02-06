# Included Stores

The dstore package includes several store implementations that can be used for the needs of different applications. These include:

* Memory - This is simple memory-based store that takes an array and provides access to the objects in the array through the store interface.
* Rest - This is a server-based store that sends HTTP requests following REST conventions to access and modify data requested through the store interface.
* Request - This is a simple server-based store, like Rest, that provides read-only access to data from the server.
* Cache - This is an aggregate store that combines a master and caching store to provide caching functionality.
* Observable - This a mixin store that adds track array changes and add index information to events of tracked store instances. This adds a track() method for tracking stores.
* RqlServer, RqlClient - These are mixins for adding RQL querying capabilities to stores.
* SimpleQuery - This is a base store with basic querying functionality, which is extended by the Memory store, and can be used to add client side querying functionality to the Request/Rest store.

## Constructing Stores

All the stores can be instantiated with an options argument to the constructor, to provide properties to be copied to the store. This can include methods to be added to the new store.

## Memory

The Memory store is a basic client-side in-memory object store, that can be created from a simple JavaScript array. When creating a memory store, the data (which should be an array of objects) can be provided in the `data` property to the constructor, or by calling `store.setData(data)`.

For example:

    myStore = new Memory({
        data: [{
            id: 1,
            aProperty: ...,
            ...
        }]
    });

All the methods on `Memory` store return synchronously.

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

## SimplyQuery

This base/mixin store provides client-side querying functionality. This provides the querying functionality for the Memory store, and can be used as a mixin with the Rest store for performing client-side queries in combination with server-side queries.

To combine the `SimpleQuery` with the `Rest` store, we could create a new store:

    // define a store based on Rest with SimpleQuery as a mixin
    var RestWithClientQuerying = declare([Rest, SimplyQuery]);
    // create a store instance
    var myStore = new RestWithClientQuerying({
        target: '/PathToData/'
    });
    // define a query
    var importantItems = myStore.filter({priority: 'high'});
    // request the data, this will trigger the server-side query
    importantItems.fetch().then(function(){
        // once this is complete, we can now query, and it will
        // be performed on the client side
        var firstItems = importantItems.range(0, 10);
    });

## Resource Query Language

[Resource Query Language (RQL)](https://github.com/persvr/rql) is a query language specifically designed to be easily embedded in URLs (it is a compatible superset of standard encoded query parameters), as well as easily interpreted within JavaScript for client-side querying. Therefore RQL is a query language suitable for consistent client and server-delegated queries. The dstore packages includes mixins for adding RQL support to stores.

* RqlServer - This adds support for converting basic object filters, sort parameters, and range requests to URLs with RQL queries to send to the server. This can be used as a mixin with the `dstore/Rest` store.
* RqlClient - This adds support for interpreting RQL queries provided as a filter argument, for filtering, ordering, and manipulating in-memory data sets, using the RQL query engine.

Make sure you have installed/included the [rql](https://github.com/persvr/rql) package if you are using either of these mixins.

