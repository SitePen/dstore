# Store

A store is an extension of a [collection](./Collection.md) and is an entity that not only contains a set of objects, but also provides an interface for identifying, adding, modifying, removing, and querying data. Below is the definition of the store interface. Every method and property is optional, and is only needed if the functionality it provides is required (although the provided full stores (`Rest` and `Memory`) implement all the methods except `transaction()` and `getChildren()`). Every method may return a promise for the specified return value if the execution of the operation is asynchronous (except for query() which already defines an async return value).

In addition to the methods and properties inherited from [Collections](./Collection.md), the `Store` API also exposes the following properties and methods.

### Property Summary

Property | Description
-------- | -----------
`idProperty` | If the store has a single primary key, this indicates the property to use as the identity property. The values of this property should be unique. This defaults to "id".
`model` | This is the model class to use for all the data objects that originate from this store. By default this will be set to the class from `dstore/Model`. However, you can create your own model classes (and schemas), and assign them to a store. All object that come from the store will have their prototype set such that they will be instances of the model. This can be set to `null` to disable any prototype modifications and leave data as plain objects.

### Method Summary

Method | Description
------ | -------------
`get(id)` | This retrieves an object by its identity, return the object or a promise to the object.
`getIdentity(object)` | This returns an object's identity (always synchronously).
`put(object, [directives])` | This stores an object. It can be used to update or create an object. This may return the object, or a promise if the operation will be completed asynchronously.
`add(object, [directives])` | This creates an object, and throws an error if the object already exists.
`remove(id)` | This deletes an object, using the identity to indicate which object to delete.
`transaction()` | Starts a transaction and returns a transaction object. The transaction object should include a `commit()` and `abort()` to commit and abort transactions, respectively. Note, that a store user might not call `transaction()` prior to using put, delete, etc. in which case these operations effectively could be thought of as “auto-commit” style actions. 
`create(properties)` | Creates and returns a new instance of the data model. The returned object will not be stored in the object store until it its save() method is called, or the store's add() is called with this object.
`getChildren(parent)` | This retrieves the children of the provided parent object.
`mayHaveChildren(parent)` | This should return true or false indicating whether or not a parent might have children. This should always return synchronously, as a way of checking if children might exist before actually retrieving all the children.
