dstore is distinct from other data modelling frameworks in a number of ways, and aims to provide a better user experience based on a number of goals that influence various aspects of the design. This document is intended to describe the design rationales in dstore. A few of the key goals of dstore:

* The ultimate goal of dstore is facilitate applications with an amazing user experience. One of the most important ingredients to this experience is high performance components that can quickly and smoothly respond to the user. Consequently, dstore places a high priority on ensuring that data can be accessed as quickly as possible with as little overhead as possible.
* dstore aims to provide a clean separation of concerns, helping to define a distinction between the data model and presentation (viewer and controller).
  * dstore aims to encapsulate data entities to minimize the interface between data models and presentation, and ensure that the presentation code can fully access and interact with data with this interface.
  * dstore aims to provide a consistent, predictable interface for accessing data.

Unlike dojo object stores, dstore handles querying by providing several different query methods that each handle the different parts of query, including filter, sort, and range. Each of these returns a new collection, which can then be further queried. This purpose of this approach is:
* Better encapsulation of a query result. A resulting collection can be passed to a grid without any extra coordination in regards to what query was used
* This encapsulation also helps
* Provide more legible querying

* query engine - We started with a mixin approach to query implementations, but the approach made the query methods difficult to adapt and override. This was due to query methods needing to call their inherited counterparts which, without specific effort to the contrary, will call the overridden version of the query method as well as the necessary method inherited from `Store`. To avoid this issue, we moved to a `collection.queryEngine` property which is a simple object that is easy to extend and modify using object delegation. Query engines are expected to provide factory methods corresponding all supported query types (`filter`, `sort`, and `range` by default).

* query metadata - All queries add query-related metadata to the collection they create. At first, we logged query metadata to separate `filtered`, `sorted`, and `ranged` properties, but doing so lost important information about the order of the queries. We migrated to a unified query log called `queryLog` which has the following benefits:
  * Retains the order of query operations
  * Allows easy examination and iteration of the query operations together
  * Stores queryer functions separately rather than composed so a single queryer can be invoked without invoking the others

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
