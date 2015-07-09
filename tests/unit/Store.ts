import { EventObject } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import * as dstore from 'src/interfaces'
import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Store, { StoreArgs, NewableStoreModel } from 'src/Store';

class NonDeclareBasedModel {
	constructor (args?: {}) {
		lang.mixin(this, args);
	}
	_restore(Constructor: { new (arg: any): { restored: boolean } }) {
		// use constructor based restoration
		var restored = new Constructor(this);
		restored.restored = true;
		return restored;
	}
	static createSubclass: any;
}

class Model {
	constructor (args?: {}) {
		lang.mixin(this, {
			_restore: function (Constructor: { new (arg: any): { restored: boolean } }) {
				// use constructor based restoration
				var restored = new Constructor(this);
				restored.restored = true;
				return restored;
			},
			createSubclass: null
		}, args);
	}
	_restore(Constructor: { new (arg: any): { restored: boolean } }) {
		// use constructor based restoration
		var restored = new Constructor(this);
		restored.restored = true;
		return restored;
	}
	static createSubclass(...args: any[]) {
		return {
			extend: function () {
				return { extended: true };
			}
		};
	}
}

var store: Store;
registerSuite({
	name: 'dstore Store',

	beforeEach: function () {
		store = new Store();
	},

	'getIdentity and _setIdentity': {
		'direct property access and assignment'() {
			var object: { [ index: string ]: any } = { id: 'default', 'custom-id': 'custom' };

			assert.strictEqual(store.getIdentity(object), 'default');
			(<any>store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['id']);

			store.idProperty = 'custom-id';
			assert.strictEqual(store.getIdentity(object), 'custom');
			(<any>store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['custom-id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['custom-id']);
		},
		'getter and setter'() {
			var object: { [ index: string ]: any } = {
					_properties: {
						id: 'default',
						'custom-id': 'custom'
					},
					get: function (name: string) {
						return this._properties[name];
					},
					set: function (name: string, value: string) {
						this._properties[name] = value;
					}
				};

			assert.strictEqual(store.getIdentity(object), 'default');
			(<any>store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['_properties'].id, 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['_properties'].id);

			store.idProperty = 'custom-id';
			assert.strictEqual(store.getIdentity(object), 'custom');
			(<any>store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['_properties']['custom-id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['_properties']['custom-id']);
		}
	},

	'filter'() {
		var filter1 = { prop1: 'one' };
		var expectedQueryLog1: any[] = [ {
				type: 'filter', arguments: [ filter1 ], normalizedArguments: [ {
					type: 'eq',
					args: ['prop1', 'one']
				} ]
			} ];
		var filter2 = function filterFunc() {};
		var	expectedQueryLog2: any[] = expectedQueryLog1.concat({
				type: 'filter', arguments: [ filter2 ], normalizedArguments: [ {
					type: 'function',
					args: [filter2]
				} ]
			});
		var filteredCollection: dstore.Collection<any> = store.filter(filter1);
		// deepEqual just won't work on the data in these
		assert.equal(JSON.stringify(filteredCollection.queryLog), JSON.stringify(expectedQueryLog1));

		filteredCollection = filteredCollection.filter(filter2);
		assert.equal(JSON.stringify(filteredCollection.queryLog), JSON.stringify(expectedQueryLog2));
	},

	'sort'() {
		var sortObject = { property: 'prop1', descending: true },
			sortObjectArray = [ sortObject, { property: 'prop2' } ],
			comparator = function comparator(a: any, b: any) {
				return 0;
			},
			expectedQueryLog1: any[] = [ {
				type: 'sort',
				arguments: [ sortObject.property, sortObject.descending ],
				normalizedArguments: [ [ sortObject ] ]
			} ],
			expectedQueryLog2: any[] = [ {
				type: 'sort',
				arguments: [ sortObject ],
				normalizedArguments: [ [ sortObject ] ]
			} ],
			expectedQueryLog3: any[] = expectedQueryLog2.concat({
				type: 'sort',
				arguments: [ sortObjectArray ],
				normalizedArguments: [ [ sortObject, lang.mixin({ descending: false }, sortObjectArray[1]) ] ]
			}),
			expectedQueryLog4 = expectedQueryLog3.concat({
				type: 'sort', arguments: [ comparator ], normalizedArguments: [ comparator ]
			}),
			sortedCollection: dstore.Collection<any>;

		sortedCollection = store.sort(sortObject.property, sortObject.descending);
		assert.deepEqual(sortedCollection.queryLog, expectedQueryLog1);

		sortedCollection = store.sort(sortObject);
		assert.deepEqual(sortedCollection.queryLog, expectedQueryLog2);

		sortedCollection = sortedCollection.sort(sortObjectArray);
		assert.deepEqual(sortedCollection.queryLog, expectedQueryLog3);

		sortedCollection = sortedCollection.sort(comparator);
		assert.deepEqual(sortedCollection.queryLog, expectedQueryLog4);
	},

	'restore'() {
		var store = new Store({
			Model: NonDeclareBasedModel
		});
		var restoredObject = (<any>store)._restore({ foo: 'original' });
		assert.strictEqual(restoredObject.foo, 'original');
		assert.strictEqual(restoredObject.restored, true);
		assert.isTrue(restoredObject instanceof NonDeclareBasedModel);
	},

	events() {
		var methodCalls: string[] = [],
			events: string[] = [];

		// rely on autoEventEmits
		var store = new  Store();
		function countMethodCall(method: string, object: any) {
			methodCalls.push(method);
			return object;
		}
		store.put = countMethodCall.bind(null, 'put');
		store.add = countMethodCall.bind(null, 'add');
		store.remove = countMethodCall.bind(null, 'remove');

		store.on('add', function (event: EventObject) {
			events.push(event.type);
		});
		// test comma delimited as well
		store.on('delete', function (event: EventObject) {
			events.push(event.type);
		});

		store.on('update', function (event: EventObject) {
			events.push(event.type);
		});

		store.put({});
		store.add({});
		store.remove(1);

		assert.deepEqual(methodCalls, ['put', 'add', 'remove']);
		assert.deepEqual.bind(this, events, ['update', 'add', 'delete']);
	},

	'events with beforeId'() {
		var store = new Store(),
			beforeIds: Array<string | number> = [];

		store.on('add', function (event) {
			beforeIds.push(event.beforeId);
		});
		store.on('update', function (event) {
			beforeIds.push(event.beforeId);
		});

		store.add({}, { beforeId: 123 });
		store.put({}, { beforeId: 321 });

		assert.deepEqual(beforeIds, [ 123, 321 ]);
	},

	'emit should catch errors thrown by listeners'() {
		var store = new Store(),
			testEmit = lang.lateBind(store, 'emit', 'test-event');

		assert.doesNotThrow(testEmit);

		store.on('test-event', function () {
			throw new Error('listener error');
		});
		assert.doesNotThrow(testEmit);
	},

	forEach() {
		var store = new Store();
		store.fetch = function () {
			return new Promise(function (resolve) {
				resolve([ 0, 1, 2 ]);
			});
		};
		var results: any[] = [];
		return store.forEach(function (item: any, i: number, instance: any[]) {
			assert.strictEqual(item, i);
			results.push(item);
			assert.strictEqual(instance, store);
		}).then(function (results) {
			assert.deepEqual(results, [ 0, 1, 2 ]);
		});
	},

	'extends declare-based Model constructors and adds a _store reference on the prototype'() {
		var store = new Store({ Model: Model });
		assert.notStrictEqual(store.Model, Model);
		assert.isTrue((<any>store.Model).extended);
	},

	'does not extend Model constructors not based on declare'() {
		var store = new Store({Model: NonDeclareBasedModel});
		assert.strictEqual(store.Model, NonDeclareBasedModel);
	}
});
