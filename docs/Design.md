This document provides some discussion of design decisions, and are rather informal notes.
dstore is distinct from other data modelling frameworks in a number of ways, and aims to provide a better user experience based on a number of goals that influence various aspects of the design. This document is intended to describe the design rationales in dstore. A few of the key goals of dstore:

* The ultimate goal of dstore is facilitate applications with an amazing user experience. One of the most important ingredients to this experience is high performance components that can quickly and smoothly respond to the user. Consequently, dstore places a high priority on ensuring that data can be accessed as quickly as possible with as little overhead as possible.
* dstore aims to provide a clean separation of concerns, helping to define a distinction between the data model and presentation (viewer and controller).
  * dstore aims to encapsulate data entities to minimize the interface between data models and presentation, and ensure that the presentation code can fully access and interact with data with this interface.
  * dstore aims to provide a consistent, predictable interface for accessing data.

Unlike dojo object stores, dstore handles querying by providing several different query methods that each handle the different parts of query, including filter and sort. Each of these returns a new collection, which can then be further queried. This purpose of this approach is:
* Better encapsulation of a query result. A resulting collection can be passed to a grid without any extra coordination in regards to what query was used
* This encapsulation also helps provide more legible querying

* query metadata - All queries add query-related metadata to the collection they create. At first, we logged query metadata to separate `filtered`, `sorted`, and `ranged` properties, but doing so lost important information about the order of the queries. We migrated to a unified query log called `queryLog` which has the following benefits:
  * Retains the order of query operations
  * Allows easy examination and iteration of the query operations together
  * Stores querier functions separately rather than composed so a single querier can be invoked without invoking the others

* queriers - Each query may have an associated querier function created based on the query arguments that takes an array of input data and returns an array of result data. For example, a filter query may create a querier based on the filter arguments that takes an array of input data and returns an array of items that pass the filter. Client-side stores such as `dstore/Memory` completely rely on queriers to perform query operations, and the result-tracking mixin `Trackable` relies on queriers to determine a new or updated item's membership and location in a collection. Server-based collections such as `dstore/Rest` do not require queriers to operate, but queriers are required to properly maintain a server-based collection with `Trackable`.

* querier factory methods - A collection may provide a querier factory method for each query type. Querier factory methods use the naming convention `'_create<Type>Querier'`, take normalized arguments for their query type, and return a querier function based on those arguments. For example, a querier factory method for a sort query is named `'_createSortQuerier'`, takes normalized sort arguments, and returns a function that takes an array and sorts it according to the query's sort arguments. We explored using a single `queryEngine` property that could contain querier factories for supported query types, but moved query factories back to collection instance methods once it became clear we might want to add additional per-query functionality such as custom trackers for individual query types. Instance methods make such functionality easy to extend through inheritance while objects on the prototype such as `queryEngine` are more difficult to extend.

* sort - We had considered making sort modify the order of the current collection, or return a new sorted collection. Doing modification in-place had the advantage of avoiding any cloning of arrays to create a distinct sorted array, and being consistent with Array#sort. Returning a new sorted collection had the advantage of being more functional and consistent with the rest of the dstore collection API. With our initial delegation-based approach to creating new collections, creating new collections for sorts could lead to memory being retained in intermediate steps in querying, but we switched to a copy-based approach which allows intermediate steps in a multi-step query to be garbage collected. Sorting now returns a new sorted collection (not in-place).

* Model constructor usage - One of the goals of the persisted objects is to allow an object to exist across numerous instantiations of an application. Consequently, there is a clear distinction between an existing object that is being restored into memory from storage, versus the creation of the a new object. The restoration of existing objects into memory is designed to be as fast as possible to facilitate optimal access to data (and pontentially large sets of objects can be returned from stores), regardless of models used, and avoid any performance regressions from older versions of object stores, consequently this restoration typically uses a __proto__ assignment, rather than a constructor (see http://jsperf.com/setting-the-prototype for comparison of different approaches to recreating an object's prototype). On the otherhand, the model constructor is reserved for the actual creation of new objects. This helps to achieve both the clear distinction in the object lifecycle, as well as maintaining optimum speed for the object stores.

* Validation and properties - The goal of dstore is to make declaration of validated properties as easy as possible. There are a couple of approaches we considered, including keeping validators in a separate array, and mixing in the functionality in properties. We opted to allow both approaches because each has some key advantages. Validation in arrays provides:
  * Clear distinct list of validators
  * No conflicts between validators
  * Multiple asynchronous validators can easily be combined
Validators also extend properties, can be mixed in, can be used directly as properties or mixed in to property classes, with the following benefits:
  * A single constructor for a property with validation provided
  * Encapsulate all the property concerns in a single class/instance
  * Metadata about validation (required, type, min, max, etc.), is directly available as metadata properties that can easily be accessed by consumers
  * Property reuse between validators (that are mixed in)
  * Full inheritance capabilities provide more complex possibilities of validators, including integration with other aspects of a property (like coercion)

* binding - We added a bindTo method to the Model class in the bindTo branch (https://github.com/SitePen/dstore/tree/bindTo) based on the idea of giving a target to bind a property to. After implementing this, I am not sure I really like this API though. The fact that the bindTo has a potential side effects if an existing binding exists seems like it makes for an unpredictable and awkward interface.
