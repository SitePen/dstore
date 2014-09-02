dstore
======

The dstore package is a data infrastructure framework, providing the tools for modelling and interacting with data collections and objects. dstore is designed to work with a variety of data storage mediums, and provide a consistent interface for accessing data across different user interface components. There are several key entities within dstore:

* [Collection](./docs/Collection.md) - This is a list of objects, which can be iterated over to access the objects in the collection, and monitored for changes. It can also be filtered, sorted, and sliced into new collections.
* [Store](./docs/Store.md) - A Store is a Collection that may also include the ability to identify, to add, remove, and update objects.
* [Model](./docs/DataModelling.md) - A Model is an object, a set of properties, or name value pairs.
* [Property](./docs/DataModelling.md) - A Property is an object representing a particular property on a Model object, facilitating access to, modification of, and monitoring of the value of a property.

# [Included Stores](./docs/Stores.md)

The dstore package includes several store implementations that can be used for the needs of different applications. These include:

* Memory - This is simple memory-based store that takes an array and provides access to the objects in the array through the store interface.
* Rest - This is a server-based store that sends HTTP requests following REST conventions to access and modify data requested through the store interface.
* Request - This is a simple server-based store, like Rest, that provides read-only access to data from the server.
* Cache - This is an aggregate store that combines a master and caching store to provide caching functionality.
* Trackable - This a mixin store that adds track array changes and add index information to events of tracked store instances. This adds a track() method for tracking stores.
* SimpleQuery - This is a base store with basic querying functionality, which is extended by the Memory store, and can be used to add client side querying functionality to the Request/Rest store.

See the [Stores section](./docs/Stores.md) for more information these stores.

## [Collections](./docs/Collection.md)

A Collection is the interface for a collection of items, which can be filtered, sorted, and sliced to create new collections. When implementing this interface, every method and property is optional, and is only needed if the functionality it provides is required, however all the included stores implement every method. Every method may return a promise for the specified return value if the execution of the operation is asynchronous (except for the query methods which return a collection). Note that the objects in the collection might not be immediately retrieved from the underlying data storage until they are actually accessed through `forEach()`, `map()`, or `fetch()`.

For more details on the Collection API and how to query, see the [Collection section](./docs/Collection.md)

## [Store](./docs/Store.md)

A store is an extension of a collection and is an entity that not only contains a set of objects, but also provides an interface for identifying, adding, modifying, removing, and querying data. See the [Store section](./docs/Store.md) for the details on the Store interface.

# [Data Modelling](./docs/DataModelling.md)

In addition to handling collections of items, dstore also provides robust data modeling capabilities for managing individual objects themselves. dstore provides a data model class that includes multiple methods on data objects, for saving, validating, and monitoring objects for changes. By setting a model on stores, all objects returned from a store (whether it be from iterating over a collection, or performing a get()) will be an instance of the store's data model.

For more information, please see the [Data Modelling section](./docs/DataModelling.md).

# [Adapters](./docs/Adapters.md)

Adapters make it possible work with legacy Dojo object stores and widgets that expect Dojo object stores. dstore also includes an adapter for using a store with charts. See the [Adapters section](./docs/Adapters.md) for more information.

# [Testing](./docs/Testing.md)

dstore uses [Intern](http://theintern.io/) as its test runner. A full description
of how to setup testing is [available here](./docs/Testing.md). Tests can
either be run using the browser, or using [Sauce Labs](https://saucelabs.com/).
More information on writing your own tests with Intern can be found in the
[Intern wiki](https://github.com/theintern/intern/wiki). 

# License

The dstore project is available under the same dual BSD/AFLv2 license as the Dojo Toolkit.