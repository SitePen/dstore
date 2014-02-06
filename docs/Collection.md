## Collection API

The following properties and methods are available on dstore collections:

### Property Summary

Property | Description
-------- | -----------
`model` | This constructor represents the data model class to use for the objects returned from the store. All objects returned from the store should have their prototype set to the prototype property of the model, such that objects from this store should return true from `object instanceof store.model`.
`total` | This property should be included in if the query options included the "count" property limiting the result set. This property indicates the total number of objects matching the query (as if "start" and "count" weren't present). This may be a promise if the query is asynchronous.
`sorted` | If the collection has been sorted, this is an object that indicates the property that it was sorted on and if it was descending.
`filtered` | If the collection has been filtered, this is an object that indicates the query that was used to filter it.
`ranged` | If the collection represents a paged range of items, this is an object that indicates the `start` and `end` of the range.
`store` | This is reference to the base store from which all queries collections were derived. All the store's `put()`, `add()`, and `remove()` may be inherited by the collection, and will be directed back to the store.

### Method Summary

#### `filter(query)`

This filters the collection, returning a new subset collection. The query can be an object, with the properties defining the constraints on matching objects. Some stores, like server or RQL stores, may accept string-based queries. Stores with in-memory capabilities (those that include `SimpleQuery` like `Memory`) may accept a function for filtering as well.

#### `sort(property, [descending])`

Sorts the current collection, modifying the array in place.

#### `sort([highestSortOrder, nextSortOrder...])`

This also sorts the current collection, but can be called to define multiple sort orders by priority. Each argument is an object with a `property` property and an optional `descending` property (defaults to ascending, if not set), to define the order. For example: `collection.sort([{property:'lastName'}, {property: 'firstName'}])` would result in a collection sorted by lastName, with firstName used to sort identical lastName values.

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
`refresh` | This indicates that the entire collection has changed, and the user interface should iterate over the collection again to retrieve the latest list of objects.

#### `fetch()`

Normally collections may defer the execution (like making an HTTP request) required to retrieve the results until they are actually accessed through an iterative method (like `forEach`, `filter`, or `map`). Calling `fetch()` will force the data to be retrieved, returning an array, or a promise to an array.

#### `track()`

This method will create a new collection that will be tracked and updated as the parent collection changes. This will cause the events sent through the resulting collection to include an `index` and `previousIndex` property to indicate the position of the change in the collection. This is an optional method, and is usually provided by `dstore/Observable`.
