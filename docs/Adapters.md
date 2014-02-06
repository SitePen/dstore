# Adapters

## StoreAdapter

The `dstore/legacy/StoreAdapter` module allows a `dstore` object store to be used as a dstore object store.  There are two ways to use this adapter.

Combine the `StoreAdapter` mixin with a `dstore` class to create a new class.
```js
require([
    'dojo/_base/declare', 'dstore/Memory', 'dstore/legacy/StoreAdapter'
], function(declare, Memory, StoreAdapter) {
    var AdaptedMemory = declare([Memory, StoreAdapter]);
});
```
Create an adapted version of an existing `dstore` object store by calling `StoreAdapter.adapt()`.
```js
require([
    'dstore/legacy/StoreAdapter'
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
    'dojo/_base/declare', 'dstore/Memory', 'dstore/legacy/DstoreAdapter'
], function(declare, Memory, DstoreAdapter) {
    var AdaptedMemory = declare([Memory, DstoreAdapter]);
});
```
Create an adapted version of an existing dstore object store by calling `DstoreAdapter.adapt()`.
```js
require([
    'dstore/legacy/DstoreAdapter'
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
