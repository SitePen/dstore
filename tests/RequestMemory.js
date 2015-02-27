define([
	'intern!object',
	'intern/chai!assert',
	'require',
	'dojo/request',
	'dojo/when',
	'dojo/_base/array',
	'dojo/_base/declare',
	'../RequestMemory',
	'../Trackable'
], function (registerSuite, assert, require, request, when, arrayUtil, declare, RequestMemory, Trackable) {

	var store;
	function mapResultIds(results) {
		return arrayUtil.map(results, function (item) {
			return item.id;
		});
	}
	registerSuite({
		name: 'RequestMemory',

		beforeEach: function () {
			store = new (declare([RequestMemory, Trackable]))({
				target: require.toUrl('dstore/tests/data/treeTestRoot')
			});
		},

		'.get': function () {
			return when(store.get('node2'), function (item) {
				assert.strictEqual(
					JSON.stringify(item),
					JSON.stringify({ 'id': 'node2', 'name':'node2', 'someProperty':'somePropertyB' })
				);
			});
		},

		'.put': function () {
			var updatedItem;
			var updateEventFired;
			store.on('update', function () {
				updateEventFired = true;
			});
			return when(store.get('node5')).then(function (item) {
				item.changed = true;
				updatedItem = item;

				return store.put(updatedItem);
			}).then(function () {
				return store.get('node5');
			}).then(function (item) {
				assert.strictEqual(JSON.stringify(item), JSON.stringify(updatedItem));
				assert.isTrue(updateEventFired);
			});
		},

		'.add': function () {
			var newItem = { 'id': 'node6', 'name':'node5', 'someProperty':'somePropertyB' };
			var addEventFired;
			store.on('add', function () {
				addEventFired = true;
			});
			return when(store.add(newItem), function () {
				return when(store.get('node6'), function (item) {
					assert.strictEqual(JSON.stringify(item), JSON.stringify(newItem));
					assert.isTrue(addEventFired);
				});
			});
		},

		'.remove': function () {
			return when(store.get('node3')).then(function (item) {
				assert.ok(item);
				return store.remove('node3');
			}).then(function () {
				return store.get('node3');
			}).then(function (item) {
				assert.strictEqual(arguments.length, 1);
				assert.isUndefined(item);
			});
		},

		'filter': function () {
			var results = store.filter({ someProperty: 'somePropertyB' }).fetch().then(mapResultIds);
			return when(results, function (data) {
				assert.deepEqual(data.slice(), [ 'node2', 'node5' ]);
			});
		},

		'.sort': function () {
			var results = store.sort([
					{ property: 'someProperty', descending: true },
					{ property: 'name', descending: false }
				]).fetch().then(mapResultIds);
			return when(results, function (data) {
				assert.deepEqual(data.slice(), [ 'node3', 'node2', 'node5', 'node1', 'node4' ]);
			});
		},

		'.fetchRange': function () {
			var results = store.fetchRange({start: 1, end: 4}).then(mapResultIds);
			return when(results, function (data) {
				assert.deepEqual(data.slice(), [ 'node2', 'node3', 'node4' ]);
			});
		},

		'combined queries': function () {
			var results = store
				.filter(function (item) {
					return item.someProperty !== 'somePropertyB';
				})
				.sort('name', true)
				.fetchRange({start: 1, end: 3}).then(mapResultIds);
			return when(results, function (data) {
				assert.deepEqual(data.slice(), [ 'node3', 'node1' ]);
			});
		},

		'.refresh': (function () {
			var itemsUrl = require.toUrl('./data/items.json');
			var items;

			return {
				setup: function () {
					// Request the same data directly as used in the tests for comparisons
					return request.get(itemsUrl, { handleAs: 'json' }).then(function (data) {
						items = data;
					});
				},

				'subsequent get calls immediately reflect new data': function () {
					store.refresh(itemsUrl);
					return store.get(1).then(function (item) {
						assert.isDefined(item, 'Item should exist in new data');
						assert.deepEqual(item, items[0], 'Item should have expected new data');
					});
				},

				'subsequent fetchRange calls immediately reflect new data': function () {
					store.refresh(itemsUrl);
					return store.fetchRange({ start: 0, end: 2 }).then(function (results) {
						// Call results.slice for an Array (not QueryResults) to compare
						assert.deepEqual(results.slice(), items.slice(0, 2),
							'fetchRange should return the expected items from the new data');
					});
				},

				'refresh returns fetch promise': function () {
					return store.refresh(itemsUrl).then(function (results) {
						// Call results.slice for an Array (not QueryResults) to compare
						assert.deepEqual(results.slice(), items,
							'refresh should return promise from .fetch()');
					});
				}
			};
		}())
	});
});
