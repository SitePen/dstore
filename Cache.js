define([
	'dojo/_base/declare',
	'./CollectionCache',
	'./ObjectCache'
], function (declare, CollectionCache, ObjectCache) {

	// module:
	//		dstore/Cache
	return declare([ObjectCache, CollectionCache]);
});