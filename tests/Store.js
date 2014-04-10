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

		'getIdentity and _setIdentity': function () {
			var object = { id: 'default', 'custom-id': 'custom' };

			assert.strictEqual(store.getIdentity(object), 'default');
			assert.strictEqual(store._setIdentity(object, 'assigned-id'), 'assigned-id');
			assert.strictEqual(object.id, 'assigned-id');
			assert.strictEqual(store.getIdentity(object), 'assigned-id');

			store.idProperty = 'custom-id';
			assert.strictEqual(store.getIdentity(object), 'custom');
			assert.strictEqual(store._setIdentity(object, 'assigned-id'), 'assigned-id');
			assert.strictEqual(object['custom-id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), 'assigned-id');
		},

		'filter': function () {
			var filter1 = { prop1: 'one' },
				expectedQueryLog1 = [ { type: 'filter', argument: filter1 } ],
				filter2 = function filterFunc() {},
				expectedQueryLog2 = expectedQueryLog1.concat({ type: 'filter', argument: filter2 }),
				filteredCollection;

			filteredCollection = store.filter(filter1);
			assert.deepEqual(filteredCollection.queryLog, expectedQueryLog1);

			filteredCollection = filteredCollection.filter(filter2);
			assert.deepEqual(filteredCollection.queryLog, expectedQueryLog2);
		},

		'sort': function () {
			var sortObject = { property: 'prop1', descending: true },
				sortObjectArray = [ sortObject, { property: 'prop2', descending: false } ],
				comparator = function comparator() {},
				expectedQueryLog1 = [ { type: 'sort', argument: [ sortObject ] } ],
				expectedQueryLog2 = expectedQueryLog1.concat({ type: 'sort', argument: sortObjectArray }),
				expectedQueryLog3 = expectedQueryLog2.concat({ type: 'sort', argument: comparator }),
				sortedCollection;

			sortedCollection = store.sort(sortObject.property, sortObject.descending);
			assert.deepEqual(sortedCollection.queryLog, expectedQueryLog1);

			sortedCollection = store.sort(sortObject);
			assert.deepEqual(sortedCollection.queryLog, expectedQueryLog1);

			sortedCollection = sortedCollection.sort(sortObjectArray);
			assert.deepEqual(sortedCollection.queryLog, expectedQueryLog2);

			sortedCollection = sortedCollection.sort(comparator);
			assert.deepEqual(sortedCollection.queryLog, expectedQueryLog3);
		},

		'range': function () {
			var rangedCollection = store.range(100),
				expectedQueryLog1 = [ { type: 'range', argument: { start: 100, end: undefined } } ];
			assert.deepEqual(rangedCollection.queryLog, expectedQueryLog1);

			rangedCollection = rangedCollection.range(25, 50);
			var expectedQueryLog2 = expectedQueryLog1.concat({ type: 'range', argument: { start: 25, end: 50 } });
			assert.deepEqual(rangedCollection.queryLog, expectedQueryLog2);
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
