define([
	'dstore/Memory',
	'dstore/Trackable',
	'intern!object',
	'intern/chai!assert'
], function (Memory, Trackable, registerSuite, assert){

	var store;

	function createEventHandlers(collection, filtered) {
		var eventCounters = {
			add: 0,
			update: 0,
			delete: 0
		};
		collection.on('add,update,delete', function (event) {
			eventCounters[event.type]++;
		}, filtered);
		return eventCounters;
	}

	function assertEventCounters(eventCounters, expectedAdd, expectedUpdate, expectedDelete, failMessage) {
		failMessage = failMessage || '';
		assert.equal(eventCounters.add, expectedAdd, failMessage + ' - Unexpected add event count of ' + eventCounters.add + '. Expected ' + expectedAdd + '.');
		assert.equal(eventCounters.update, expectedUpdate, failMessage + ' - Unexpected update event count of ' + eventCounters.update + '. Expected ' + expectedUpdate + '.');
		assert.equal(eventCounters.delete, expectedDelete, failMessage + ' - Unexpected delete event count of ' + eventCounters.delete + '. Expected ' + expectedDelete + '.');
	}

	function createdFilteredEventSuite(name, Store) {
		return {
			name: name,

			beforeEach: function(){

				var testData = [
					{ id: 1, name: 'one', odd: true },
					{ id: 2, name: 'two', odd: false },
					{ id: 3, name: 'three', odd: true },
					{ id: 4, name: 'four', odd: false },
					{ id: 5, name: 'five', odd: true }
				];

				store = new Store({data: testData});
			},

			'add to main store': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				store.add({ id: 10, name: 'one', odd: true });

				assertEventCounters(storeCounters, 1, 0, 0, 'store');
				assertEventCounters(oddCounters, 1, 0, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');
			},

			'add to filtered collection': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				oddCollection.add({ id: 10, name: 'one', odd: true });

				assertEventCounters(storeCounters, 1, 0, 0, 'store');
				assertEventCounters(oddCounters, 1, 0, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');
			},

			'remove from store': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				store.remove(3);

				assertEventCounters(storeCounters, 0, 0, 1, 'store');
				assertEventCounters(oddCounters, 0, 0, 1, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');
			},

			'remove from filtered collection': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				oddCollection.remove(3);

				assertEventCounters(storeCounters, 0, 0, 1, 'store');
				assertEventCounters(oddCounters, 0, 0, 1, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');
			},

			'update from store': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				store.put({ id: 3, name: 'three updated', odd: true });

				assertEventCounters(storeCounters, 0, 1, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');

				store.put({ id: 3, name: 'three updated', odd: false });

				assertEventCounters(storeCounters, 0, 2, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 1, 0, 'even collection');
			},

			'update from filtered collection': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				oddCollection.put({ id: 3, name: 'three updated', odd: true });

				assertEventCounters(storeCounters, 0, 1, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');

				oddCollection.put({ id: 3, name: 'three updated', odd: false });

				assertEventCounters(storeCounters, 0, 2, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 1, 0, 'even collection');
			},

			'multiple filters': function () {
				var oddCollection = store.filter({odd: true}).filter({id: 3}).sort('name');
				var evenCollection = store.filter({odd: false}).filter({id: 3}).sort('name');

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection, true);
				var evenCounters = createEventHandlers(evenCollection, true);

				store.put({ id: 1, name: 'one updated', odd: true });

				assertEventCounters(storeCounters, 0, 1, 0, 'store');
				assertEventCounters(oddCounters, 0, 0, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');

				store.put({ id: 3, name: 'three updated', odd: true });

				assertEventCounters(storeCounters, 0, 2, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 0, 'even collection');
			},

			'sort': function () {
				var collectionOne = store.sort('id');

				var storeCounters = createEventHandlers(store);
				var oneCounters = createEventHandlers(collectionOne, true);

				collectionOne.add({ id: 10, name: 'ten', odd: true });

				assertEventCounters(storeCounters, 1, 0, 0, 'store');
				assertEventCounters(oneCounters, 1, 0, 0, 'collection one');
			}
		};
	}

	function createdNotFilteredEventSuite(name, Store) {
		return {
			name: name,

			beforeEach: function(){

				var testData = [
					{ id: 1, name: 'one', odd: true },
					{ id: 2, name: 'two', odd: false },
					{ id: 3, name: 'three', odd: true },
					{ id: 4, name: 'four', odd: false },
					{ id: 5, name: 'five', odd: true }
				];

				store = new Store({data: testData});
			},

			'add to main store': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				store.add({ id: 10, name: 'one', odd: true });

				assertEventCounters(storeCounters, 1, 0, 0, 'store');
				assertEventCounters(oddCounters, 1, 0, 0, 'odd collection');
				assertEventCounters(evenCounters, 1, 0, 0, 'even collection');
			},

			'add to filtered collection': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				oddCollection.add({ id: 10, name: 'one', odd: true });

				assertEventCounters(storeCounters, 1, 0, 0, 'store');
				assertEventCounters(oddCounters, 1, 0, 0, 'odd collection');
				assertEventCounters(evenCounters, 1, 0, 0, 'even collection');
			},

			'remove from store': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				store.remove(3);

				assertEventCounters(storeCounters, 0, 0, 1, 'store');
				assertEventCounters(oddCounters, 0, 0, 1, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 1, 'even collection');
			},

			'remove from filtered collection': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				oddCollection.remove(3);

				assertEventCounters(storeCounters, 0, 0, 1, 'store');
				assertEventCounters(oddCounters, 0, 0, 1, 'odd collection');
				assertEventCounters(evenCounters, 0, 0, 1, 'even collection');
			},

			'update from store': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				store.put({ id: 3, name: 'three updated', odd: true });

				assertEventCounters(storeCounters, 0, 1, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 1, 0, 'even collection');

				store.put({ id: 3, name: 'three updated', odd: false });

				assertEventCounters(storeCounters, 0, 2, 0, 'store');
				assertEventCounters(oddCounters, 0, 2, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 2, 0, 'even collection');
			},

			'update from filtered collection': function () {
				var oddCollection = store.filter({odd: true});
				var evenCollection = store.filter({odd: false});

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				oddCollection.put({ id: 3, name: 'three updated', odd: true });

				assertEventCounters(storeCounters, 0, 1, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 1, 0, 'even collection');

				oddCollection.put({ id: 3, name: 'three updated', odd: false });

				assertEventCounters(storeCounters, 0, 2, 0, 'store');
				assertEventCounters(oddCounters, 0, 2, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 2, 0, 'even collection');
			},

			'multiple filters': function () {
				var oddCollection = store.filter({odd: true}).filter({id: 3}).sort('name');
				var evenCollection = store.filter({odd: false}).filter({id: 3}).sort('name');

				var storeCounters = createEventHandlers(store);
				var oddCounters = createEventHandlers(oddCollection);
				var evenCounters = createEventHandlers(evenCollection);

				store.put({ id: 1, name: 'one updated', odd: true });

				assertEventCounters(storeCounters, 0, 1, 0, 'store');
				assertEventCounters(oddCounters, 0, 1, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 1, 0, 'even collection');

				store.put({ id: 3, name: 'three updated', odd: true });

				assertEventCounters(storeCounters, 0, 2, 0, 'store');
				assertEventCounters(oddCounters, 0, 2, 0, 'odd collection');
				assertEventCounters(evenCounters, 0, 2, 0, 'even collection');
			},

			'sort': function () {
				var collectionOne = store.sort('id');

				var storeCounters = createEventHandlers(store);
				var oneCounters = createEventHandlers(collectionOne);

				collectionOne.add({ id: 10, name: 'ten', odd: true });

				assertEventCounters(storeCounters, 1, 0, 0, 'store');
				assertEventCounters(oneCounters, 1, 0, 0, 'collection one');
			}
		};
	}

	registerSuite(createdFilteredEventSuite('dstore multiple collection notifications', Memory));

	registerSuite(createdFilteredEventSuite('dstore multiple tracked collection notifications', Memory.createSubclass(Trackable)));

	registerSuite(createdNotFilteredEventSuite('dstore multiple collection notifications not filtered', Memory));

	registerSuite(createdNotFilteredEventSuite('dstore multiple tracked collection notifications not filtered', Memory.createSubclass(Trackable)));
});