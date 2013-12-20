dstore
======

The dstore package is a data infrastructure framework, providing the tools for modelling and interacting with data collections and objects. dstore is designed to work with a variety of data storage mediums, and provide a consistent interface for accessing data across different user interface components. There are several key entities within dstore:

* Collection - This is a list of objects, which can be iterated over to access the objects in the collection, and monitored for changes. It can also be filtered, sorted, and sliced into new collections.
* Store - A Store is a Collection that may also include the ability to identify, to add, remove, and update objects.
* Model - A Model is an object, a set of properties, or name value pairs.
* Property - A Property is an object representing a particular property on a Model object, facilitating access to, modification of, and monitoring of the value of a property.

# Store API

This is a description of the `dstore/api/Store` API.

## Store.Collection

This is an abstract API that for a collection of items, which can be filtered, sorted, and sliced to create new collections Every method and property is optional, and is only needed if the functionality it provides is required. Every method may return a promise for the specified return value if the execution of the operation is asynchronous (except for query() which already defines an async return value). Note that the objects in the collection may not be immediately retrieved from the underlying data storage until they are actually accessed through forEach() or then().

### Property Summary

Property | Description
-------- | -----------
`model` | This constructor represents the data model class to use for the objects returned from the store. All objects returned from the store should have their prototype set to the prototype property of the model, such that objects from this store should return true from `object instanceof store.model`.
`total` | This property should be included in if the query options included the "count" property limiting the result set. This property indicates the total number of objects matching the query (as if "start" and "count" weren't present). This may be a promise if the query is asynchronous.
`sorted` | If the collection has been sorted, this is an object that indicates the property that it was sorted on and if it was descending.
`filtered` | If the collection has been filtered, this is an object that indicates the query that was used to filter it.
`ranged` | If the collection has been subsetted with range, this is an object that indicates the start and end of the range.

### Method Summary

#### `filter(query)`

Filters the collection, returning a new subset collection

#### `sort(property, [descending])`

Sorts the current collection, modifying the array in place.

#### `sort(highestSortOrder, nextSortOrder...)

This can be called to define multiple sort orders by priority. Each argument is an object with a `property` property and an optional `descending` property (defaults to ascending, if not set), to define the order. For example: `collection.sort({property:'lastName'}, {property: 'firstName'})` would result in a collection sorted by lastName, with firstName used to sort identical lastName values.

#### `range(start, [end])`

Retrieves a range of objects from the collection, returning a new collection with the objects indicated by the range.

#### `forEach(callback, thisObject)`

Iterates over the query results.  Note that this may executed asynchronously. The callback may be called after this function returns.

#### `map(callback, thisObject)`

Maps the query results. Note that this may executed asynchronously. The callback may be called after this function returns.

#### `on(type, listener)`

#### `then(callback, [errorHandler])`

This registers a callback for when the collection has been retrieved or 'fetchd', if the query is asynchronous. This is an optional method, and may not be present for synchronous collections.

#### `fetch()`

Normally collections may defer the execution (like making an HTTP request) required to retrieve the results until they are actually accessed through an iterative method (like `forEach`, `filter`, or `map`). Calling `fetch()` will force the data to be retrieved, returning an array, or a promise to an array.

#### `track()`

This method will create a new collection that will be tracked and updated as the parent store changes. This will cause the events sent through the resulting collection to include an `index` and `previousIndex` property to indicate the position of the change in the collection. This is an optional method, and is usually provided by `dstore/Observable`.

## Store

This is an abstract API that data provider implementations conform to. This file defines methods signatures and intentionally leaves all the methods unimplemented. Every method and property is optional, and is only needed if the functionality it provides is required. Every method may return a promise for the specified return value if the execution of the operation is asynchronous (except for query() which already defines an async return value).

In addition to the methods and properties inherited from `Store.Collection`, the `Store` API also exposes the following properties and methods.

### Property Summary

Property | Description
-------- | -----------
`idProperty` | If the store has a single primary key, this indicates the property to use as the identity property. The values of this property should be unique.  Defaults to "id".
`model` | This is the model class to use for all the data objects that originate from this store. By default this will be set to the class from `dstore/Model`. However, you can create your own model classes (and schemas), and assign them to a store. All object that come from the store will have their prototype set such that they will be instances of the model.


### Method Summary

Method | Description
------ | -------------
`get(id)` | Retrieves an object by its identity
`getIdentity(object)` | Returns an object's identity
`put(object, [directives])` | Stores an object
`add(object, [directives])` | Creates an object, throws an error if the object already exists
`remove(id)` | Deletes an object by its identity
`transaction()` | Starts a new transaction.
`create()` | Creates and returns a new instance of the data model. The returned object will not be stored in the object store until it its save() method is called, or the store's add() is called with this object.
`getChildren(parent)` | Retrieves the children of an object.
`getMetadata(object)` | Returns any metadata about the object. This may include attribution, cache directives, history, or version information.

# Data Modelling

In addition to handling collections of items, dstore also provides robust data modeling capabilities for managing individual objects themselves. dstore provides a data model class that includes multiple methods on data objects, for saving, validating, and monitoring objects for changes.

By default, all objects returned from a store (whether it be from iterating over a collection, or performing a get()) will be an instance of the store's data model. The default data model is `dstore/Model`. Since objects are instances of this model, they all inherit the following properties and methods:

### Property Summary

Property | Description
-------- | -----------
`schema` | The schema is an object that with property definitions that define various metadata about the instance objects' properties.
`additionalProperties` | This indicates whether or not to allow additional properties outside of those defined by the schema. This defaults to true.
`validateOnSet` | This indicates whether or not to validate a property when a new value is set on it.


Method | Description
------ | -----------
`get(name)` | This returns the property value with the given name.
`set(name, value)` | This sets the value of a property.
`property(name)` | This returns a property object instance for the given name.
`validate()` | This will validate the object, determining if there are any errors on the object.
`save()` | This will save the object, validating and then storing the object in the store.
`remove()` This will delete the object from the object store.

## Property Objects

One of the key ideas in the dstore object model is the concept of property objects. A property object is a representation of single property on an object. The property object not only can provide the current value of a property, but can track meta-data about the property, such as property-specific validation information and whether or not the property is required. With the property object we can also monitor the property for changes, and modify the value of the property. A property object represents an encapsulation of a property that can easily be passed to different input components.

Property objects actually extend the data model class, so the methods listed for data objects above are available on property objects. The following additional methods are defined on property objects. 

Method | Description
------ | -----------
`receive(listener)` | This registers a listener for any changes to the value of this property. The listener will be called with the current value (if it exists), and will be called with any future changes.
`put(value)` | This requests a change in the value of this property. This may be coerced, and/or validated.
`get(listener?)` | This returns the current value of the property. If a listener is provided, it will be called with any future changes to the property value.
`validate()` | Called to validate the current property value.

Property | Description
------ | -----------
`type` | This indicates the primitive type of the property value (string, number, boolean, or object).
`required` | This indicates whether a (non-empty) value is required for this property.
`errors` | This is an array of errors from the last validation of this property. This may be null to indicate no errors.
`parent` | This is the parent object for the property
`name` | This is the name of the property

To get a property object from an data object, we simply call the property method:

	var nameProperty = object.property('name');


Once we have the property object, we can access meta-data, watch, and modify this property:


	nameProperty.required -> is it required?
	nameProperty.receive(function(newValue){
		// called with original value and each change
	});
	nameProperty.put("Mark");
	object.name -> "Mark"

## Schema

A data model is largely defined through the schema. The model object has a `schema` property to define the schema object and the schema object has properties with definitions that correspond to the properties of model instances that they describe. Each property's value is a property definition. A property definition can be a simple string, defining the primitive type to be accepted, or it can be a property definition object. The property definition can have the following properties and/or methods:

Property | Description
------ | -----------
`type` | This indicates the primitive type of the property value (string, number, boolean, or object).
`required` | This indicates whether a (non-empty) value is required for this property.

The property definition is as the basis for the property object instances for each model instance's properties. If the property definition object is an instance of `dstore/Property`, it will be used as the direct prototype for the instance property objects. If not, the property definition will be used to construct a `dstore/Property` instance, (properties are copied over), to use as the prototype of the instance property objects.

You can also define your own methods, to override the normal validation, access, and modification functionality of properties, by subclassing `dstore/Property` or directly defining methods in the property definition. The following methods can be defined or overriden:

Method | Description
------ | -----------
`validate()` | This method can be overriden to provide custom validation functionality. This method is responsible for setting the errors property to a falsy value for valid values or an array of errors if validation failed.
`coerce(value)` | This method is responsible for coercing input values. The default implementation coerces to the provided type (for example, if the type was a `string`, any input values would be converted to a string).
`is(value)` | This method can be called by a setter to set the value of the underlying property and notify any listeners of the change. This generally does not need to be overriden.
`setter(value)` | By defining this method, you can define your own setter, with custom behavior for handling attempts to change a property.
`getter()` | By defining this method, you can define customer behavior for retrieving the value of a property.

Here is an example of creating a model using a schema:

    MyModel = declare(Model, {
        schema: {
            firstName: 'string', // simple definition
            lastName: {
                type: 'string',
                required: true
            }
        }
    })

### Getters and Setters

Getters and setters can be defined on the property definition. A getter will be called when a property is accessed, and should return the value that should be returned from the property access. The setter will be called with the value that is has been requested for the new property value, and it can actually set the property value on the parent object by calling `this.is(value)`. Getters and setters may often need to interact with the parent object to compute values and determine behavior. They can access the parent object from `this.parent`.

Here is an example of a schema that employs getters and setters

    schema: {
        firstName: 'string'
        lastName: 'string'
        fullName: {
            getter: function(){
                return this.parent.get('firstName') + ' ' +
                    this.parent.get('lastName');
            },
            setter: function(value){
                var parts = value.split(' ');
                this.parent.set('firstName', parts[0]);
                this.parent.set('lastName', parts[1]);
            }
        }
    }

# Adapters

## StoreAdapter

The `dstore/legacy/StoreAdapter` module allows a `dstore` object store to be used as a dstore object store.  There are two ways to use this adapter.

Combine the `StoreAdapter` mixin with a `dstore` class to create a new class.
```js
require([
    'dojo/_base/declare', 'dstore/Memory', 'dstore/legacy/StoreAdapter`
], function(declare, Memory, StoreAdapter) {
    var AdaptedMemory = declare([Memory, StoreAdapter]);
});
```
Create an adapted version of an existing `dstore` object store by calling `StoreAdapter.adapt()`.
```js
require([
    'dstore/legacy/StoreAdapter`
], function(StoreAdapter) {
    var adaptedStore = StoreAdapter.adapt(store);
});
``` 

In addition to the methods and properties inherited from `dstore/api/Store`, the `StoreAdapter` module also exposes the following method.

### Method Summary

Method | Description
------ | -------------
`StoreAdapter.adapt()` | Adapts an existing `dstore` object to behave like a dstore object.

## DstoreAdapter

The `dstore/legacy/DstoreAdapter` module allows a dstore object store to be used as `dstore` object stores.  There are two ways to use this adapter.

Combine the `DstoreAdapter` mixin with a dstore object store class to create a new class.
```js
require([
    'dojo/_base/declare', 'dstore/Memory', 'dstore/legacy/DstoreAdapter`
], function(declare, Memory, DstoreAdapter) {
    var AdaptedMemory = declare([Memory, DstoreAdapter]);
});
```
Create an adapted version of an existing dstore object store by calling `DstoreAdapter.adapt()`.
```js
require([
    'dstore/legacy/DstoreAdapter`
], function(DstoreAdapter) {
    var adaptedStore = DstoreAdapter.adapt(store);
});
```
In addition to the methods and properties inherited from `dstore/api/Store`, the `DstoreAdapter` module also exposes the following method.

### Method Summary

Method | Description
------ | -------------
`DstoreAdapter.adapt()` | Adapts an existing dstore object to behave like a `dstore` object.

## StoreSeries

The `dstore/charting/StoreSeries` module allows a dstore object to be used as a `Series` in a Dojox chart.
```js
require([
    'dstore/charting/StoreSeries'
], function (StoreSeries) {
    //... create a store and a chart ...
    // Adds a StoreSeries to the y axis.
    chart.addSeries('y', new StoreSeries(store);
});
```

### Constructor

The `StoreSeries` constructor expects 2 parameters.

Property | Description
-------- | -----------
`store` | A dstore object store.
`value` | An optional string, object or function that describes which property or properties to extract from each store item to include in the series.  If this parameter is omitted, then "value" is used by default.

### Method Summary

Method | Description
------ | -------------
`setSeriesObject(series)` | Sets the `dojox\charting\Series` object that will render the data.
`fetch()` | Retrieves all of the data from the store.  This method is initially called when the adapter is constructed.  If the store is observable, the adapter will register an observer to listen for updates from the store.
`destroy()` | Causes the adapter to release all resources.

# Testing

dstore uses [Intern](http://theintern.io/) as its test runner. Tests can
either be run using the browser, or using [Sauce Labs](https://saucelabs.com/).
More information on writing your own tests with Intern can be found in the
[Intern wiki](https://github.com/theintern/intern/wiki).

## Setting up

**Note:** Commands listed in this section are all written assuming they are
run in the parent directory containing `dstore`, `dojo`, etc.

Install the latest version of Intern.

```
npm install intern
```

## Running via the browser

1. Open a browser to http://hostname/path_to_dstore/tests/runTests.html
2. View the console

## Running via Sauce Labs

Make sure the proper Sauce Labs credentials are set in the environment:

```
export SAUCE_USERNAME=<your_sauce_username>
export SAUCE_ACCESS_KEY=<your_sauce_access_key>
```

Then kick off the runner with the following command:

```
node node_modules/intern/runner config=dstore/tests/intern
```

# License

The dstore project is available under the same dual BSD/AFLv2 license as the Dojo Toolkit.