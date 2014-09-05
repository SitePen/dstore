# Collection

A Collection is the interface for a collection of items, which can be filtered, sorted, and mapped to create new collections. When implementing this interface, every method and property is optional, and is only needed if the functionality it provides is required, however all the included stores implement every method. Every method may return a promise for the specified return value if the execution of the operation is asynchronous (except for the query methods which return a collection). Note that the objects in the collection might not be immediately retrieved from the underlying data storage until they are actually accessed through `forEach()`, `fetch()`, or `fetchRange()`. The methods represent a snapshot of the data, and if the data has changed, these methods can later be used to retrieve the latest data.

## Querying

Several methods are available for querying collections. These methods allow you to define a query through several steps. Normally, stores are queried first by calling `filter()` to specify which objects to be included, if the filtering is needed. Next, if an order needs to be specified, the `sort()` method is called to ensure the results will be sorted. Finally, the `map()` method can be called if you want to objects to a different representations. A typical query from a store would look like:

    store.filter({priority: 'high'}).sort('dueDate').forEach(function (object) {
            // called for each item in the final result set
        });

In addition, the `track()` method may be used to track store changes, ensuring notifications include index information about object changes, and keeping result sets up-to-date after a query. The `fetch()` method is an alternate way to retrieve results, providing a promise to an array for accessing query results. The sections below describes each of these methods and how to use them.

## Filtering

Filtering is used to specify a subset of objects to be returned in a filtered collection. The simplest use of the `filter()` method is to call it with a plain object as the argument, that specifies name-value pairs that the returned objects must match. Or a filter builder can be used to construct more sophisticated filter conditions. To use the filter builder, first construct a new filter object from the `Filter` constructor on the collection you would be querying:

	var filter = new store.Filter();

We now have a `filter` object, that represent a filter, without any operators applied yet. We can create new filter objects by calling the operator methods on the filter object. The operator methods will return new filter objects that hold the operator condition. For example, to specify that we want to retrieve objects with a `priority` property with a value of `"high"`, and `stars` property with a value greater than `5`, we could write:

	var highPriorityFiveStarFilter = filter.eq('priority', 'high').gt('stars', 5);

This filter object can then be passed as the argument to the `filter()` method on a collection/store:

	var highPriorityFiveStarCollection = store.filter(highPriorityFiveStarFilter);

The following methods are available on the filter objects. First are the property filtering methods, which each take a property name as the first argument, and a property value to compare for the second argument:
* `eq`: Property values must equal the filter value argument.
* `ne`: Property values must not equal the filter value argument.
* `lt`: Property values must be less than the filter value argument.
* `lte`: Property values must be less than or equal to the filter value argument.
* `gt`: Property values must be greater than the filter value argument.
* `gte`: Property values must be greater than or equal to the filter value argument.
* `in`: An array should be passed in as the second argument, and Pproperty values must be equal to one of the values in the array.
* `match`: Property values must match the provided regular expression.
The following are combinatorial methods:
* `and`: This takes two arguments that are other filter objects, that both must be true.
* `or`: This takes two arguments that are other filter objects, where one of the two must be true.

