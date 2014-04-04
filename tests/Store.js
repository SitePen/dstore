define([
	'../Store',
	'../Model',
	'dojo/_base/declare',
	'intern!object',
	'intern/chai!assert'
], function (Store, Model, declare, registerSuite, assert) {

	var store;
	registerSuite({
		name: 'dstore Store',

		beforeEach: function () {
			store = new Store();
		},

		'filter': function () {
			var expectedFilter1 = { prop1: 'one' },
				expectedFilter2 = function filterFunc() {},
				filteredCollection;

			filteredCollection = store.filter(expectedFilter1);
			assert.deepEqual(filteredCollection.filtered, [ expectedFilter1 ]);

			filteredCollection = filteredCollection.filter(expectedFilter2);
			assert.deepEqual(filteredCollection.filtered, [ expectedFilter1, expectedFilter2 ]);
		},

		'sort': function () {
			var sortObject = { property: 'prop1', descending: true },
				sortObjectArray = [ sortObject, { property: 'prop2', descending: false } ],
				comparator = function comparator() {},
				sortedCollection;

			sortedCollection = store.sort(sortObject.property, sortObject.descending);
			assert.deepEqual(sortedCollection.sorted, [ sortObject ]);

			sortedCollection = store.sort(sortObject);
			assert.deepEqual(sortedCollection.sorted, [ sortObject ]);

			sortedCollection = sortedCollection.sort(sortObjectArray);
			assert.deepEqual(sortedCollection.sorted, sortObjectArray);

			sortedCollection = sortedCollection.sort(comparator);
			assert.deepEqual(sortedCollection.sorted, comparator);
		},

		'range': function () {
			var rangedCollection = store.range(100);
			assert.deepEqual(rangedCollection.ranged, { start: 100, end: undefined });
			rangedCollection = rangedCollection.range(25, 50);
			assert.deepEqual(rangedCollection.ranged, { start: 125, end: 150 });

			rangedCollection = store.range(100, 200);
			assert.deepEqual(rangedCollection.ranged, { start: 100, end: 200 });
			rangedCollection = rangedCollection.range(25);
			assert.deepEqual(rangedCollection.ranged, { start: 125, end: 200 });
		},

		'restore': function () {
			var TestModel = declare(Model, {
				_restore: function (Constructor) {
					// use constructor based restoration
					var restored = new Constructor(this);
					restored.restored = true;
					return restored;
				}
			});
			var store = new Store({
				model: TestModel
			});
			var restoredObject = store._restore({foo: 'original'});
			assert.strictEqual(restoredObject.foo, 'original');
			assert.strictEqual(restoredObject.restored, true);
			assert.isTrue(restoredObject instanceof TestModel);
		},

		events: function () {
			var methodCalls = [],
				events = [];

			// rely on autoEventEmits
			var store = new (declare(Store, {
				put: function (object) {
					methodCalls.push('put');
					return object;
				},
				add: function (object) {
					methodCalls.push('add');
					return object;
				},
				remove: function (id) {
					methodCalls.push('remove');
				}
			}))();
			store.on('add', function (event) {
				events.push(event.type);
			});
			store.on('update', function (event) {
				events.push(event.type);
			});
			store.on('remove', function (event) {
				events.push(event.type);
			});
			store.put({});
			store.add({});
			store.remove(1);

			assert.deepEqual(methodCalls, ['put', 'add', 'remove']);
			assert.deepEqual(events, ['update', 'add', 'remove']);
		},

		forEach: function () {
			var store = new (declare(Store, {
				fetch: function () {
					return [0, 1, 2];
				}
			}))();
			var results = [];
			store.forEach(function (item, i, instance) {
				assert.strictEqual(item, i);
				results.push(item);
				assert.strictEqual(instance, store);
			});
			assert.deepEqual(results, [0, 1, 2]);
		},

		map: function () {
			var store = new (declare(Store, {
				fetch: function () {
					return [0, 1, 2];
				}
			}))();
			var results = store.map(function (item, i, instance) {
				assert.strictEqual(item, i);
				assert.strictEqual(instance, store);
				return item * 2;
			});
			assert.deepEqual(results, [0, 2, 4]);
		}

		// TODO: Add map test and tests for other Store features
	});
});
