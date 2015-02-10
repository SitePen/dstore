define([
	'intern!object',
	'intern/chai!assert',
	'require',
	'dojo/when',
	'dojo/_base/array',
	'dojo/_base/declare',
	'../RequestMemory',
	'../Trackable'
], function (registerSuite, assert, require, when, arrayUtil, declare, RequestMemory, Trackable) {

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
		}
	});
});

