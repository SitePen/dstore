import { Handle, Hash } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise'
import request, { providerRegistry } from 'dojo-core/request';
import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import { runCollectionTest, TestItem, Model } from './Request';
import * as mockRequestProvider from './mockRequestProvider';
import * as dstore from 'src/interfaces';
import Rest from 'src/Rest';

const globalHeaders: Hash<string> = {
	'test-global-header-a': 'true',
	'test-global-header-b': 'yes'
};
const requestHeaders: Hash<string> = {
	'test-local-header-a': 'true',
	'test-local-header-b': 'yes',
	'test-override': 'overridden'
};

let store: Rest<any>;
function runHeaderTest(method: string, args: any[]) {
	return store[method].apply(store, args).then(function () {
		mockRequestProvider.assertRequestHeaders(requestHeaders);
		mockRequestProvider.assertRequestHeaders(globalHeaders);
	});
}
let treeTestRootData: string;
const registryHandle = providerRegistry.register(/.*mockRequest.*/, mockRequestProvider.respond);
registerSuite({
	name: 'dstore Rest',

	after: function () {
		registryHandle.destroy();
	},

	beforeEach: () => {
		mockRequestProvider.setResponseText('{}');
		mockRequestProvider.setResponseHeaders({});
		store = new Rest({
			target: '/mockRequest/',
			headers: globalHeaders,
			Model: Model
		});
		store.Model.prototype.describe = function () {
			return 'name is ' + this.name;
		};
	},

	before: function () {
		return request.get((<any> require).toUrl('tests/unit/data/treeTestRoot')).then(function (response: any) {
			treeTestRootData = response.data;
		});
	},

	'get': function () {
		return request.get((<any> require).toUrl('tests/unit/data/node1.1')).then(function (response: any) {
			mockRequestProvider.setResponseText(response.data);
		}).then(function() {
			return store.get('data/node1.1').then(function (object) {
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
			});
		});

	},

	'headers get 1': function () {
		return runHeaderTest('get', [ 'mockRequest/1', requestHeaders ]);
	},

	'headers get 2': function () {
		return runHeaderTest('get', [ 'mockRequest/2', { headers: requestHeaders } ]);
	},
	'headers remove': function () {
		return runHeaderTest('remove', [ 'mockRequest/3', { headers: requestHeaders } ]);
	},

	'headers put': function () {
		return runHeaderTest('put', [
			{},
			{
				id: 'mockRequest/4',
				headers: requestHeaders
			}
		]);
	},

	'headers add': function () {
		return runHeaderTest('add', [
			{},
			{
				id: 'mockRequest/5',
				headers: requestHeaders
			}
		]);
	},

	'put object without ID': function () {
		const objectWithoutId = { name: 'one' };
		mockRequestProvider.setResponseText(store.stringify(objectWithoutId));
		return store.put(objectWithoutId).then(function () {
			mockRequestProvider.assertHttpMethod('POST');
		});
	},

	'put object with ID': function () {
		const objectWithId = { id: 1, name: 'one' };
		mockRequestProvider.setResponseText(store.stringify(objectWithId));
		return store.put(objectWithId).then(function () {
			mockRequestProvider.assertHttpMethod('PUT');
		});
	},

	'put object with store.defaultNewToStart': function () {
		function testPutPosition(object: any, options: dstore.PutDirectives, expectedHeaders: Hash<any>) {
			store.defaultNewToStart = undefined;
			return store.put(object, options).then(function () {
				mockRequestProvider.assertRequestHeaders(expectedHeaders['defaultUndefined']);
			}).then(function () {
				store.defaultNewToStart = false;
				return store.put(object, options);
			}).then(function () {
				mockRequestProvider.assertRequestHeaders(expectedHeaders['defaultEnd']);
				store.defaultNewToStart = true;
				return store.put(object, options);
			}).then(function () {
				mockRequestProvider.assertRequestHeaders(expectedHeaders['defaultStart']);
			});
		}

		const objectWithId = { id: 1, name: 'one' },
			objectWithoutId = { name: 'missing identity' },
			optionsWithoutOverwrite = {},
			optionsWithOverwriteTrue = { overwrite: true },
			optionsWithOverwriteFalse = { overwrite: false },
			noExpectedPositionHeaders: Hash<Hash<{}>> = {
				defaultUndefined: { 'Put-Default-Position': null },
				defaultEnd: { 'Put-Default-Position': null },
				defaultStart: { 'Put-Default-Position': null }
			},
			expectedPositionHeaders = {
				defaultUndefined: { 'Put-Default-Position': 'end' },
				defaultEnd: { 'Put-Default-Position': 'end' },
				defaultStart: { 'Put-Default-Position': 'start' }
			};

		const tests = [
			[ objectWithId, optionsWithoutOverwrite, noExpectedPositionHeaders ],
			[ objectWithId, optionsWithOverwriteTrue, noExpectedPositionHeaders ],
			[ objectWithId, optionsWithOverwriteFalse, expectedPositionHeaders ],
			[ objectWithoutId, optionsWithoutOverwrite, expectedPositionHeaders ],
			[ objectWithoutId, optionsWithOverwriteTrue, expectedPositionHeaders ],
			[ objectWithoutId, optionsWithOverwriteFalse, expectedPositionHeaders ]
		];

		return tests.reduce(function(current, nextTest) {
			return current.then(function() {
					return testPutPosition.apply(null, nextTest);
			});
		}, Promise.resolve());
	},

	'put object with options.beforeId': function () {
		store.defaultNewToStart = true;
		return store.put({ id: 1, name: 'one' }, { beforeId: 123 }).then(function () {
			mockRequestProvider.assertRequestHeaders({
				'Put-Before': 123,
				'Put-Default-Position': null
			});
		}).then(function () {
			return store.put({ id: 2, name: 'two' }, { beforeId: null });
		}).then(function () {
			mockRequestProvider.assertRequestHeaders({
				'Put-Before': null,
				'Put-Default-Position': 'end'
			});
		});
	},

	'get and save': function () {
		store.Model = null;
		const expectedObject = { id: 1, name: 'one' };
		mockRequestProvider.setResponseText(store.stringify(expectedObject));
		return store.get('anything').then(function (object) {
			mockRequestProvider.setResponseText(store.stringify(expectedObject));
			return store.put(object).then(function (result: any) {
				assert.deepEqual(store.stringify(result), store.stringify(expectedObject));
			});
		});
	},

	'filter': function () {
		mockRequestProvider.setResponseText(treeTestRootData);

		return store.filter<TestItem>('data/treeTestRoot').fetch().then(function (results) {
			const object = results[0];
			assert.strictEqual(object.name, 'node1');
			assert.strictEqual(object.describe(), 'name is node1');
			assert.strictEqual(object.someProperty, 'somePropertyA');
		});
	},

	'filter iterative': function () {
		mockRequestProvider.setResponseText(treeTestRootData);

		let i = 0;
		return store.filter<TestItem>('data/treeTestRoot').forEach(function (object) {
			i++;
			assert.strictEqual(object.name, 'node' + i);
			// the method we added
			assert.equal(typeof object.describe, 'function');
		});
	},

	'filter object': function () {
		const filter: Hash<string> = { prop1: 'Prop1Value', prop2: 'Prop2Value' };
		return runCollectionTest(store.filter(filter), { query: filter });
	},

	'filter builder': function () {
		const filter = new store.Filter();
		const betweenTwoAndFour = filter.gt('id', 2).lt('price', 5);
		return runCollectionTest(store.filter(betweenTwoAndFour), {
			query: {
				id: 'gt=2',
				price: 'lt=5'
			}
		});
	},

	'filter builder ne or': function () {
		const filter = new store.Filter();
		const betweenTwoAndFour = filter.ne('id', 2).or(filter.eq('foo', true), filter.eq('foo'));
		return runCollectionTest(store.filter(betweenTwoAndFour), {
			query: {
				id: 'ne=2|foo=true|foo=undefined'
			}
		});
	},

	'filter relational': function () {
		const filter = new store.Filter();
		const innerFilter = new store.Filter().eq('foo', true);
		const nestedFilter = filter['in']('id', store.filter(innerFilter).select('id'));
		return runCollectionTest(store.filter(nestedFilter), {
			query: {
				id: 'in=(/mockRequest/?foo=true&select(id))'
			}
		});
	},

	'sort': function () {
		const sortedCollection = store.sort({
			property: 'prop1',
			descending: true
		}, {
			property: 'prop2'
		}, {
			property: 'prop3',
			descending: true
		});
		return runCollectionTest(sortedCollection, {
			query: {
				'sort(-prop1,+prop2,-prop3)': ''
			}
		});
	},

	'sort with this.sortParam': function () {
		store.sortParam = 'sort-param';

		const sortedCollection = store.sort({
			property: 'prop1',
			descending: true
		}, {
			property: 'prop2'
		}, {
			property: 'prop3',
			descending: true
		});
		return runCollectionTest(sortedCollection, {
			query: {
				'sort-param': '-prop1,+prop2,-prop3'
			}
		});
	},

	'sort with different prefixes': function () {
		store.descendingPrefix = '--';
		store.ascendingPrefix = '++';

		const sortedCollection = store.sort({
			property: 'prop1',
			descending: true
		}, {
			property: 'prop2'
		}, {
			property: 'prop3',
			descending: true
		});
		return runCollectionTest(sortedCollection, {
			query: {
				'sort(--prop1,++prop2,--prop3)': ''
			}
		});
	},
	'select': function () {
		const selectCollection = store.select([ 'prop1', 'prop2' ]);
		return runCollectionTest(selectCollection, {
			query: {
				'select(prop1,prop2)': ''
			}
		});
	},
	'select with selectParam': function () {
		store.selectParam = 'select-param';
		const selectCollection = store.select([ 'prop1', 'prop2' ]);
		return runCollectionTest(selectCollection, {
			query: {
				'select-param': 'prop1,prop2'
			}
		});
	},
	'range': function () {
		return runCollectionTest(store, {
			query: {
				'limit(10,15)': ''
			}
		}, { start: 15, end: 25 });
	},
	'range with rangeParam': function () {
		store.rangeStartParam = 'start';
		store.rangeCountParam = 'count';
		return runCollectionTest(store, {
			query: {
				'start': '15',
				'count': '10'
			}
		}, { start: 15, end: 25 });
	},
	'range with headers': function () {
		store.useRangeHeaders = true;
		return runCollectionTest(store, {
			headers: {
				'Range': 'items=15-24'
			}
		}, { start: 15, end: 25 });
	},

	'range with headers without end': function () {
		store.useRangeHeaders = true;
		return runCollectionTest(store, {
			headers: {
				'Range': 'items=15-Infinity'
			}
		}, { start: 15, end: Infinity });
	},

	'filter+sort+fetchRange': function () {
		const filter = { prop1: 'Prop1Value', prop2: 'Prop2Value' };
		const collection = store.filter(filter).sort('prop1');
		return runCollectionTest(collection, {
			query: <Hash<string>> lang.mixin({}, filter, {
				'limit(10,15)': '',
				'sort(+prop1)': ''
			})
		}, { start: 15, end: 25 });
	},

	// TODO - convert SimpleQuery and uncomment
	'composition with client-side queriers': function () {
		// var RestWithQueryEngine = declare([ Store, SimpleQuery ], {
		//   target: '/mockRequest/'
		// });
		//
		// var store = new RestWithQueryEngine(),
		// expectedResults = [
		//      { id: 1, name: 'one', odd: true },
		//      { id: 2, name: 'two', odd: false },
		//      { id: 3, name: 'three', odd: true }
		// ];
		// mockRequest.setResponseText(JSON.stringify(expectedResults));
		// var filter = { odd: true },
		// filteredCollection = store.filter(filter),
		// sortedCollection,
		// getTopQueryLogEntry = function (collection) {
		//      var queryLog = collection.queryLog;
		//      return queryLog[queryLog.length - 1];
		// },
		// querier;
		//
		// assert.strictEqual(filteredCollection.queryLog.length, 1);
		// return when(filteredCollection.fetch()).then(function (results) {
		// mockRequest.assertQuery(filter);
		// assert.strictEqual(results.length, expectedResults.length);
		//
		// var queryLogEntry = getTopQueryLogEntry(filteredCollection);
		// assert.property(queryLogEntry, 'querier');
		// querier = queryLogEntry.querier;
		//
		// var filteredResults = querier(expectedResults);
		// assert.equal(filteredResults.length, 2);
		// assert.deepEqual(filteredResults[0], expectedResults[0]);
		// assert.deepEqual(filteredResults[1], expectedResults[2]);
		//
		// sortedCollection = filteredCollection.sort('id', true);
		// assert.strictEqual(sortedCollection.queryLog.length, 2);
		//
		// return sortedCollection.fetch();
		// }).then(function (results) {
		// mockRequest.assertQuery({ 'sort(-id)': '' });
		// assert.strictEqual(results.length, expectedResults.length);
		//
		// var queryLogEntry = getTopQueryLogEntry(sortedCollection);
		// assert.property(queryLogEntry, 'querier');
		// querier = (function () {
		//      var existingQueryer = querier,
		//      newQueryer = queryLogEntry.querier;
		//      return function (data) {
		//        return newQueryer(existingQueryer(data));
		//      };
		// })();
		//
		// var sortedFilteredResults = querier(expectedResults);
		// assert.equal(sortedFilteredResults.length, 2);
		// assert.deepEqual(sortedFilteredResults[0], expectedResults[2]);
		// assert.deepEqual(sortedFilteredResults[1], expectedResults[0]);
		//
		// return sortedCollection.fetchRange({start: 0, end: 25});
		// }).then(function (results) {
		// mockRequest.assertQuery({
		//      'sort(-id)': '',
		//      'limit(25)': ''
		// });
		// assert.strictEqual(results.length, expectedResults.length);
		// });
	}
});

