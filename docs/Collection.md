# Collection

A Collection is the interface for a collection of items, which can be filtered, sorted, and sliced to create new collections. When implementing this interface, every method and property is optional, and is only needed if the functionality it provides is required, however all the included stores implement every method. Every method may return a promise for the specified return value if the execution of the operation is asynchronous (except for the query methods which return a collection). Note that the objects in the collection might not be immediately retrieved from the underlying data storage until they are actually accessed through `forEach()`, `map()`, or `fetch()`.

## Querying

Several methods are available for querying collections. These methods allow you to define a query through several steps. Normally, stores are queried first by calling `filter()` to specify define which objects to be included, if the filtering is needed. Next, if an order needs to be specified, the `sort()` method is called to ensure the results will be sorted. Finally, the `range()` method can be called if you want to retrieve an index-based subset, rather than the entire result set. A typical query from a store would look like:

    store.filter({priority: 'high'}).sort('dueDate').range(0, 10).forEach(function (object) {
            // called for each item in the final result set
        });

In addition, the `track()` method may be used to track store changes, ensuring notifications include index information about object changes, and keeping result sets up-to-date after a query. The `fetch()` method is alternative way to retrieve results, providing an array, and the `map()` is another iterative alternative to `forEach()` for accessing query results. The section below describes each of these methods.

## Collection API

The following properties and methods are available on dstore collections:

### Property Summary

Property | Description
-------- | -----------
`model` | This constructor represents the data model class to use for the objects returned from the store. All objects returned from the store should have their prototype set to the prototype property of the model, such that objects from this store should return true from `object instanceof store.model`.
`total` | This property should be included in if the query options included the "count" property limiting the result set. This property indicates the total number of objects matching the query (as if "start" and "count" weren't present). This may be a promise if the query is asynchronous.
`defaultToTop` | If a new object is added to a store, this will indicate it if it should go to the top or bottom. By default, it will be placed at the bottom.

### Method Summary

#### `filter(query)`

This filters the collection, returning a new subset collection. The query can be an object, with the properties defining the constraints on matching objects. Some stores, like server or RQL stores, may accept string-based queries. Stores with in-memory capabilities (those that include `SimpleQuery` like `Memory`) may accept a function for filtering as well.

#### `sort(property, [descending])`

This sorts the collection, returning a new ordered collection.

#### `sort([highestSortOrder, nextSortOrder...])`

This also sorts the collection, but can be called to define multiple sort orders by priority. Each argument is an object with a `property` property and an optional `descending` property (defaults to ascending, if not set), to define the order. For example: `collection.sort([{property:'lastName'}, {property: 'firstName'}])` would result in a new collection sorted by lastName, with firstName used to sort identical lastName values.

#### `range(start, [end])`

Retrieves a range of objects from the collection, returning a new collection with the objects indicated by the range.

#### `forEach(callback, thisObject)`

Iterates over the query results.  Note that this may executed asynchronously. The callback may be called after this function returns. If this is executed asynchronously, a promise will be returned to indicate the completion.

#### `map(callback, thisObject)`

Maps the query results. Note that this may executed asynchronously. The callback may be called after this function returns.

#### `on(type, listener)`

This allows you to define a lister for events that take place on the collection or parent store. When an event takes place, the listener will be called with an event object as the single argument. The following event types are defined:

Type | Description
-------- | -----------
`add` | This indicates that a new object was added to the store. The new object is available on the `target` property.
`update` | This indicates that an object in the stores was updated. The updated object is available on the `target` property.
`remove` | This indicates that an object in the stores was removed. The id of the object is available on the `id` property.
`refresh` | This indicates that the collection has changed substantially such that the user interface should iterate over the collection again to retrieve the latest list of objects. This event is issued in lieu of individual updates, and doesn't guarantee any specific change or update to any specific item.

#### `fetch()`

Normally collections may defer the execution (like making an HTTP request) required to retrieve the results until they are actually accessed through an iterative method (like `forEach`, `filter`, or `map`). Calling `fetch()` will force the data to be retrieved, returning an array, or a promise to an array.

#### `track()`

This method will create a new collection that will be tracked and updated as the parent collection changes. This will cause the events sent through the resulting collection to include an `index` and `previousIndex` property to indicate the position of the change in the collection. This is an optional method, and is usually provided by `dstore/Observable`. For example, you can create an observable store class, by using `dstore/Observable` as a mixin:

	var ObservableMemory = declare([Memory, Observable]);

Once we have created a new instance from this store, we can track a collection, which could be the top level store itself, or a downstream filtered or sorted collection:

	var store = new ObservableMemory({data: ...});
	var filteredSorted = store.filter({inStock: true}).sort('price');
	var tracked = filteredSorted.track();

And then we could listen for notifications:

	tracked.on('add, update, remove', function(event){
		var newIndex = event.index;
		var oldIndex = index.previousIndex;
		var object = index.target;
	});

If you will be calling `range()`, to retrieve pages of data, that should be called on the tracked query (tracked notifications, and their index position will be based on the total collection tracked, and not relative to the individual pages).