Different stores may implement filtering in different ways. The `dstore/Memory` will perform filtering in memory. The `dstore/Request`/`dstore/Rest` stores will translate the filters into URL query strings to send to the server. Simple queries will be in standard URL-encoded query format and complex queries will conform to [RQL](https://github.com/persvr/rql) syntax (which is a superset of standard query format).

New filter methods can be created by subclassing `dstore/Filter` and adding new methods. New methods can be created by calling `Filter.filterCreator` and by providing the name of the new method. If you will be using new methods with memory stores, you can also add filter handlers to `dstore/objectQueryEngine` by adding new methods to the `comparators` object on this module.

For the `dstore/Request`/`dstore/Rest` stores, you can define alternate serializations of filters to URL queries for existing or new methods by overriding the `_renderFilterParams`. This method is called with a filter object (and by default is recursively called by combinatorial operators), and should return a string serialization of the filter, that will be inserted into the query string of the URL sent to the server.

## Collection API

The following properties and methods are available on dstore collections:

### Property Summary

Property | Description
-------- | -----------
`model` | This constructor represents the data model class to use for the objects returned from the store. All objects returned from the store should have their prototype set to the prototype property of the model, such that objects from this store should return true from `object instanceof store.model`.
`defaultNewToStart` | If a new object is added to a store, this will indicate it if it should go to the start or end. By default, it will be placed at the end.

### Method Summary

#### `filter(query)`

This filters the collection, returning a new subset collection. The query can be an object, or a filter object, with the properties defining the constraints on matching objects. Some stores, like server or RQL stores, may accept string-based queries. Stores with in-memory capabilities (those that include `SimpleQuery` like `Memory`) may accept a function for filtering as well, but using the filter builder will ensure the greatest cross-store compatibility.

#### `sort(property, [descending])`

This sorts the collection, returning a new ordered collection. Note that if sort is called multiple times, previous sort calls may be ignored by the store (it is up to store implementation how to handle that). If a multiple sort order is desired, use the array of sort orders defined by below.

#### `sort([highestSortOrder, nextSortOrder...])`

This also sorts the collection, but can be called to define multiple sort orders by priority. Each argument is an object with a `property` property and an optional `descending` property (defaults to ascending, if not set), to define the order. For example: `collection.sort([{property:'lastName'}, {property: 'firstName'}])` would result in a new collection sorted by lastName, with firstName used to sort identical lastName values.

#### `map(callback, thisObject)`

Maps the query results. Note that this may be executed lazily and/or asynchronously, once the data is fetched. The callback may be called after this function returns. This will return a new collection for the mapped results.

#### `forEach(callback, thisObject)`

Iterates over the query results.  Note that this may be executed asynchronously and the callback may be called after this function returns. This will return a promise to indicate the completion of the iteration. This method forces a fetch of the data.

#### `fetch()`

Normally collections may defer the execution (like making an HTTP request) required to retrieve the results until they are actually accessed. Calling `fetch()` will force the data to be retrieved, returning a promise to an array.

#### `fetchRange({start: start, end: end})`

This fetches a range of objects from the collection, returning a promise to an array. The returned (and resolved) promise should have a `totalLength`
property with a promise that resolves to a number indicating the total number of objects available in the collection.

#### `on(type, listener)`

This allows you to define a listener for events that take place on the collection or parent store. When an event takes place, the listener will be called with an event object as the single argument. The following event types are defined:

Type | Description
-------- | -----------
`add` | This indicates that a new object was added to the store. The new object is available on the `target` property.
`update` | This indicates that an object in the stores was updated. The updated object is available on the `target` property.
`remove` | This indicates that an object in the stores was removed. The id of the object is available on the `id` property.
`refresh` | (Note, this is not emitted in the current stores, but may be used in the future). This indicates that the collection has changed substantially such that the user interface should iterate over the collection again to retrieve the latest list of objects. This event is issued in lieu of individual updates, and doesn't guarantee any specific change or update to any specific item.

#### `track()`

This method will create a new collection that will be tracked and updated as the parent collection changes. This will cause the events sent through the resulting collection to include an `index` and `previousIndex` property to indicate the position of the change in the collection. This is an optional method, and is usually provided by `dstore/Trackable`. For example, you can create an observable store class, by using `dstore/Trackable` as a mixin:

	var TrackableMemory = declare([Memory, Trackable]);

Once we have created a new instance from this store, we can track a collection, which could be the top level store itself, or a downstream filtered or sorted collection:

	var store = new TrackableMemory({data: ...});
	var filteredSorted = store.filter({inStock: true}).sort('price');

At this point, we can do a `fetch()` or `forEach()` to access the items in the filtered collection. Once we have done that, the data will be loaded, or will be loading, and we can track it. Note that if data is not fetched, it will not be available for comparisons to determine the position of modified objects.

	var tracked = filteredSorted.track();

Alternately, rather than retrieving results prior to tracking, we could call `track()`, and then make individual range requests from the tracked collection. 

	tracked.fetchRange(0, 10);
	
Trackable will keep track of each page of data, and send out notifications based on the data it has available, along with index information, indicating the new and old position of the object that was modified.

And then we could listen for notifications:

	tracked.on('add, update, remove', function(event){
		var newIndex = event.index;
		var oldIndex = event.previousIndex;
		var object = event.target;
	});

If you will be calling `fetchRange()`, to retrieve pages of data, that should be called on the tracked query. Tracked events, and their index position that they report will be based on the total collection tracked, and are not relative to the individual pages. Tracked events will also include a `totalLength` property indicating the total length of the collection.
