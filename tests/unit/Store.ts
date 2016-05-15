import { EventObject, Hash } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import * as dstore from 'src/interfaces';
import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Store from 'src/Store';

class NonDeclareBasedModel {
	constructor (args?: {}) {
		lang.mixin(this, args);
	}
	_restore(Constructor: { new (arg: any): { restored: boolean } }) {
		// use constructor based restoration
		const restored = new Constructor(this);
		restored.restored = true;
		return restored;
	}
	static createSubclass: any;
}

class ConcreteStore<T> extends Store<T> {
	add(object: T, directives?: dstore.PutDirectives): Promise<T> {
		return Promise.resolve(object);
	}

	get(id: string | number): Promise<T> | void {
		throw new Error('This Method is abstract');
	}

	fetch(args?: dstore.FetchArgs): dstore.FetchPromise<T> {
		throw new Error('This Method is abstract');
	}

	fetchRange(args: dstore.FetchRangeArgs): dstore.FetchPromise<T> {
		throw new Error('This Method is abstract');
	}

	put(object: T, directives?: dstore.PutDirectives): Promise<T> {
		return Promise.resolve(object);
	}

	remove(id: any): Promise<T | void> {
		return Promise.resolve(id);
	}
}

let store: ConcreteStore<any>;
registerSuite({
	name: 'dstore Store',

	beforeEach: function () {
		store = new ConcreteStore();
	},

	'getIdentity and _setIdentity': {
		'direct property access and assignment'() {
			const object: Hash<any> = { id: 'default', 'custom-id': 'custom' };

			assert.strictEqual(store.getIdentity(object), 'default');
			(<any> store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['id']);

			store.idProperty = 'custom-id';
			assert.strictEqual(store.getIdentity(object), 'custom');
			(<any> store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['custom-id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['custom-id']);
		},
		'getter and setter'() {
			const object: Hash<any> = {
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
			(<any> store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['_properties'].id, 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['_properties'].id);

			store.idProperty = 'custom-id';
			assert.strictEqual(store.getIdentity(object), 'custom');
			(<any> store)._setIdentity(object, 'assigned-id');
			assert.strictEqual(object['_properties']['custom-id'], 'assigned-id');
			assert.strictEqual(store.getIdentity(object), object['_properties']['custom-id']);
		}
	},

	'filter'() {
		const filter1 = { prop1: 'one' };
		const expectedQueryLog1: any[] = [ {
			type: 'filter', arguments: [ filter1 ], normalizedArguments: [ {
				type: 'eq',
				args: [ 'prop1', 'one' ]
			} ]
		} ];
		const filter2 = function filterFunc(){};
		const expectedQueryLog2: any[] = expectedQueryLog1.concat({
			type: 'filter', arguments: [ filter2 ], normalizedArguments: [ {
				type: 'function',
				args: [ filter2 ]
			} ]
		});
		let filteredCollection: dstore.Collection<any> = store.filter(filter1);
		// deepEqual just won't work on the data in these
		assert.equal(JSON.stringify(filteredCollection.queryLog), JSON.stringify(expectedQueryLog1));

		filteredCollection = filteredCollection.filter(filter2);
		assert.equal(JSON.stringify(filteredCollection.queryLog), JSON.stringify(expectedQueryLog2));
	},

	'sort'() {
		const sortObject = { property: 'prop1', descending: true };
		const sortObjectArray = [ sortObject, { property: 'prop2' } ];
		const comparator = function comparator(a: any, b: any) {
			return 0;
		};
		const expectedQueryLog1: any[] = [ {
			type: 'sort',
			arguments: [ sortObject.property, sortObject.descending ],
			normalizedArguments: [ [ sortObject ] ]
		} ];
		const expectedQueryLog2: any[] = [ {
			type: 'sort',
			arguments: [ sortObject ],
			normalizedArguments: [ [ sortObject ] ]
		} ];
		const expectedQueryLog3: any[] = expectedQueryLog2.concat({
			type: 'sort',
			arguments: [ sortObjectArray ],
			normalizedArguments: [ [ sortObject, lang.mixin({ descending: false }, sortObjectArray[1]) ] ]
		});
		const expectedQueryLog4 = expectedQueryLog3.concat({
			type: 'sort', arguments: [ comparator ], normalizedArguments: [ comparator ]
		});
		let sortedCollection: dstore.Collection<any>;

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
		const store = new ConcreteStore({
			Model: NonDeclareBasedModel
		});
		const restoredObject = (<any> store)._restore({ foo: 'original' });
		assert.strictEqual(restoredObject.foo, 'original');
		assert.strictEqual(restoredObject.restored, true);
		assert.isTrue(restoredObject instanceof NonDeclareBasedModel);
	},

	events() {
		const events: string[] = [];

		store = new ConcreteStore();
		// rely on autoEventEmits
		function pushEvent(event: EventObject) {
			events.push(event.type);
		}
		store.on('add', pushEvent);
		store.on('delete', pushEvent);
		store.on('update', pushEvent);

		return Promise.all([
			store.put({method: 'put'}),
			store.add({method: 'add'}),
			store.remove(1)
		]).then(function (results) {
			assert.strictEqual(results[0].method, 'put');
			assert.strictEqual(results[1].method, 'add');
			assert.strictEqual(results[2], 1);
			assert.deepEqual( events, ['update', 'add', 'delete']);
		});
	},

	'events with beforeId'() {
		const store = new ConcreteStore(),
			beforeIds: Array<string | number> = [];

		function pushBeforeId(event: dstore.ChangeEvent<any>) {
			beforeIds.push(event.beforeId);
		}
		store.on('add', pushBeforeId);

		store.on('update', pushBeforeId);

		return store.add({}, <any> { beforeId: 123 }).then(function () {
			return store.put({}, <any> { beforeId: 321 });
		}).then(function () {
			assert.deepEqual(beforeIds, [ 123, 321 ]);
		});
	},

	forEach() {
		const store = new ConcreteStore<any>();
		store.fetch = function (args?: dstore.FetchArgs) {
			return Promise.resolve([ 0, 1, 2 ]);
		};
		const results: any[] = [];
		return store.forEach(function (item: any, i: number, instance: any[]) {
			assert.strictEqual(item, i);
			results.push(item);
			assert.strictEqual(instance, store);
		}).then(function (results) {
			assert.deepEqual(results, [ 0, 1, 2 ]);
		});
	}
});
